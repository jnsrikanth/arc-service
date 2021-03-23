import fs from 'fs'
import { StatusCodes } from 'http-status-codes'
import moment from 'moment'
import { CONFIG } from "../config/config"
import { ORGANIZATION, ORGANIZATION_STATUS, USER_STATUS } from '../constants'
import { CommonError } from "../errors/CommonError"
import { createJwtToken } from "../helpers/jwt-helper"
import { getUserImageIndexKey, getUserPickleKey, isObjectKeyExistsInStorage } from '../helpers/storage-helper'
import { Organization } from '../sec_db/models/Organization'
import { User } from "../sec_db/models/User"
import { UserLog } from "../sec_db/models/UserLog"

export const login = async (req: any, res: any, next: Function) => {
    try {
        const { email, userCode } = req.body
        const user = await User.findOne({
            where: {
                email
            },
            include: [{
                model: Organization,
                as: ORGANIZATION
            }]
        })
        if(!user || user.userCode !== userCode) {
            throw new CommonError('Invalid login credentials.', 400)
        }
        if(user.organization.expiryDate && (moment(user.organization.expiryDate).endOf('day').diff(moment.now()) < 0 || user.organization.status !== ORGANIZATION_STATUS.ACTIVE)) {
            throw new CommonError('Organization is not active.', 400)
        }
        const { id: userId } = user
        const userLog = await UserLog.build({
            userId,
            loginTime: new Date()
        }).save()
        const { id: userLogId } = userLog
        const jwtPayload = {
            id: userId,
            userLogId
        }
        const userData = {
            ...jwtPayload,
            email: user.email,
            name: user.name,
            userType: user.userType,
            organization: user.organization,
            isUserImagesAvailable: await isObjectKeyExistsInStorage(getUserImageIndexKey(user.organization.id, userId || 0, 1)),
            isPickleAvailable: await isObjectKeyExistsInStorage(getUserPickleKey(user.organizationId, userId))
        }
        const jwtToken = await createJwtToken({
            id: userId,
            userLogId
        }, '24h')
        user.lastLogin = new Date()
        user.save()
        res.status(200).json({
            token: jwtToken,
            user: userData,
            status: {
                code: 0,
                error: ''
            }
        })
    } catch(ex) {
        next(ex)
    }
}

export const logout = async (req: any, res: any, next: Function) => {
    try {
        const { userLogId } = req.context.authorization

        await UserLog.update({
            logoutTime: new Date()
        }, {
            where: {
                id: userLogId
            }
        })
        res.status(StatusCodes.OK).json({
            status: {
                code: 0,
                error: ''
            }
        })
    } catch (ex) {
        next(ex)
    }
}