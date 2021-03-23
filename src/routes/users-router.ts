import { Router } from 'express'
import * as usersController from '../controllers/users-controller'
import * as usersMiddleware from '../middlewares/users-middleware'
import * as authorizationMiddleware from '../middlewares/authorization-middleware'

const router = Router()

router.get('/', ...[
    authorizationMiddleware.userAuthorization,
    usersController.getUsers
])
router.post('/', ...[
    authorizationMiddleware.userAuthorization,
    usersMiddleware.postUser,
    usersController.postUser
])
router.put('/:userId', ...[
    authorizationMiddleware.userAuthorization,
    usersMiddleware.putUser,
    usersController.putUser
])
router.delete('/:userId', ...[
    authorizationMiddleware.userAuthorization,
    usersMiddleware.deleteUser,
    usersController.deleteUser
])
router.get('/user-profile', ...[
    authorizationMiddleware.userAuthorization,
    usersController.getUserProfile
])

export default router
