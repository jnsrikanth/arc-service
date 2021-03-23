import { CronJob } from 'cron'
import moment from 'moment'
import { Op, Sequelize } from 'sequelize'
import { AVAILABLE_DEMO_IDS, ESCALATION_TYPE, VIDEO_PROCESSED_STATUS } from '../constants'
import { processMeetingVideo, processUserPickleFile } from '../helpers/cv-helper'
import { Activity } from '../sec_db/models/Activity'
import { ActivityEscalation } from '../sec_db/models/ActivityEscalation'
import { JwtInfo } from '../sec_db/models/JwtInfo'
import { Meeting } from '../sec_db/models/Meeting'
import { MeetingComment } from '../sec_db/models/MeetingComment'
import { Organization } from '../sec_db/models/Organization'
import { User } from '../sec_db/models/User'

const CRON_JOB_TIMING_EVERY_MINUTE = '* * * * *'
const CRON_JOB_TIMING_ONCE_IN_A_DAY = '0 0 * * *'
export const startPickleFilesCron = () => {
    let isCronRunning = false
    new CronJob(CRON_JOB_TIMING_EVERY_MINUTE, async () => {
        if(isCronRunning) return
        isCronRunning = true
        try {
          const cronStartedTime = moment()
          console.log('startPickleFilesCron START at %s', cronStartedTime.toISOString())
          let lastUserId = 0
          while(true) {
            const users = await User.findAll({
                attributes: ['id'],
                where: {
                    id: {
                        [Op.gt]: lastUserId
                    }
                },
                order: [['id', 'ASC']]
            })
            await Promise.all(users.map(async (user) => {
                try {
                    await processUserPickleFile(user.id)
                } catch (ex) {
                    console.error(ex)
                } finally {
                    lastUserId = user.id
                }
            }))
            break
          }
          const cronEndTime = moment()
          console.log(
            'startPickleFilesCron END at %s took %d seconds',
            cronEndTime.toISOString(),
            cronEndTime.diff(cronStartedTime, 'seconds').toString()
          )
        } catch (ex) {
          console.error('startPickleFilesCron FAIL', ex)
        } finally {
            isCronRunning = false
        }
    }).start()
}

export const startMeetingsCron = () => {
    let isCronRunning = false
    new CronJob(CRON_JOB_TIMING_EVERY_MINUTE, async () => {
        if(isCronRunning) return
        isCronRunning = true
        try {
          const cronStartedTime = moment()
          console.log('startMeetingsCron START at %s', cronStartedTime.toISOString())
          let lastMeetingId = 0
          while(true) {
            const meetings = await Meeting.findAll({
                attributes: ['id'],
                where: {
                    id: {
                        [Op.gt]: lastMeetingId
                    },
                    videoProcessedStatus: {
                        [Op.notIn]: [
                            VIDEO_PROCESSED_STATUS.PROCESSED
                        ]
                    }
                },
                order: [['id', 'ASC']]
            })
            await Promise.all(meetings.map(async meeting => {
                try {
                    await processMeetingVideo(meeting.id)
                } catch (ex) {
                    console.error(ex)
                } finally {
                    lastMeetingId = meeting.id
                }
            }))
            break
          }
          const cronEndTime = moment()
          console.log(
            'startMeetingsCron END at %s took %d seconds',
            cronEndTime.toISOString(),
            cronEndTime.diff(cronStartedTime, 'seconds').toString()
          )
        } catch (ex) {
          console.error('startMeetingsCron FAIL', ex)
        } finally {
            isCronRunning = false
        }
    }).start()
}

export const startClearOrganizationMeetingEscalations = () => {
  let isCronRunning = false
  new CronJob(CRON_JOB_TIMING_ONCE_IN_A_DAY, async () => {
    try {
      if(isCronRunning) return
      isCronRunning = true
      const cronStartedTime = moment()
      console.log('startClearOrganizationMeetingEscalations START at %s', cronStartedTime.toISOString())
      const meetingIdSubQuery = Sequelize.literal(`(SELECT id FROM Meetings WHERE name IN (${[...AVAILABLE_DEMO_IDS].map(demoId => `"${demoId}"`).join(', ')}) AND organizationId IN (SELECT id FROM Organizations WHERE clearIssues=1))`)
      await ActivityEscalation.destroy({
        where: {
          meetingId: {
            [Op.in]: meetingIdSubQuery
          }
        },
        force: true
      })
      await Activity.update({
        lastEscalationType: ESCALATION_TYPE.INITIAL
      }, {
        where: {
          meetingId: {
            [Op.in]: meetingIdSubQuery
          }
        }
      })
      await MeetingComment.destroy({
        where: {
          meetingId: {
            [Op.in]: meetingIdSubQuery
          }
        }
      })
      const cronEndTime = moment()
      console.log(
        'startClearOrganizationMeetingEscalations END at %s took %d seconds',
        cronEndTime.toISOString(),
        cronEndTime.diff(cronStartedTime, 'seconds').toString()
      )
    } catch (ex) {
      console.error('startClearOrganizationMeetingEscalations FAIL', ex)
    } finally {
      isCronRunning = false
    }
  }).start()
}

export const startJwtInfoClean = () => {
  let isCronRunning = false
  new CronJob(CRON_JOB_TIMING_ONCE_IN_A_DAY, async () => {
    try {
      if(isCronRunning) return
      isCronRunning = true
      const cronStartedTime = moment()
      console.log('startJwtInfoClean START at %s', cronStartedTime.toISOString())
      await JwtInfo.destroy({
        where: {
          expiryDate: {
            [Op.gt]: moment().toDate()
          }
        },
        force: true
      })
      const cronEndTime = moment()
      console.log(
        'startJwtInfoClean END at %s took %d seconds',
        cronEndTime.toISOString(),
        cronEndTime.diff(cronStartedTime, 'seconds').toString()
      )
    } catch (ex) {
      console.error('startJwtInfoClean FAIL', ex)
    } finally {
      isCronRunning = false
    }
  }).start()
}
