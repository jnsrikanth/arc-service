import { format } from "util"
import { CommonError } from "../errors/CommonError"
import { Meeting } from "../sec_db/models/Meeting"

export const postMeetingComments = async (req: any, res: any, next: Function) => {
    try {
        const meetingId = +req.params.meetingId
        const meeting = await Meeting.findOne({
            where: {
                id: meetingId
            }
        })
        if(!meeting) {
            throw new CommonError(format('Meeting with id: %d is not found.', meetingId), 400)
        }
        req.context.meeting = meeting
        next()
    } catch(ex) {
        next(ex)
    }
}