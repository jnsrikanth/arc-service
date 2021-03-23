import fs from "fs"
import stream from 'stream'
import moment from "moment"
import { Op, Sequelize } from 'sequelize'
import { format } from "util"
import { StatusCodes } from 'http-status-codes'
import { CONFIG } from "../config/config"
import { MLDatasource } from "../datasources/MLDatasource"
import { CommonError } from "../errors/CommonError"
import { UserType } from "../helpers/users-log-helper"
import { Meeting } from "../sec_db/models/Meeting"
import { MeetingUser } from "../sec_db/models/MeetingUser"
import { User } from "../sec_db/models/User"
import { Organization } from "../sec_db/models/Organization"
import { ARC_DATE_FORMAT, ARC_DATE_TIME_FORMAT, AVAILABLE_DEMO_IDS, HOST, InfrastructureProvider, MEETINGS, MeetingSourceType, MEETING_TYPE, ORGANIZATION_STATUS, USER_STATUS, USER_TYPE, VIDEO_PROCESSED_STATUS } from "../constants"
import { ActivityEscalation } from "../sec_db/models/ActivityEscalation"
import { Activity } from "../sec_db/models/Activity"
import { deleteMeetingData, deleteOrganizationData } from "../helpers/data-clean-helper"
import { copyObjectInStorage, getMeetingVideoKeys } from "../helpers/storage-helper"
import { padDoubleQuotes } from "../utils/common-utils"


const handleOrganizationsDownload = async (res: any, organizationsData: any) => {
  const tableColumnList = [
    {
      id: 'name',
      name: 'Organization',
      cellValue: (row: any) => {
        return row.name
      }
    },
    {
      id: 'email',
      name: 'POC Email ID',
      cellValue: (row: any) => {
        return row.email
      }
    },
    {
      id: 'createdAt',
      name: 'Created On',
      cellValue: (row: any) => {
        return row.createdAt ? moment(row.createdAt).format(ARC_DATE_TIME_FORMAT) : '--'
      }
    },
    {
      id: 'expiryDate',
      name: 'Active Until',
      cellValue: (row: any) => {
        return row.expiryDate ? moment(row.expiryDate).format(ARC_DATE_FORMAT) : '--'
      }
    },
  ]
  const tableColumnsNamesCSV = tableColumnList.map(
    column => column.name
  )
  const tableColumnsIds = tableColumnList.map(
    column => column.id
  )
  const readStream = new stream.PassThrough()
  readStream.write(tableColumnsNamesCSV.map(columnName => padDoubleQuotes(columnName)).join(',') + '\n') // write CSV header
  organizationsData.forEach((user: any) => {
    readStream.write(tableColumnList.map(columnItem => padDoubleQuotes(columnItem.cellValue(user.dataValues))).join(',') + '\n')
  })
  readStream.end(null)
  // csvGeneratePromise
  res.set(
    'Content-disposition',
    'attachment; filename=organizations-report.csv'
  )
  res.set('Content-Type', 'text/csv')
  readStream.pipe(res)
}

