import { StatusCodes } from "http-status-codes"
import { Op, Sequelize } from 'sequelize'
import { format } from "util"
import { ORGANIZATION, USER, USER_TYPE, USER_TYPES } from "../constants"
import { CommonError } from "../errors/CommonError"
import { Organization } from "../sec_db/models/Organization"
import { User } from "../sec_db/models/User"
import { UserLog } from "../sec_db/models/UserLog"

export const getUserLogs = async (req: any, res: any, next: Function) => {
  try {
    const userWhereFilters = []
    switch (req.context.authorization.userType) {
      case USER_TYPE.SUPER_ADMIN:
        break
      case USER_TYPE.COMPLIANCE_MANAGER:
        userWhereFilters.push({
          organizationId: req.context.authorization.organization.id,
          userType: {
            [Op.notIn]: [USER_TYPE.SUPER_ADMIN]
          }
        })
        break
      default:
        throw new CommonError(format('Access denied'), StatusCodes.FORBIDDEN)
    }
    const sortByColumnMap: any = {
      'user.organization.name': Sequelize.literal('`user.organization.name`'),
      'user.name': Sequelize.literal('user.name'),
      'user.email': Sequelize.literal('user.email'),
      'user.userType': Sequelize.literal('user.userType'),
      'loginTime': 'loginTime'
    }
    const search = req.query.search
    let { limit, offset, sort, order } = req.query
    limit = +limit || 10
    offset = +offset || 0
    sort = sortByColumnMap[sort ? sort : 'loginTime']
    order = +order === 1 ? 'ASC' : 'DESC'
    const { rows, count } = await UserLog.findAndCountAll({
      include: [
        {
          model: User,
          as: USER,
          where: {
            [Op.and]: userWhereFilters,
            ...(search ? {
              [Op.or]: [{
                name: {
                  [Op.like]: `%${search}%`
                },
              }, {
                email: {
                  [Op.like]: `%${search}%`
                },
              },{
                userType: {
                  [Op.in]: USER_TYPES.filter(({ title }) => title.toLocaleLowerCase().includes(search.toLowerCase())).map(({ value }) => value)
                },
              },{
                organizationId: {
                  [Op.in]: Sequelize.literal(`(SELECT id FROM Organizations WHERE name like '%${search}%')`)
                }
              }]
            }: null)
          },
          include: [{
            model: Organization,
            as: ORGANIZATION
          }]
        }
      ],
      order: [[sort, order]],
      limit,
      offset
    })
    res.status(StatusCodes.OK).json({
      data: rows,
      metaData: {
        count,
      },
      status: {
        code: 0,
        error: ''
      }
    })
  } catch (ex) {
    next(ex)
  }
}