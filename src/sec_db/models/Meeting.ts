import { Sequelize } from "sequelize/types";
import { INTEGER, Model, DataTypes } from 'sequelize'
import { ACTIVITIES, HOST, MEETING_COMMENTS, MEETING_TYPE, USERS, VIDEO_PROCESSED_STATUS } from "../../constants";
import { User } from "./User";
import { Activity } from "./Activity";


export class Meeting extends Model {
  public id!: number
  public name!: string
  public organizationId!: number
  public hostId!: number
  public meetingType!: MEETING_TYPE
  public meetingSource!: string
  public videoProcessedStatus!: VIDEO_PROCESSED_STATUS
  public videoStartTime!: Date;
  public videoDuration!: number;
  public videoUrlData!: string;

  // sequelize association functions
  public host!: User;
  public users!: User[]
  public setUsers!: Function
  public activities!: Activity[]

  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  static load(sequelize: Sequelize) {
    this.init({
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      name: {
        type: DataTypes.STRING
      },
      organizationId: {
        type: DataTypes.INTEGER
      },
      hostId: {
        type: DataTypes.INTEGER
      },
      meetingType: {
        type: DataTypes.STRING
      },
      meetingSource: {
        type: DataTypes.STRING
      },
      videoProcessedStatus: {
        type: DataTypes.STRING
      },
      videoStartTime: {
        type: DataTypes.DATE
      },
      videoDuration: {
        type: DataTypes.INTEGER
      },
      videoUrlData: {
        type: DataTypes.TEXT
      }
    }, {
      sequelize,
      modelName: 'Meeting'
    })
  }
  static associate(models: any) {
    this.belongsToMany(models.User, {
      through: {
        model: models.MeetingUser,
      },
      foreignKey: 'meetingId',
      otherKey: 'userId',
      as: USERS
    })
    this.belongsTo(models.User, {
      foreignKey: 'hostId',
      as: HOST
    })
    this.hasMany(models.Activity, {
      foreignKey: 'meetingId',
      as: ACTIVITIES
    })
    this.hasMany(models.MeetingComment, {
      foreignKey: 'meetingId',
      as: MEETING_COMMENTS
    })
  }
}

