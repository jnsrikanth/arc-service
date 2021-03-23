import { Router } from 'express'

import * as authorizationMiddleware from '../middlewares/authorization-middleware'
import * as userVideosController from '../controllers/user-videos-controller'

const router = Router()

router.post('/images', ...[
    authorizationMiddleware.userAuthorization,
    userVideosController.postUserImages
])

export default router
