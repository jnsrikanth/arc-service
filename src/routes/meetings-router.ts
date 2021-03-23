import { Router } from 'express'
import * as authorizationMiddleware from '../middlewares/authorization-middleware'
import * as meetingsMiddleware from '../middlewares/meetings-middleware'
import * as meetingsController from '../controllers/meetings-controller'
import multer from 'multer'
import { v4 as uuid } from 'uuid';
import { CONFIG } from '../config/config'

const router = Router()

const storage = multer.diskStorage({
    destination: (req: any, file: any, cb: any) => {
        cb(null, CONFIG.VIDEO_STORAGE_PATH)
    },
    filename: function (req: any, file: any, cb: any) {
        cb(null, uuid() + ".webm")
    }
})
const storageUpload = multer({ storage })

router.post('/', authorizationMiddleware.userAuthorization, storageUpload.single('video'), meetingsController.postMeeting)
router.get('/', authorizationMiddleware.userAuthorization, meetingsController.getMeetings)
router.get('/:meetingId', authorizationMiddleware.userAuthorization, meetingsController.getMeeting)
router.post('/:meetingId/comments', authorizationMiddleware.userAuthorization, meetingsMiddleware.postMeetingComments, meetingsController.postMeetingComment)

export default router
