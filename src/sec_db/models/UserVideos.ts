import { Sequelize } from "sequelize/types";

import { DataTypes, Model } from 'sequelize'
import { USER, USER_ACTIVITIES } from "../../constants";

export class UserVideos extends Model {
    public id!: string
    public userId!: number
    public videoStartTime!: Date;
    public videoDuration!: number;
    public videoProccessedPath!: string;
    public status!: string;
    public statusTimeline!: string;

    public readonly createdAt?: Date;
    public readonly updatedAt?: Date;

    static load (sequelize: Sequelize) {
        this.init({
            id: {
                type: DataTypes.STRING,
                allowNull: false,
                primaryKey: true
            },
            userId: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            videoStartTime: {
                type: DataTypes.DATE,
            },
            videoDuration: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            videoProccessedPath: {
                type: DataTypes.STRING,
            },
            meetingId: {
                type: DataTypes.INTEGER,
            },
            status: {
                type: DataTypes.STRING,
                allowNull: false
            },
            statusTimeline: {
                type: DataTypes.TEXT
            }
        }, {
            sequelize,
            modelName: 'UserVideos'
        })
    }
    static associate(models: any) {
        this.belongsTo(models.User, {
            foreignKey: 'userId',
            as: USER
        })
        this.hasMany(models.UserActivity, {
            foreignKey: 'videoId',
            as: USER_ACTIVITIES
        })
    }
}
