import { Activity } from '../sec_db/models/Activity'
import { ActivityEscalation } from '../sec_db/models/ActivityEscalation';

export const postActivityEscalation = async (req: any, res: any, next: Function) => {
  try {
    const activityId = +req.params.activityId
    const { comment, escalationType } = req.body
    await ActivityEscalation.build({
      activityId,
      meetingId: req.context.activity.meetingId,
      escalatedByUserId: req.context.authorization.id,
      escalationType,
      comment
    }).save()
    await Activity.update({
      lastEscalationType: escalationType,
    }, {
      where: {
        id: activityId
      }
    })
    res.status(200).json({
      status: {
        code: 0,
        error: ''
      }
    })
  } catch(ex) {
      next(ex)
  }
}