import { Model, DATE, INTEGER, STRING, Sequelize } from 'sequelize'
import { ORGANIZATION, USER, USER_STATUS, USER_TYPE } from '../../constants';
import { Organization } from './Organization';

export class User extends Model {
    public id!: number
    public name!: string;
    public email!: string;
    public userCode!: string
    public userType!: USER_TYPE
    public location!: string
    public organizationId!: number
    public status!: USER_STATUS
    public expiryDate!: Date
    public lastLogin!: Date

    public organization!: Organization

    public readonly createdAt?: Date;
    public readonly updatedAt?: Date;

    static load(sequelize: Sequelize) {
        this.init({
            id: {
                type: INTEGER,
                autoIncrement: true,
                primaryKey: true
            },
            name: {
                type: STRING,
                allowNull: false
            },
            email: {
                type: STRING,
                allowNull: false,
            },
            userCode: {
                type: STRING
            },
            userType: {
                type: STRING
            },
            location: {
                type: STRING
            },
            status: {
                type: STRING,
                defaultValue: USER_STATUS.ACTIVE
            },
            expiryDate: {
                type: DATE
            },
            lastLogin: {
                type: DATE
            },
        }, {
            sequelize,
            modelName: 'User'
        })
    }
    static associate (models: any) {
        this.belongsTo(models.Organization, {
            foreignKey: 'organizationId',
            as: ORGANIZATION
        })
        this.belongsToMany(models.Meeting, {
            through: {
              model: models.MeetingUser,
            },
            foreignKey: 'userId',
            otherKey: 'meetingId',
            as: USER
        })
    }
}