export const getOrganizations = async (req: any, res: any, next: Function) => {
    try {
        if(![USER_TYPE.SUPER_ADMIN].includes(req.context.authorization.userType)) {
            throw new CommonError('Access denied', StatusCodes.FORBIDDEN)
        }
        const sortByColumnMap: any = {
          name: 'name',
          email: 'email',
          expiryDate: 'expiryDate',
          createdAt: 'createdAt',
        }
        let { limit, offset, search, sort, order } = req.query
        const isDownload = Object.getOwnPropertyDescriptor(req.query, 'download')
        limit = +limit || 10
        offset = +offset || 0
        sort = sortByColumnMap[sort ? sort : 'createdAt']
        order = +order === 1 ? 'ASC' : 'DESC'
        const whereFilter = {
            ...(search ? {
                name: {
                    [Op.like]: `%${search}%`
                },
                email: {
                    [Op.like]: `%${search}%`
                }
            } : null)
        }
        const { rows, count } = await Organization.findAndCountAll({
            attributes: ['id', 'name', 'email', 'expiryDate', 'status', 'createdAt', 'clearIssues'],
            order: [[sort, order]],
            where: {
                ...whereFilter,
            },
            ...(isDownload ? null : {
              limit,
              offset
            })
        })
        await Promise.all(rows.map(async organization => {
            const { id: organizationId } = organization
            const demoMeetings = await Meeting.findAll({
                where: {
                    organizationId,
                },
                include: [{
                    required: true,
                    model: User,
                    as: HOST,
                    where: {
                        userType: USER_TYPE.TRADER
                    }
                }]
            })
            const demoIdsMap = demoMeetings.reduce((_demoIdsMap, meeting) => {
                const demoId: string = AVAILABLE_DEMO_IDS.find(_demoId => meeting.name === _demoId) || ''
                if(demoId) {
                    Object.assign(_demoIdsMap, {
                        [`${demoId}`]: true
                    })
                }
                return _demoIdsMap
            }, {})
            organization.setDataValue('demoIds', Object.keys(demoIdsMap))
        }))
        if(isDownload) {
          return await handleOrganizationsDownload(res, rows)
        }
        res.status(200).json({
            data: rows,
            metaData: {
                count
            },
            status: {
                code: 0,
                error: ''
            }
        })
    } catch(ex) {
        next(ex)
    }
}
const gaborActivities = [
  {
      "activityDuration": 4,
      "activityType": "Note",
      "seekinTime": 13
  },
  {
      "activityDuration": 3,
      "activityType": "Pen",
      "seekinTime": 18
  },
  {
      "activityDuration": 9,
      "activityType": "Pen",
      "seekinTime": 27
  },
  {
      "activityDuration": 7,
      "activityType": "Mobile",
      "seekinTime": 24
  },
  {
      "activityDuration": 2,
      "activityType": "Unknown",
      "seekinTime": 28
  },
  {
      "activityDuration": 5,
      "activityType": "Note",
      "seekinTime": 34
  },
  {
      "activityDuration": 4,
      "activityType": "Thumbsup",
      "seekinTime": 40
  },
  {
      "activityDuration": 1,
      "activityType": "Pen",
      "seekinTime": 43
  },
  {
      "activityDuration": 0,
      "activityType": "Mobile",
      "seekinTime": 60
  },
  {
      "activityDuration": 2,
      "activityType": "Cash",
      "seekinTime": 52
  },
  {
      "activityDuration": 5,
      "activityType": "Unknown",
      "seekinTime": 59
  },
  {
      "activityDuration": 4,
      "activityType": "Pen",
      "seekinTime": 86
  },
  {
      "activityDuration": 13,
      "activityType": "Mobile",
      "seekinTime": 100
  },
  {
      "activityDuration": 2,
      "activityType": "Unknown",
      "seekinTime": 107
  },
  {
      "activityDuration": 2,
      "activityType": "Thumbsup",
      "seekinTime": 116
  },
  {
      "activityDuration": 5,
      "activityType": "Cash",
      "seekinTime": 119
  },
  {
      "activityDuration": 4,
      "activityType": "Unknown",
      "seekinTime": 126
  },
  {
      "activityDuration": 13,
      "activityType": "Mobile",
      "seekinTime": 133
  },
  {
      "activityDuration": 1,
      "activityType": "Thumbsup",
      "seekinTime": 133
  },
  {
      "activityDuration": 1,
      "activityType": "Unknown",
      "seekinTime": 154
  }
]
const example1Activities = [
  {
    "activityDuration": 7.75869337442219,
    "activityType": "Note",
    "seekinTime": 22.5252388289676
  },
  {
    "activityDuration": 3,
    "activityType": "Note",
    "seekinTime": 27
  },
  {
    "activityDuration": 5.38102927580894,
    "activityType": "Note",
    "seekinTime": 36.6660832049307
  },
  {
    "activityDuration": 4,
    "activityType": "Note",
    "seekinTime": 38
  },
  {
    "activityDuration": 2.25252388289676,
    "activityType": "Note",
    "seekinTime": 50.9320677966102
  },
  {
    "activityDuration": 2.12738366718028,
    "activityType": "Note",
    "seekinTime": 56.0628166409861
  },
  {
    "activityDuration": 7.01009553158706,
    "activityType": "Note",
    "seekinTime": 67.32543605547
  },
  {
    "activityDuration": 3,
    "activityType": "Note",
    "seekinTime": 72.6
  },
  {
    "activityDuration": 2.5,
    "activityType": "Note",
    "seekinTime": 74
  },
  {
    "activityDuration": 1,
    "activityType": "Thumbsup",
    "seekinTime": 75.4
  },
]
const example2Actvities = [
  {
    "activityDuration": 0.7517746479,
    "activityType": "Unknown",
    "seekinTime": 23
  },
  {
    "activityDuration": 3.132394366,
    "activityType": "Unknown",
    "seekinTime": 46
  },
  {
    "activityDuration": 2.631211268,
    "activityType": "Mobile",
    "seekinTime": 46.73532394
  },
]
const example3Actvities = [
  {
    "activityDuration": 2.126395137,
    "activityType": "Cash",
    "seekinTime": 12.00787842,
  },
  {
    "activityDuration": 0.5003282675,
    "activityType": "Thumbsup",
    "seekinTime": 18.01181763,
  },
  {
    "activityDuration": 1.000656535,
    "activityType": "Silence",
    "seekinTime": 32.02100912,
  },
  {
    "activityDuration": 1.626066869,
    "activityType": "Call",
    "seekinTime": 33.14674772,
  },
]
const example4Actvities = [
  {
    "activityDuration": 0.6241797752808990,
    "activityType": "Silence",
    "seekinTime": 6.865977528089890
  },
  {
    "activityDuration": 3.4954067415730300,
    "activityType": "Thumbsdown",
    "seekinTime": 8.239173033707860
  },
  {
    "activityDuration": 2.871226966292140,
    "activityType": "Note",
    "seekinTime": 23.593995505618000
  },
  {
    "activityDuration": 14.730642696629200,
    "activityType": "Mobile",
    "seekinTime": 31.08415280898880
  },
]
const example5Actvities = [
  {
    "activityDuration": 0.25,
    "activityType": "Thumbsup",
    "seekinTime": 17.25
  },
  {
    "activityDuration": 1.125,
    "activityType": "Call",
    "seekinTime": 17.75
  },
  {
    "activityDuration": 0.625,
    "activityType": "Silence",
    "seekinTime": 19.125
  },
  {
    "activityDuration": 26.125,
    "activityType": "Mobile",
    "seekinTime": 21.625
  },
]
const example6Actvities = [
  {
    "activityDuration": 1.08,
    "activityType": "Call",
    "seekinTime": 21.12
  },
  {
    "activityDuration": 3.28,
    "activityType": "Thumbsup",
    "seekinTime": 22.2
  },
  {
    "activityDuration": 0.56,
    "activityType": "Silence",
    "seekinTime": 23
  },
  {
    "activityDuration": 0.36,
    "activityType": "Mobile",
    "seekinTime": 23.96
  },
  {
    "activityDuration": 12.84,
    "activityType": "Mobile",
    "seekinTime": 29.4
  },
  {
    "activityDuration": 1.76,
    "activityType": "Thumbsup",
    "seekinTime": 65.84
  },
]

