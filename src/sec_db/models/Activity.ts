import { Sequelize } from "sequelize/types";

import { DataTypes, Model } from 'sequelize'
import { ACTIVITY_ESCALATIONS, ESCALATION_TYPE, MEETING } from "../../constants";
import { ActivityEscalation } from "./ActivityEscalation";

export class Activity extends Model {
  public id!: number
  public meetingId!: number
  public userId!: number
  public activityType!: string
  public activityDuration!: number
  public seekInTime!: number
  public lastEscalationType!: ESCALATION_TYPE

  // sequelize association functions
  public activityEscalations!: ActivityEscalation[]
  public setActivityEscalations!: Function

  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  static load (sequelize: Sequelize) {
    this.init({
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      meetingId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      activityType: {
        type: DataTypes.STRING,
        allowNull: false
      },
      activityDuration: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      seekinTime: {
        type: DataTypes.FLOAT,
        allowNull: false
      },
      lastEscalationType: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: ESCALATION_TYPE.INITIAL
      }
    }, {
      sequelize,
      modelName: 'Activity'
    })
  }
  static associate(models: any) {
    this.belongsTo(models.Meeting, {
      foreignKey: 'meetingId',
      as: MEETING
    })
    this.hasMany(models.ActivityEscalation, {
      foreignKey: 'activityId',
      as: ACTIVITY_ESCALATIONS
    })
  }
}


