import { Router } from 'express'
import * as userActivitiesController from '../controllers/user-activities-controller'
import * as userActivitiesMiddleware from '../middlewares/user-activities-middleware'
import * as authorizationMiddleware from '../middlewares/authorization-middleware'

const router = Router()

router.post('/:activityId/escalation', ...[
    authorizationMiddleware.userAuthorization,
    userActivitiesMiddleware.postActivityEscalation,
    userActivitiesController.postActivityEscalation
])

export default router