const seedDemoMeetings = async (organizationId: number, demoIds: string[] = []) => {
  const traderUsers = await User.findAll({
    where: {
      organizationId,
      userType: USER_TYPE.TRADER
    }
  })
  const gabor = traderUsers.find(u => u.email === 'gabor@tensorgo.com')
  const iwan = traderUsers.find(u => u.email === 'iwan@tensorgo.com')
  const wouter = traderUsers.find(u => u.email === 'wouter@tensorgo.com')
  const marinho = traderUsers.find(u => u.email === 'marinho@tensorgo.com')


  const dan = traderUsers.find(u => u.email === 'dan@tensorgo.com')
  const max = traderUsers.find(u => u.email === 'max@tensorgo.com')

  const john = traderUsers.find(u => u.email === 'john@tensorgo.com')
  const mark = traderUsers.find(u => u.email === 'mark@tensorgo.com')
  const demoMeetingsData = [{
    demoId: 'gabor',
    name: 'gabor',
    organizationId,
    hostId: gabor?.id,
    meetingType: MEETING_TYPE.GROUP,
    meetingSource: 'webcam',
    videoProcessedStatus: VIDEO_PROCESSED_STATUS.PROCESSED,
    videoStartTime: moment('2020-11-03T13:45:01').toDate(),
    videoDuration: 30,
    activities: gaborActivities,
    users: [gabor, iwan, wouter, marinho],
  }, {
    demoId: 'example1',
    name: 'example1',
    organizationId,
    hostId: dan?.id,
    meetingType: MEETING_TYPE.GROUP,
    meetingSource: MeetingSourceType.MicrosoftTeams,
    videoProcessedStatus: VIDEO_PROCESSED_STATUS.PROCESSED,
    videoStartTime: moment('2020-11-03T15:01:23').toDate(),
    videoDuration: 30,
    activities: example1Activities,
    users: [dan, max],
  }, {
    demoId: 'example2',
    name: 'example2',
    organizationId,
    hostId: max?.id,
    meetingType: MEETING_TYPE.INDIVIDUAL,
    meetingSource: MeetingSourceType.MicrosoftTeams,
    videoProcessedStatus: VIDEO_PROCESSED_STATUS.PROCESSED,
    videoStartTime: moment('2020-11-04T04:56:01').toDate(),
    videoDuration: 30,
    activities: example2Actvities,
    users: [max]
  }, {
    demoId: 'example3',
    name: 'example3',
    organizationId,
    hostId: max?.id,
    meetingType: MEETING_TYPE.GROUP,
    meetingSource: MeetingSourceType.MicrosoftTeams,
    videoProcessedStatus: VIDEO_PROCESSED_STATUS.PROCESSED,
    videoStartTime: moment('2020-11-05T12:45:07').toDate(),
    videoDuration: 30,
    activities: example3Actvities,
    users: [max, dan]
  }, {
    demoId: 'example4',
    name: 'example4',
    organizationId,
    hostId: max?.id,
    meetingType: MEETING_TYPE.GROUP,
    meetingSource: MeetingSourceType.MicrosoftTeams,
    videoProcessedStatus: VIDEO_PROCESSED_STATUS.PROCESSED,
    videoStartTime: moment('2020-11-05T18:00:00').toDate(),
    videoDuration: 30,
    activities: example4Actvities,
    users: [max, dan, mark]
  }, {
    demoId: 'example5',
    name: 'example5',
    organizationId,
    hostId: dan?.id,
    meetingType: MEETING_TYPE.GROUP,
    meetingSource: MeetingSourceType.MicrosoftTeams,
    videoProcessedStatus: VIDEO_PROCESSED_STATUS.PROCESSED,
    videoStartTime: moment('2020-11-06T03:45:18').toDate(),
    videoDuration: 30,
    activities: example5Actvities,
    users: [dan, max, mark, john]
  }, {
    demoId: 'example6',
    name: 'example6',
    organizationId,
    hostId: john?.id,
    meetingType: MEETING_TYPE.GROUP,
    meetingSource: MeetingSourceType.ZoomMeeting,
    videoProcessedStatus: VIDEO_PROCESSED_STATUS.PROCESSED,
    videoStartTime: moment('2020-11-07T20:20:18').toDate(),
    videoDuration: 30,
    activities: example6Actvities,
    users: [dan, max, mark, john]
  }].filter(demoMeetingData => demoIds.includes(demoMeetingData.demoId))
  for(const demoMeetingData of demoMeetingsData) {
    const meeting = await Meeting.build(demoMeetingData).save()
    meeting.setUsers(demoMeetingData.users)
    Activity.bulkCreate(demoMeetingData.activities.map((activity: any) => ({
      ...activity,
      meetingId: meeting.id,
      userId: meeting.hostId
    })))
    await copyObjectInStorage(`demo-videos/${demoMeetingData.demoId}-processed.mp4`, getMeetingVideoKeys(organizationId, meeting.id).processedVideo)
    // copy processed video to S3
  }
}

