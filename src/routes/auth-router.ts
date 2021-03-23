import { Router } from 'express'
import * as authorizationMiddleware from '../middlewares/authorization-middleware'
import * as authController from '../controllers/auth-controller'

const router = Router()

router.post('/login', authController.login)
router.post('/logout', authorizationMiddleware.userAuthorization, authController.logout)
export default router
