import { Sequelize, INTEGER, Model, TEXT } from 'sequelize'
import { MEETING, ORGANIZATION, USER } from "../../constants"
import { User } from "./User"
import { Meeting } from "./Meeting"


export class MeetingComment extends Model {
  public id!: number
  public meetingId!: number
  public organizationId!: number
  public userId!: number
  public comment!: string

  // sequelize association functions
  public meeting!: Meeting
  public user!: User
  public organization!: User[]

  public readonly createdAt?: Date
  public readonly updatedAt?: Date

  static load(sequelize: Sequelize) {
    this.init({
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      meetingId: {
        type: INTEGER
      },
      organizationId: {
        type: INTEGER
      },
      userId: {
        type: INTEGER
      },
      comment: {
        type: TEXT
      },
    }, {
        sequelize,
        modelName: 'MeetingComment'
    })
  }
  static associate(models: any) {
    this.belongsTo(models.Meeting, {
      foreignKey: 'meetingId',
      as: MEETING
    })
    this.belongsTo(models.User, {
      foreignKey: 'userId',
      as: USER
    })
    this.belongsTo(models.Organization, {
      foreignKey: 'organizationId',
      as: ORGANIZATION
    })
  }
}

