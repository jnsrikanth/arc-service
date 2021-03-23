import { StatusCodes } from "http-status-codes"
import { JsonWebTokenError } from "jsonwebtoken"
import moment from "moment"
import { format } from "util"
import { ArcJwtTokenType, JwtTokenStatus, ORGANIZATION, ORGANIZATION_STATUS, USER_STATUS } from "../constants"
import { CommonError } from "../errors/CommonError"
import UserNotFoundError from "../errors/UserNotFoundError"
import { verifyJwtToken } from "../helpers/jwt-helper"
import { JwtInfo } from "../sec_db/models/JwtInfo"
import { Organization } from "../sec_db/models/Organization"
import { User } from "../sec_db/models/User"

export const userAuthorization = async (req: any, res: any, next: Function) => {
  try {
    const authorization = req.headers.authorization

    if(!authorization || !authorization.startsWith('Bearer ')) {
      throw new CommonError('Unauthorized', StatusCodes.UNAUTHORIZED)
    }
    const jwtToken = authorization.slice(7, authorization.length)
    const tokenPayload: any = await verifyJwtToken(jwtToken)
    const { id: userId, userLogId } = tokenPayload
    const user = await User.findOne({
      where: {
        id: userId
      },
      include: [{
        model: Organization,
        as: ORGANIZATION
      }]
    })
    let userData
    if(user instanceof User) {
      if(user.organization.expiryDate && (moment(user.organization.expiryDate).endOf('day').diff(moment.now()) < 0 || user.organization.status !== ORGANIZATION_STATUS.ACTIVE)) {
        throw new CommonError('Organization is not active.', StatusCodes.UNAUTHORIZED)
      }
      userData = {
        id: user.id,
        userLogId,
        email: user.email,
        name: user.name,
        userType: user.userType,
        organization: user.organization
      }
    } else {
      throw new CommonError('Unauthorized', StatusCodes.UNAUTHORIZED)
    }
    req.context.authorization = userData
    next()
  } catch (ex) {
    if(ex instanceof JsonWebTokenError) {
      Object.assign(ex, {
        statusCode: 401
      })
    }
    next(ex)
  }
}

export const resetPasswordAuthorization = async (req: any, res: any, next: Function) => {
  try {
    const { token } = req.params
    const tokenPayload: any = await verifyJwtToken(token)
    if(![ArcJwtTokenType.UserResetPasswordEmail, ArcJwtTokenType.UserInvitationEmail].includes(tokenPayload.tokenType)) {
      throw new CommonError(format('invalid token: %s', token), StatusCodes.BAD_REQUEST)
    }
    const { userId, jwtInfoId } = tokenPayload
    const jwtInfo = await JwtInfo.findByPk(jwtInfoId)
    if(!jwtInfo || moment(jwtInfo.expiryDate).diff(moment()) < 0 || jwtInfo.status !== JwtTokenStatus.INITIAL) {
      throw new CommonError(format('invalid token: %s', token), StatusCodes.BAD_REQUEST)
    }

    const user = await User.findOne({
      where: {
        id: userId
      }
    })
    if(!user) {
      throw new UserNotFoundError(userId)
    }
    req.context.resetPasswordPayload = tokenPayload
    next()
  } catch (ex) {
    if(ex instanceof JsonWebTokenError) {
      Object.assign(ex, {
        statusCode: 400
      })
    }
    next(ex)
  }
}