const seedDemoTraders = async (organizationId: number) => {
  const traderUsersData = [{
    name: 'Gabor Sommerhalder',
    email: 'gabor@tensorgo.com',
    location: 'location one',
    userCode: '12345',
    userType: USER_TYPE.TRADER,
    organizationId,
    status: USER_STATUS.ACTIVE,
    expiryDate: moment().add(1, 'year').toDate(),
  }, {
    name: 'Iwan de Mooij',
    email: 'iwan@tensorgo.com',
    location: 'location one',
    userCode: '12345',
    userType: USER_TYPE.TRADER,
    organizationId,
    status: USER_STATUS.ACTIVE,
    expiryDate: moment().add(1, 'year').toDate(),
  }, {
    name: 'Wouter Meenhorst',
    email: 'wouter@tensorgo.com',
    location: 'location one',
    userCode: '12345',
    userType: USER_TYPE.TRADER,
    organizationId,
    status: USER_STATUS.ACTIVE,
    expiryDate: moment().add(1, 'year').toDate(),
  }, {
    name: 'Marinho Panday',
    email: 'marinho@tensorgo.com',
    location: 'location one',
    userCode: '12345',
    userType: USER_TYPE.TRADER,
    organizationId,
    status: USER_STATUS.ACTIVE,
    expiryDate: moment().add(1, 'year').toDate(),
  },{
    name: 'John Hall',
    email: 'john@tensorgo.com',
    location: 'location two',
    userCode: '12345',
    userType: USER_TYPE.TRADER,
    organizationId,
    status: USER_STATUS.ACTIVE,
    expiryDate: moment().add(1, 'year').toDate()
  }, {
    name: 'Mark Whiteman',
    email: 'mark@tensorgo.com',
    location: 'location two',
    userCode: '12345',
    userType: USER_TYPE.TRADER,
    organizationId,
    status: USER_STATUS.ACTIVE,
    expiryDate: moment().add(1, 'year').toDate()
  }, {
    name: 'Dan Crow',
    email: 'dan@tensorgo.com',
    location: 'location two',
    userCode: '12345',
    userType: USER_TYPE.TRADER,
    organizationId,
    status: USER_STATUS.ACTIVE,
    expiryDate: moment().add(1, 'year').toDate()
  }, {
    name: 'Max Summerfield',
    email: 'max@tensorgo.com',
    location: 'location two',
    userCode: '12345',
    userType: USER_TYPE.TRADER,
    organizationId,
    status: USER_STATUS.ACTIVE,
    expiryDate: moment().add(1, 'year').toDate()
  }]
  for(const traderUserData of traderUsersData) {
    if(await User.findOne({
      where: {
        organizationId,
        email: traderUserData.email
      }
    })) {
      continue
    }
    await User.create(traderUserData)
  }
}

