import { Router } from 'express'
import * as authorizationMiddleware from '../middlewares/authorization-middleware'
import * as resetPasswordController from '../controllers/reset-password-controller'

const router = Router()

router.post('/send-email/', authorizationMiddleware.userAuthorization, resetPasswordController.sendResetPasswordEmail)
router.get('/:token/validate-token', authorizationMiddleware.resetPasswordAuthorization, resetPasswordController.validateToken)
router.put('/:token/set-password', authorizationMiddleware.resetPasswordAuthorization, resetPasswordController.setPassword)
router.post('/request', resetPasswordController.requestResetPassword)
export default router
