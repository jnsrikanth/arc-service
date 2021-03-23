import { StatusCodes } from 'http-status-codes';
import nodemailer from 'nodemailer'
import { format } from 'util';
import { CONFIG } from '../config/config';
import CommonError from '../errors/CommonError';
const smtpTransport = nodemailer.createTransport({
  host: 'smtp.office365.com',
  port: 587,
  auth: {
    user: 'arc@citycomsolutions.com',
    pass: 'Gr33nLight!!'
  }
});
export const sendEmail = async ({ to, subject, html, text}: {
  to: string,
  subject: string,
  html?: string,
  text?: string
}) => {
  try {
    const mailOptions = {
      from: 'arc@citycomsolutions.com',
      to,
      subject,
      html,
      text
    }
    const emailResult = await smtpTransport.sendMail(mailOptions);
    console.log(emailResult)
  } catch (ex) {
    const oldStack = ex.stack
    const err = new CommonError(format('Unable to sendEmail with to: %s, subject: %s, html: %s:, text: $s', to, subject, html, text), StatusCodes.INTERNAL_SERVER_ERROR)
    err.stack = oldStack
    throw err
  }
}
  