export const getOrganization = async (req: any, res: any, next: Function) => {
    try {
        if(![USER_TYPE.SUPER_ADMIN].includes(req.context.authorization.userType)) {
            throw new CommonError('Access denied', StatusCodes.FORBIDDEN)
        }
        const organizationId = +req.params.organizationId
        const organization = await Organization.findOne({
            where: {
                id: organizationId
            },
        })
        const demoMeetings = await Meeting.findAll({
            where: {
                organizationId,
            },
            include: [{
                required: true,
                model: User,
                as: HOST,
                where: {
                    userType: USER_TYPE.TRADER
                }
            }]
        })

    } catch (ex) {
        next(ex)
    }
}

export const postOrganization = async (req: any, res: any, next: Function) => {
  try {
    const { name, email, expiryDate, clearIssues, demoIds } = req.body
    if(![USER_TYPE.SUPER_ADMIN].includes(req.context.authorization.userType)) {
        throw new CommonError('Access denied', StatusCodes.FORBIDDEN)
    }
    const organization = await Organization.build({
      name,
      email,
      expiryDate,
      clearIssues,
      status: ORGANIZATION_STATUS.ACTIVE,
    }).save()
    await seedDemoTraders(organization.id)
    await seedDemoMeetings(organization.id, demoIds)
    res.status(200).json({
      data: {
        id: organization.id
      },
      status: {
        code: 0,
        error: ''
      }
    })
  } catch (ex) {
    next(ex)
  }
}

export const putOrganization = async (req: any, res: any, next: Function) => {
  try {
    const organizationId = +req.params.organizationId
    const { name, email, expiryDate, status, clearIssues, demoIds } = req.body
    if(![USER_TYPE.SUPER_ADMIN].includes(req.context.authorization.userType)) {
      throw new CommonError('Access denied', StatusCodes.FORBIDDEN)
    }
    await Organization.update({
      name,
      email,
      expiryDate,
      clearIssues,
      status,
    }, {
      where: {
        id: organizationId
      }
    })
    const existingDemoMeetings = await Meeting.findAll({
      where: {
        organizationId,
      },
      include: [{
        required: true,
        model: User,
        as: HOST,
        where: {
          userType: USER_TYPE.TRADER
        }
      }]
    })
    const deleteDemoMeetingIds = existingDemoMeetings.filter(meeting => !demoIds.some((demoId: any) => demoId === meeting.name)).map(meeting => meeting.id)
    if(deleteDemoMeetingIds.length) {
      await Promise.all(deleteDemoMeetingIds.map(meetingId => deleteMeetingData(meetingId)))
      await Meeting.destroy({
        where: {
          id: deleteDemoMeetingIds
        }
      })
    }
    await seedDemoTraders(organizationId)
    for(const demoId of demoIds) {
      if(!existingDemoMeetings.some(meeting => demoId === meeting.name)) {
        await seedDemoMeetings(organizationId, [demoId])
      }
    }
    res.status(200).json({
      status: {
        code: 0,
        error: ''
      }
    })
  } catch (ex) {
    console.log(ex)
    next(ex)
  }
}

export const deleteOrganization = async (req: any, res: any, next: Function) => {
    try {
        const organizationId = +req.params.organizationId
        if(![USER_TYPE.SUPER_ADMIN].includes(req.context.authorization.userType)) {
            throw new CommonError('Access denied', StatusCodes.FORBIDDEN)
        }
        await deleteOrganizationData(organizationId)
        Organization.destroy({
            where: {
                id: organizationId
            },
            force: true
        })
        res.status(200).json({
            status: {
                code: 0,
                error: ''
            }
        })
    } catch(ex) {
        console.log(ex)
        next(ex)
    }
}