import { Router } from 'express'
import multer  from 'multer'
import { v4 as uuid } from 'uuid';

import * as authorizationMiddleware from '../middlewares/authorization-middleware'
import * as userLogsController from '../controllers/user-logs-controller'

import { CONFIG } from '../config/config'


const router = Router()
router.get('/', ...[
    authorizationMiddleware.userAuthorization,
    userLogsController.getUserLogs
])

export default router
