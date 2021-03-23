import { Sequelize } from "sequelize/types";

import { Model, INTEGER, DATE } from 'sequelize'
import { USER } from "../../constants";

export enum USER_ACTIVITY_STATUS {
    "REPORTED" = "REPORTED",
    "IGNORED" = "IGNORED"
}

export class UserLog extends Model {
    public id!: string
    public userId!: string
    public loginTime!: Date
    public logoutTime!: Date
    public activityCount!: number

    public readonly createdAt?: Date;
    public readonly updatedAt?: Date;

    static load (sequelize: Sequelize) {
        this.init({
            id: {
                type: INTEGER,
                autoIncrement:true,
                primaryKey: true
            },
            userId: {
                type: INTEGER,
                allowNull: false
            },
            loginTime: {
                type: DATE,
                allowNull: false
            },
            logoutTime: {
                type: DATE,
            },
            activityCount: {
                type: INTEGER,
                defaultValue: 0
            },
        }, {
            sequelize,
            modelName: 'UserLog'
        })
    }
    static associate (models: any) {
        this.belongsTo(models.User, {
            foreignKey: 'userId',
            as: USER
        })
    }
}


