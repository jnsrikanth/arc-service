import { Sequelize } from "sequelize/types";
import { INTEGER, Model } from 'sequelize'
import { MEETING, USER } from "../../constants";


export class MeetingUser extends Model {
    public id!: number
    public userId!: string
    public meetingId!: number;

    public readonly createdAt?: Date;
    public readonly updatedAt?: Date;
    static load(sequelize: Sequelize) {
        this.init({
            id: { type: INTEGER, autoIncrement: true, primaryKey: true },
        }, {
            sequelize,
            modelName: 'MeetingUser'
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
    }
}

