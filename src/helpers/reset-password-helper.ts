import path from 'path'
import fs from 'fs'
import { User } from "../sec_db/models/User"
import UserNotFoundError from '../errors/UserNotFoundError'
import CommonError from "../errors/CommonError"
import { format } from 'util'
import handlebars from 'handlebars'
import { StatusCodes } from 'http-status-codes'
import { createJwtToken } from './jwt-helper'
import { ArcJwtTokenType, JwtTokenStatus } from '../constants'
import { CONFIG } from '../config/config'
import { sendEmail } from './email-helper'
import { stripProtocol } from '../utils/common-utils'
import { JwtInfo } from '../sec_db/models/JwtInfo'
import moment from 'moment'


const templates = {
  userInvitationEmail: handlebars.compile(fs.readFileSync(path.join(__dirname, '../email-templates/user-invitation-email.hbs'), 'utf-8')),
  resetPasswordEmail: handlebars.compile(
    fs.readFileSync(path.join(__dirname, '../email-templates/reset-password-email.hbs'), 'utf-8')
  )
}

export const sendUserInvitationEmail = async (userId: number, config: any) => {
  try {
    const user = await User.findOne({
      where: {
        id: userId
      },
    })
    if(!user) {
      throw new UserNotFoundError(userId)
    }
    const jwtInfo = await JwtInfo.create({
      expiryDate: moment().add(24, 'hours').toDate(),
      status: JwtTokenStatus.INITIAL
    })
    const token = await createJwtToken({
      jwtInfoId: jwtInfo.id,
      tokenType: ArcJwtTokenType.UserInvitationEmail,
      userId: user.id,
      name: user.name
    }, '24h')
    const passwordResetLink = `https://${stripProtocol(config.apiDomain)}/reset-password/${token}`
    const emailTemplateData = {
      data: {
        link: passwordResetLink,
        supportEmail: CONFIG.SUPPORT_EMAIL,
        user: {
          name: user.name
        }
      }
    }
    const html = templates.userInvitationEmail(emailTemplateData)
    ;(async () => {
      try {
        await sendEmail({
          to: user.email,
          subject: 'ARC Dashboard Invitation',
          html
        })
      } catch (ex) {
        console.error(ex)
      }
    })()
  } catch (ex) {
    const oldStack = ex.stack
    const err = new CommonError(format('Unable to sendUserInvitationEmail of userId: %d', userId), StatusCodes.INTERNAL_SERVER_ERROR)
    err.stack = oldStack
    throw err
  }
}

export const sendUserResetPasswordEmail = async (userId: number, config: any) => {
  try {
    const user = await User.findOne({
      where: {
        id: userId
      },
    })
    if(!user) {
      throw new UserNotFoundError(userId)
    }
    const jwtInfo = await JwtInfo.create({
      expiryDate: moment().add(24, 'hours').toDate(),
      status: JwtTokenStatus.INITIAL
    })
    const token = await createJwtToken({
      jwtInfoId: jwtInfo.id,
      tokenType: ArcJwtTokenType.UserInvitationEmail,
      userId: user.id,
      name: user.name
    }, '24h')
    const passwordResetLink = `https://${stripProtocol(config.apiDomain)}/reset-password/${token}`
    console.log('passwordResetLink', passwordResetLink)
    const emailTemplateData = {
      data: {
        link: passwordResetLink,
        supportEmail: CONFIG.SUPPORT_EMAIL,
        user: {
          name: user.name
        }
      }
    }
    const html = templates.resetPasswordEmail(emailTemplateData)
    ;(async () => {
      try {
        await sendEmail({
          to: user.email,
          subject: 'ARC Dashboard Reset Password',
          html
        })
      } catch (ex) {
        console.error(ex)
      }
    })()
  } catch (ex) {
    const oldStack = ex.stack
    const err = new CommonError(format('Unable to sendUserResetPasswordEmail of userId: %d', userId), StatusCodes.INTERNAL_SERVER_ERROR)
    err.stack = oldStack
    throw err
  }
}