import { User } from "../sec_db/models/User"
import { UserLog } from "../sec_db/models/UserLog"

export enum UserLogType {
    USER_CREATED = 'userCreated',
    USER_LOGIN = 'userLogin',
    USER_FACE_REGISTRATION = 'userFaceRegistration',
    USER_EXPERIENCE_ACTIVITY = 'userExperienceActivity',
    USER_DELETED = 'userDeleted',
}

export enum UserType {
    USER = 'user',
    ADMIN = 'admin'
}

export const addUserLog = async (userId: string, {
    logType,
    logByUserId,
    logByUserType,
    otherInfo
}: {
    logType: UserLogType,
    logByUserId: string,
    logByUserType: string,
    otherInfo: any
}) => {
    await UserLog.build({
        userId,
        logType,
        logByUserId,
        logByUserType,
        otherInfo: JSON.stringify(otherInfo)
    }).save()
}