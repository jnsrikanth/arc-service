import fs from "fs"
import { StatusCodes } from "http-status-codes"
import moment from "moment"
import { Op, Sequelize } from "sequelize"
import { format } from "util"
import { ACTIVITIES, ACTIVITY_ESCALATIONS, HOST, InfrastructureProvider, MEETING_COMMENTS, USER, USERS, USER_TYPE, VIDEO_PROCESSED_STATUS } from "../constants"

import { VideoDs } from "../datasources/VideoDs"
import { CommonError } from "../errors/CommonError"
import { getMeetingVideoKeys, getSignedGetUrl, uploadFileToStorage } from "../helpers/storage-helper"
import { Activity } from "../sec_db/models/Activity"
import { ActivityEscalation } from "../sec_db/models/ActivityEscalation"
import { Meeting } from "../sec_db/models/Meeting"
import { MeetingComment } from "../sec_db/models/MeetingComment"
import { User } from "../sec_db/models/User"
import { UserLog } from "../sec_db/models/UserLog"
import { SocketListners } from "../socket_listener/socket_listener"

export const postMeeting = async (req: any, res: any, next: Function) => {
  try {
    const { id: userId, userLogId, organization: { id: organizationId } } = req.context.authorization
    const { meetingType, meetingSource } : Meeting = req.body
    const videoDuration = await VideoDs.getVideoDuration(req.file.path)
    const meeting = await Meeting.build({
      name: `${userId}-${moment().format('YYYY-MM-DD HH:mm:ss')}`,
      hostId: userId,
      organizationId,
      meetingType,
      meetingSource,
      videoProcessedStatus: VIDEO_PROCESSED_STATUS.INITIAL,
      videoStartTime: new Date(),
      videoDuration,
    }).save()
    const { id: meetingId } = meeting
    const {
      rawVideo,
      processedVideo
    } = getMeetingVideoKeys(organizationId, meetingId)
    await uploadFileToStorage(req.file.path, rawVideo)
    await UserLog.update({
      activityCount: Sequelize.literal(`activityCount + 1`)
    }, {
      where: {
        id: userLogId
      }
    })
    const socketClient: SocketListners = req.socketClient
    ;(async () => {
      try {
        // await processMeetingVideo(meeting.id)
        socketClient.emitSuccessToClient('', userId)
      } catch (ex) {
        console.error(ex)
      }
    })()
    res.status(200).json({
      data: meetingId,
      status: {
        code: 0,
        error: ''
      }
    })
  } catch (ex) {
    next(ex)
  } finally {
    fs.unlink(req.file.path, () => {})
  }
}

export const getMeetings = async (req: any, res: any, next: Function) => {
    try {
        const whereFilters = []
        const hostWhereFilters = []
        switch (req.context.authorization.userType) {
            case USER_TYPE.SUPER_ADMIN:
                hostWhereFilters.push({
                    [Op.or]: [{
                        organizationId: req.context.authorization.organization.id,
                    }, {
                        userType: {
                            [Op.notIn]: [USER_TYPE.TRADER]
                        }
                    }],
                })
                break
            case USER_TYPE.COMPLIANCE_MANAGER:
                whereFilters.push({
                    organizationId: req.context.authorization.organization.id
                })
                hostWhereFilters.push({
                    userType: {
                        [Op.notIn]: [USER_TYPE.SUPER_ADMIN]
                    }
                })
                break
            default:
                whereFilters.push({
                    organizationId: req.context.authorization.organization.id
                })
                hostWhereFilters.push({
                    userType: {
                        [Op.notIn]: [USER_TYPE.COMPLIANCE_MANAGER, USER_TYPE.SUPER_ADMIN]
                    }
                })
                break
        }
        if(req.query.startTime && req.query.endTime) {
            whereFilters.push({
                videoStartTime: {
                    [Op.between]: [req.query.startTime, req.query.endTime]
                }
            })
        }
        const meetings = await Meeting.findAll({
            where: {
                [Op.and]: whereFilters
            },
            include: [
                {
                    model: User,
                    as: HOST,
                    required: true,
                    where: {
                        ...(req.query.search ? {
                            name: {
                                [Op.like]: `%${req.query.search}%`
                            }
                        } : null),
                        [Op.and]: hostWhereFilters
                    }
                },
                {
                    model: User,
                    as: USERS
                },
                {
                    model: Activity,
                    as: ACTIVITIES,
                    required: true,
                }
            ],
            order: [['videoStartTime', 'DESC']]
        })
        res.status(200).json({
            status: {
                code: 0,
                error: ''
            },
            data: meetings
        })
    } catch (ex) {
        next(ex)
    }
}

export const getMeeting = async (req: any, res: any, next: Function) => {
  try {
    const meetingId = req.params.meetingId
    const meeting = await Meeting.findOne({
      where: {
          id: meetingId
      },
      include: [
        {
          model: User,
          as: USERS
        },
        {
          model: User,
          as: HOST
        },
        {
          model: Activity,
          as: ACTIVITIES,
          include: [{
            model: ActivityEscalation,
            as: ACTIVITY_ESCALATIONS,
            order: [['createdAt', 'DESC']]
          }]
        },
        {
          model: MeetingComment,
          as: MEETING_COMMENTS,
          include: [
            {
              model: User,
              attributes: ['id', 'name'],
              as: USER
            }
          ]
        }
      ]
    })
    let videoUrl
    if(meeting?.videoUrlData) {
      const videoUrlData = JSON.parse(meeting.videoUrlData)
      if(moment(videoUrlData.expiryDate).diff(moment()) > 0) {
        ;({ url: videoUrl } = videoUrlData)
      }
    }
    if(meeting && !videoUrl) {
      const videoUrlData = await getSignedGetUrl(getMeetingVideoKeys(meeting.organizationId, meeting.id).processedVideo)
      ;({ url: videoUrl } = videoUrlData)
      meeting.videoUrlData = JSON.stringify(videoUrlData)
      await meeting.save()
    }
    meeting?.setDataValue('videoUrl', videoUrl)
    res.status(200).json({
        status: {
            code: 0,
            error: ''
        },
        data: meeting
    })
  } catch (ex) {
    next(ex)
  }
}

export const postMeetingComment = async (req: any, res: any, next: Function) => {
  try {
    switch (req.context.authorization.userType) {
      case USER_TYPE.SUPER_ADMIN:
          break
      case USER_TYPE.COMPLIANCE_MANAGER:
      case USER_TYPE.COMPLIANCE_ANALYST:
        if(req.context.authorization.organization.id === req.context.meeting.organizationId) {
          console.log('readhed')
          break
        }
      default:
        throw new CommonError(format('Access denied on meeting with id: %d for userType: %s ', req.context.meeting.id, req.context.authorization.userType), StatusCodes.FORBIDDEN)
    }
    const { comment } = req.body
    const meetingComment = await MeetingComment.build({
      comment,
      meetingId: req.context.meeting.id,
      organizationId: req.context.meeting.organizationId,
      userId: req.context.authorization.id
    }).save()
    res.status(200).json({
      status: {
        code: 0,
        error: ''
      },
      data: meetingComment.id
    })
  } catch (ex) {
    next(ex)
  }
}
