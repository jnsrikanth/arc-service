import { format } from 'util'
import { StatusCodes } from 'http-status-codes'
import { Activity } from '../sec_db/models/Activity'
import { CommonError } from "../errors/CommonError"

export const postActivityEscalation = async (req: any, res: any, next: Function) => {
    try {
        const activityId = +req.params.activityId
        const activity = await Activity.findOne({
            where: {
                id: activityId
            }
        })
        if(!activity) {
            throw new CommonError(format('activity with id: %d not found', activityId), StatusCodes.BAD_REQUEST)
        }
        req.context.activity = activity
        next()
    } catch(ex) {
        next(ex)
    }
}