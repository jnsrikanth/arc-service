import { Op, Sequelize } from 'sequelize'
import { format } from 'util'
import { Activity } from '../sec_db/models/Activity'
import { ActivityEscalation } from '../sec_db/models/ActivityEscalation'
import { Meeting } from '../sec_db/models/Meeting'
import { MeetingUser } from '../sec_db/models/MeetingUser'
import { Organization } from "../sec_db/models/Organization"
import { User } from '../sec_db/models/User'
import { UserLog } from '../sec_db/models/UserLog'
import { deleteObjectKeysInStorage, deleteObjectPrefixInStorage, getMeetingVideoKeys, getOrganizationPath, getUserImagesFolder } from './storage-helper'

export const deleteOrganizationData = async (organizationId: number) => {
    const organization = await Organization.findByPk(organizationId)
    await ActivityEscalation.destroy({
        where: {
            meetingId: {
                [Op.in]: Sequelize.literal(`(SELECT id FROM Meetings WHERE organizationId='${organizationId}' )`)
            }
        },
        force: true,
    })
    await Activity.destroy({
        where: {
            meetingId: {
                [Op.in]: Sequelize.literal(`(SELECT id FROM Meetings WHERE organizationId='${organizationId}' )`)
            }
        },
        force: true,
    })
    await Meeting.destroy({
        where: {
            organizationId
        },
        force: true
    })
    await UserLog.destroy({
        where: {
            userId: {
                [Op.in]: Sequelize.literal(`(SELECT id FROM Users WHERE organizationId = ${organizationId})`)
            }
        }
    })
    await User.destroy({
        where: {
            organizationId
        },
        force: true
    })
    await organization?.destroy({
        force: true,
    })
    await deleteObjectPrefixInStorage(getOrganizationPath(organizationId))
    // TODO; remove processed video from S3
}

export const deleteMeetingData = async (meetingId: number) => {
    const meeting = await Meeting.findByPk(meetingId)
    if(meeting instanceof Meeting) {
        await meeting.setUsers([])
        await deleteObjectKeysInStorage(Object.values(getMeetingVideoKeys(meeting.organizationId, meeting.id)))
        // TODO; remove processed video from S3
        await ActivityEscalation.destroy({
            where: {
                meetingId
            },
            force: true,
        })
        await Activity.destroy({
            where: {
                meetingId
            },
            force: true,
        })
        await meeting.destroy({
            force: true,
        })
    }
}

export const deleteUserData = async (userId: number) => {
    const user = await User.findByPk(userId)
    const organizationId = user?.organizationId || 0
    // TODO, delete all data in database and files
    console.log(format('deleting data of userId: %s', userId))
    // remove individual experience activity data
    await ActivityEscalation.destroy({
        where: {
            meetingId: {
                [Op.in]: Sequelize.literal(`(SELECT id FROM Meetings WHERE hostId='${userId}' )`)
            }
        }
    })
    await Activity.destroy({
        where: {
            meetingId: {
                [Op.in]: Sequelize.literal(`(SELECT id FROM Meetings WHERE hostId='${userId}' )`)
            }
        },
        force: true
    })
    const meetings = await Meeting.findAll({
        where: {
            hostId: userId
        }
    })
    for(const meeting of meetings) {
        await deleteObjectKeysInStorage(Object.values(getMeetingVideoKeys(organizationId, meeting.id)))
        // remove data from S3
    }
    await deleteObjectPrefixInStorage(getUserImagesFolder(organizationId, userId))
    await MeetingUser.destroy({
        where: {
            userId
        },
        force: true
    })
    await Meeting.destroy({
        where: {
            hostId: userId
        },
        force: true
    })
    await UserLog.destroy({
        where: {
            userId
        },
        force: true
    })
    console.log(format('deleted data of userId: %s', userId))
}