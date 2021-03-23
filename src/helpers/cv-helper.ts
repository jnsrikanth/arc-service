import { StatusCodes } from "http-status-codes"
import { format } from "util"
import { CONFIG } from "../config/config"
import { HOST, ORGANIZATION, VIDEO_PROCESSED_STATUS } from "../constants"
import { MLDatasource } from "../datasources/MLDatasource"
import { CommonError } from "../errors/CommonError"
import { getEncodingsPath, getMeetingVideoKeys, getOrganizationMeetingsPath, getUserImageIndexKey, getUserImagesFolder, getUserPickleKey, isObjectKeyExistsInStorage, startGPUInstance } from './storage-helper'
import { Meeting } from "../sec_db/models/Meeting"
import { Organization } from "../sec_db/models/Organization"
import { User } from "../sec_db/models/User"

export const processUserPickleFile = async (userId: number) => {
    try {
        const user = await User.findOne({
            where: {
                id: userId
            },
            include: [{
                model: Organization,
                as: ORGANIZATION
            }]
        })
        if(!user) {
            throw new CommonError(format('user with id: %d not found', userId), StatusCodes.NOT_FOUND)
        }
        const { organization: { id: organizationId }  } = user
        if(await isObjectKeyExistsInStorage(getUserPickleKey(organizationId, user.id || 0))) {
            return
        }
        if(!await isObjectKeyExistsInStorage(getUserImageIndexKey(organizationId, userId, 1))) {
            throw new CommonError(format('user: %d image not found', userId), StatusCodes.NOT_FOUND)
        }
        if(CONFIG.ENVIRONMENT === 'localhost') return
        await startGPUInstance()
        await MLDatasource.getInstance().execCommandAsync("python3", [
            `${CONFIG.SHELL_SCRIPT_PATH}/launch_face_reg.py`,
            ...['--dataset', getUserImagesFolder(organizationId, userId)],
            ...['--encodings_path', getEncodingsPath(organizationId)],
            ...['--user_id', `${userId}`],
            ...['--user_name', `${user.name}`]
        ], () => {}, () => {})
    } catch (ex) {
        const oldStack = ex.stack
        const err = new CommonError(format('Unable to processUserPickleFile userId: %d', userId), StatusCodes.INTERNAL_SERVER_ERROR)
        err.stack = oldStack
        throw err
    }
}

export const processMeetingVideo = async (meetingId: number) => {
    try {
        const meeting = await Meeting.findOne({
            where: {
                id: meetingId
            },
            include: [{
                model: User,
                as: HOST,
                include: [{
                    model: Organization,
                    as: ORGANIZATION
                }]
            }]
        })
        if(!meeting) {
            throw new CommonError(format('meeting with id: %d not found'), StatusCodes.NOT_FOUND)
        }
        const { id: userId, organization: { id: organizationId }  } = meeting.host
        const {
            rawVideo,
            processedVideo
        } = getMeetingVideoKeys(organizationId, meetingId)
        const processedVideoExists = await isObjectKeyExistsInStorage(processedVideo)
        if(processedVideoExists) {
            console.log('meeting with id: %d already processed', meetingId)
            await Meeting.update({
                videoProcessedStatus: VIDEO_PROCESSED_STATUS.PROCESSED
            }, {
                where: {
                    id: meetingId
                }
            })
            return
        }
        if(!await isObjectKeyExistsInStorage(rawVideo)) {
            throw new CommonError(format('meeting video with key: %s not found', rawVideo), StatusCodes.NOT_FOUND)
        }
        if(!await isObjectKeyExistsInStorage(getUserPickleKey(organizationId, userId))) {
            throw new CommonError(format('user: %d pickle not found', userId), StatusCodes.NOT_FOUND)
        }
        if(CONFIG.ENVIRONMENT === 'localhost') return
        await startGPUInstance()
        // main.py --vid_Path organizations/2/meetings/ --vid_name 5 --out_name organizations/2/meetings/5-processed.mp4 --users_id 8 --encodings_path organizations/2/pickles
        await MLDatasource.getInstance().execCommandAsync("python3", [
            `${CONFIG.SHELL_SCRIPT_PATH}/launch_main.py`,
            ...['--vid_Path', `${getOrganizationMeetingsPath(organizationId)}/`],
            ...['--vid_name', `${meetingId}`],
            ...['--out_name', processedVideo],
            ...['--users_id', `${userId}`],
            ...['--encodings_path', getEncodingsPath(organizationId)],
        ], () => {}, () => {})
        await Meeting.update({
            videoProcessedStatus: VIDEO_PROCESSED_STATUS.PROCESSED
        }, {
            where: {
                id: meetingId
            }
        })
    } catch (ex) {
        const oldStack = ex.stack
        const err = new CommonError(format('Unable to processMeetingVideo meetingId: %d', meetingId), StatusCodes.INTERNAL_SERVER_ERROR)
        err.stack = oldStack
        throw err
    }
}