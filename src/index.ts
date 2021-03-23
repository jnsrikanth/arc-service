import { config as dotenvConfig } from 'dotenv'
dotenvConfig()
import http from 'http'
import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'


import { SocketListners } from "./socket_listener/socket_listener";

import authRouter from './routes/auth-router'
import resetPasswordRouter from './routes/reset-password-router'
import organizationsRouter from './routes/organizations-router'
import usersRouter from './routes/users-router'
import userVideosRouter from './routes/user-videos-router'
import userLogsRouter from './routes/user-logs-router'
import meetingsRouter from './routes/meetings-router'
import activitiesRouter from './routes/user-activites-router'
import { SecDb } from "./sec_db/sec_db";
import { v4 as uuid } from 'uuid';
import { CommonError } from "./errors/CommonError";
import { CONFIG } from "./config/config";
import { startClearOrganizationMeetingEscalations, startJwtInfoClean, startMeetingsCron, startPickleFilesCron } from './cron-jobs'
const sequelize = SecDb.getInstance()
const app = express()

;(async () => {
    startPickleFilesCron()
    startMeetingsCron()
    startClearOrganizationMeetingEscalations()
    startJwtInfoClean()
})()

const server = http.createServer(app);
const socketClient = new SocketListners(server)
// const vid_router = VideoRouter.getInstance(socketClient).vid_router
// const image_router = ImageRouter.getInstance(socketClient).img_router
app.use(cors())
app.use(bodyParser.json({ "limit": "200mb" }));
app.use((req: any, res: any, next: Function) => {
    const requestId = req.headers.requestId || uuid()
    req.requestId = requestId
    req.context = {}
    req.sequelize = sequelize
    req.socketClient = socketClient
    next()
})

app.use('/api/auth/', authRouter)
app.use('/api/reset-password/', resetPasswordRouter)
app.use('/api/organizations/', organizationsRouter)
app.use('/api/users/', usersRouter)
app.use('/api/user-videos/', userVideosRouter)
app.use('/api/user-logs', userLogsRouter)
app.use('/api/meetings/', meetingsRouter)
app.use('/api/activities/', activitiesRouter)
app.get('/api', function (req: any, res: any) {
    res.send('hello world')
})
app.use((error: any, req: any, res: any, next: Function) => {
    console.error(error)
    if(error instanceof CommonError) {
        res.status(error.statusCode).json({
            status: {
                code: 1,
                error: error.message
            }
        })
    } else {
        const statusCode = error.statusCode || 500
        res.status(statusCode).json({
            status: {
                code: 1,
                error: 'Error'
            }
        })
    }
})

server.listen(3005)
