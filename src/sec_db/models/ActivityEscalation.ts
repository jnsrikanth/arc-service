import { Model, DATE, INTEGER, STRING, Sequelize, TEXT } from 'sequelize'
import { ACTIVITIES, ESCALATION_TYPE, MEETING } from "../../constants";

export class ActivityEscalation extends Model {
    public id!: number
    public activityId!: number
    public meetingId!: number
    public escalatedByUserId!: number
    public escalationType!: ESCALATION_TYPE
    public comment!: string

    public readonly createdAt?: Date;
    public readonly updatedAt?: Date;

    static load (sequelize: Sequelize) {
        this.init({
            id: {
                type: INTEGER,
                autoIncrement: true,
                primaryKey: true
            },
            activityId: {
                type: INTEGER,
                allowNull: false,
            },
            meetingId: {
                type: INTEGER,
                allowNull: false,
            },
            escalatedByUserId: {
                type: INTEGER,
                allowNull: false
            },
            escalationType: {
                type: STRING,
                allowNull: false
            },
            comment: {
                type: TEXT,
            },
        }, {
            sequelize,
            modelName: 'ActivityEscalation'
        })
    }
    static associate(models: any) {
        this.belongsTo(models.Activity, {
            foreignKey: 'activityId',
            as: ACTIVITIES
        })
    }
}


