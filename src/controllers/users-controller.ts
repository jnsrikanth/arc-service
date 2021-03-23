import fs from "fs"
import stream from 'stream'
import moment from "moment"
import { Op, Sequelize } from 'sequelize'
import { format } from "util"
import { StatusCodes } from 'http-status-codes'
import { CONFIG } from "../config/config"
import { MLDatasource } from "../datasources/MLDatasource"
import { CommonError } from "../errors/CommonError"
import { UserType } from "../helpers/users-log-helper"
import { Meeting } from "../sec_db/models/Meeting"
import { MeetingUser } from "../sec_db/models/MeetingUser"
import { User } from "../sec_db/models/User"
import { UserVideos } from "../sec_db/models/UserVideos"
import { ARC_DATE_TIME_FORMAT, InfrastructureProvider, ORGANIZATION, USER_CODE_LENGTH, USER_TYPE, USER_TYPES } from "../constants"
import { Activity } from "../sec_db/models/Activity"
import { ActivityEscalation } from "../sec_db/models/ActivityEscalation"
import { deleteUserData } from "../helpers/data-clean-helper"
import { Organization } from "../sec_db/models/Organization"
import { generateRandomNumber } from "../helpers/password-helper"
import { sendUserInvitationEmail } from "../helpers/reset-password-helper"
import { padDoubleQuotes } from '../utils/common-utils'
import { getUserImageIndexKey, getUserPickleKey, isObjectKeyExistsInStorage } from "../helpers/storage-helper"

