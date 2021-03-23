import { StatusCodes } from "http-status-codes"
import { format } from "util"
import { CONFIG } from "../config/config"
import { JwtTokenStatus, USER_TYPE } from "../constants"
import CommonError from "../errors/CommonError"
import UserNotFoundError from "../errors/UserNotFoundError"
import { sendUserResetPasswordEmail } from "../helpers/reset-password-helper"
import { JwtInfo } from "../sec_db/models/JwtInfo"
import { User } from "../sec_db/models/User"
import { isValidPassword } from "../utils/common-utils"

export const sendResetPasswordEmail = async (req: any, res: any, next: Function) => {
  try {
    const { userId } = req.body
    const user = await User.findOne({
      where: {
        id: userId
      },
    })
    if(!user) {
      throw new UserNotFoundError(userId);
    }
    switch(req.context.authorization.userType) {
      case USER_TYPE.SUPER_ADMIN:
        break
      case USER_TYPE.COMPLIANCE_MANAGER:
        if(user.organizationId !== req.context.authorization.organization.id) {
          throw new CommonError('Access denied', StatusCodes.FORBIDDEN)
        }
        break
      case USER_TYPE.COMPLIANCE_ANALYST:
        throw new CommonError('Access denied', StatusCodes.FORBIDDEN)
    }
    await sendUserResetPasswordEmail(user.id, {
      apiDomain: req.get('origin') || CONFIG.DEFAULT_UI_DOMAIN
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

export const validateToken = async (req: any, res: any, next: Function) => {
  try {
    console.log(req.context.resetPasswordPayload)
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

export const setPassword = async (req: any, res: any, next: Function) => {
  try {
    const { password, repeatPassword } = req.body
    if(password !== repeatPassword) {
      throw new CommonError(format('input passwords do not match'), StatusCodes.BAD_REQUEST);
    }
    if(!isValidPassword(password)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: {
          code: 0,
          error: 'Invalid password'
        }
      })
    }
    await User.update({
      userCode: password
    }, {
      where: {
        id: req.context.resetPasswordPayload.userId
      }
    })
    await JwtInfo.update({
      status: JwtTokenStatus.USED
    }, {
      where: {
        id: req.context.resetPasswordPayload.jwtInfoId
      }
    })
    
    res.status(StatusCodes.OK).json({
      status: {
        code: 0,
        error: 'Password updated successfully.'
      }
    })
  } catch (ex) {
    next(ex)
  }
}

export const requestResetPassword = async (req: any, res: any, next: Function) => {
  try {
    const { email } = req.body
    const user = await User.findOne({
      where: {
        email
      },
    })
    if(!user) {
      return res.status(400).json({
        status: {
          code: 0,
          errorCode: 'EmailNotFound',
          error: format('User with email: %s not found', email)
        }
      })
    }
    await sendUserResetPasswordEmail(user.id, {
      apiDomain: req.get('origin') || CONFIG.DEFAULT_UI_DOMAIN
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