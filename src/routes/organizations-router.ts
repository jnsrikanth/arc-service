import { Router } from 'express'
import * as organizationsController from '../controllers/organizations-controller'
import * as authorizationMiddleware from '../middlewares/authorization-middleware'

const router = Router()

router.get('/', ...[
    authorizationMiddleware.userAuthorization,
    organizationsController.getOrganizations
])
router.post('/', ...[
    authorizationMiddleware.userAuthorization,
    organizationsController.postOrganization
])
router.put('/:organizationId', ...[
    authorizationMiddleware.userAuthorization,
    organizationsController.putOrganization,
])
router.delete('/:organizationId', ...[
    authorizationMiddleware.userAuthorization,
    organizationsController.deleteOrganization,
])

export default router