const handleUsersDownload = async (res: any, usersData: any) => {
  const tableColumnList = [
    {
      id: 'organization.name',
      name: 'Organization',
      cellValue: (row: any) => {
        return row.organization.name
      }
    },
    {
      id: 'name',
      name: 'Full name',
      cellValue: (row: any) => {
        return row.name
      }
    },
    {
      id: 'email',
      name: 'Email ID',
      cellValue: (row: any) => {
        return row.email
      }
    },
    {
      id: 'userCode',
      name: 'User Code',
      cellValue: (row: any) => {
        return row.userCode
      }
    },
    {
      id: 'userType',
      name: 'User Type',
      cellValue: (row: any) => {
        return row.userType
      }
    },
    {
      id: 'pickleFileStatus',
      name: 'Face ID',
      cellValue: (row: any) => {
        return row.pickleFileStatus ? 'Yes' : 'No'
      }
    },
    {
      id: 'createdAt',
      name: 'Created On',
      cellValue: (row: any) => {
        return row.createdAt ? moment(row.createdAt).format(ARC_DATE_TIME_FORMAT) : '--'
      }
    },
    {
      id: 'lastLogin',
      name: 'Last Active',
      cellValue: (row: any) => {
        return row.lastLogin ? moment(row.lastLogin).format(ARC_DATE_TIME_FORMAT) : '--'
      }
    },
  ]
  const tableColumnsNamesCSV = tableColumnList.map(
    column => column.name
  )
  const tableColumnsIds = tableColumnList.map(
    column => column.id
  )
  const readStream = new stream.PassThrough()
  readStream.write(tableColumnsNamesCSV.map(columnName => padDoubleQuotes(columnName)).join(',') + '\n') // write CSV header
  usersData.forEach((user: any) => {
    readStream.write(tableColumnList.map(columnItem => padDoubleQuotes(columnItem.cellValue(user.dataValues))).join(',') + '\n')
  })
  readStream.end(null)
  // csvGeneratePromise
  res.set(
    'Content-disposition',
    'attachment; filename=users-report.csv'
  )
  res.set('Content-Type', 'text/csv')
  readStream.pipe(res)
}
export const getUsers = async (req: any, res: any, next: Function) => {
    try {
      const sortByColumnMap: any = {
        'organization.name': Sequelize.literal('organization.name'),
        name: 'name',
        email: 'email',
        userType: 'userType',
        createdAt: 'createdAt',
        expiryDate: 'expiryDate',
        lastLogin: 'lastLogin'
      }
      let { limit, offset, search, sort, order } = req.query
      const isDownload = Object.getOwnPropertyDescriptor(req.query, 'download')
      limit = +limit || 10
      offset = +offset || 0
      sort = sortByColumnMap[sort ? sort : 'createdAt']
      order = +order === 1 ? 'ASC' : 'DESC'
      const whereFilters: any[] = [{
        userType: {
          [Op.ne]: USER_TYPE.TRADER
        }
      }]
      switch(req.context.authorization.userType) {
        case USER_TYPE.SUPER_ADMIN:
          break
        case USER_TYPE.COMPLIANCE_MANAGER:
          whereFilters.push({
            userType: {
              [Op.notIn]: [USER_TYPE.SUPER_ADMIN]
            },
            organizationId: req.context.authorization.organization.id
          })
          break
        case USER_TYPE.COMPLIANCE_ANALYST:
          whereFilters.push({
            id: req.context.authorization.id
          })
          break
      }
      
      const { rows, count } = await User.findAndCountAll({
          attributes: ['id', 'name', 'email', 'userCode', 'userType', 'location', 'expiryDate', 'lastLogin', 'status', 'organizationId', 'createdAt'],
          order: [[sort, order]],
          include: [{
            model: Organization,
            as: ORGANIZATION,
            attributes: ['id', 'name']
          }],
          where: {
            [Op.and]: whereFilters,
            ...(search ? {
              [Op.or]: [{
                name: {
                  [Op.like]: `%${search}%`
                },
              }, {
                email: {
                  [Op.like]: `%${search}%`
                },
              }, {
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
          ...(isDownload ? null : {
            limit,
            offset
          })
      })
      await Promise.all(rows.map(async (user) => {
        if(user.id) {
          user.setDataValue('pickleFileStatus', await isObjectKeyExistsInStorage(getUserPickleKey(user.organizationId || 0, user.id)))
        }
      }))
      const organizations = req.context.authorization.userType === USER_TYPE.SUPER_ADMIN ? await Organization.findAll({}) : []
      if(isDownload) {
        return await handleUsersDownload(res, rows)
      }
      res.status(200).json({
        data: rows,
        metaData: {
          count,
          organizations
        },
        status: {
          code: 0,
          error: ''
        }
      })
    } catch(ex) {
        next(ex)
    }
}

export const postUser = async (req: any, res: any, next: Function) => {
  try {
    const { name, email, userType, location, status }: User = req.body
    const { sendInvitation } = req.body
    let { organizationId } = req.body
    switch(req.context.authorization.userType) {
      case USER_TYPE.SUPER_ADMIN:
        if(!organizationId) {
          organizationId = req.context.authorization.organization.id
        }
          break
      case USER_TYPE.COMPLIANCE_MANAGER:
        if(userType && ![USER_TYPE.COMPLIANCE_MANAGER, USER_TYPE.COMPLIANCE_ANALYST].includes(userType)) {
          throw new CommonError('Access denied', StatusCodes.FORBIDDEN)
        }
        organizationId = req.context.authorization.organization.id
        break
      case USER_TYPE.COMPLIANCE_ANALYST:
        throw new CommonError('Access denied', StatusCodes.FORBIDDEN)
    }
    const user = await User.build({
      name,
      email,
      userCode: generateRandomNumber(USER_CODE_LENGTH),
      userType,
      location,
      status,
      organizationId,
    }).save()
    if(sendInvitation) {
      ;(async () => {
        try {
          await sendUserInvitationEmail(user.id, {
            apiDomain: req.get('origin') || CONFIG.DEFAULT_UI_DOMAIN
          })
        } catch (ex) {
          console.error(ex)
        }
      })()
    }
    res.status(200).json({
        data: {
            id: user.id
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

export const putUser = async (req: any, res: any, next: Function) => {
    try {
        const userId = +req.params.userId
        const { name, email, userType, location, status } : User = req.body
        switch(req.context.authorization.userType) {
            case USER_TYPE.SUPER_ADMIN:
                break
            case USER_TYPE.COMPLIANCE_MANAGER:
                if(userType && ![USER_TYPE.COMPLIANCE_MANAGER, USER_TYPE.COMPLIANCE_ANALYST].includes(userType)) {
                    throw new CommonError(format('Access denied to set userType: %s', userType), StatusCodes.FORBIDDEN)
                }
                break
            case USER_TYPE.COMPLIANCE_ANALYST:
                throw new CommonError('Access denied', StatusCodes.FORBIDDEN)
        }
        await User.update({
            name,
            email,
            userType,
            location,
            status,
        }, {
            where: {
                id: userId
            }
        })
        res.status(200).json({
            status: {
                code: 0,
                error: ''
            }
        })
    } catch (ex) {
        next(ex)
    }
}

export const deleteUser = async (req: any, res: any, next: Function) => {
    try {
        const userId = +req.params.userId
        switch(req.context.authorization.userType) {
            case USER_TYPE.SUPER_ADMIN:
                break
            case USER_TYPE.COMPLIANCE_MANAGER:
                if(![USER_TYPE.COMPLIANCE_MANAGER, USER_TYPE.COMPLIANCE_ANALYST].includes(req.context.user.userType)) {
                    throw new CommonError('Access denied', StatusCodes.FORBIDDEN)
                }
                break
            case USER_TYPE.COMPLIANCE_ANALYST:
                throw new CommonError('Access denied', StatusCodes.FORBIDDEN)
        }
        await deleteUserData(userId)
        User.destroy({
            where: {
                id: userId
            },
            force: true
        })
        res.status(200).json({
            status: {
                code: 0,
                error: ''
            }
        })
    } catch(ex) {
        console.log(ex)
        next(ex)
    }
}

export const getUserProfile = async (req: any, res: any, next: Function) => {
    try {
        const userId = req.context.authorization.id
        const user = await User.findOne({
            where: {
                id: userId
            },
            include: [{
                model: Organization,
                as: ORGANIZATION
            }]
        })
        if(user instanceof User) {
            const userData = {
                id: user.id,
                email: user.email,
                name: user.name,
                userType: user.userType,
                organization: user.organization,
                isPickleAvailable: await isObjectKeyExistsInStorage(getUserPickleKey(user.organizationId || 0, user.id)),
                isUserImagesAvailable: await isObjectKeyExistsInStorage(getUserImageIndexKey(user.organization.id, userId || 0, 1)),
            }
            res.status(StatusCodes.OK).json({
                data: userData,
                status: {
                    code: 0,
                    error: ''
                }
            })
        } else {
            throw new CommonError('User profile not found', StatusCodes.BAD_REQUEST)
        }
    } catch (ex) {
        next(ex)
    }
}