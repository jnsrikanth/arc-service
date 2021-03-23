import { Sequelize } from "sequelize/types";
import { INTEGER, Model, DataTypes } from 'sequelize'
import { HOST, MEETINGS, ORGANIZATION_STATUS, USERS } from "../../constants";


export class Organization extends Model {
    public id!: number
    public name!: string
    public email!: string
    public expiryDate!: Date
    public status!: ORGANIZATION_STATUS
    public clearIssues!: boolean

    public readonly createdAt?: Date;
    public readonly updatedAt?: Date;

    static load(sequelize: Sequelize) {
        this.init({
            id: { type: INTEGER, autoIncrement: true, primaryKey: true },
            name: {
                type: DataTypes.STRING
            },
            email: {
                type: DataTypes.STRING
            },
            expiryDate: {
                type: DataTypes.DATE
            },
            status: {
                type: DataTypes.STRING,
                defaultValue: ORGANIZATION_STATUS.ACTIVE
            },
            clearIssues: {
              type: DataTypes.BOOLEAN,
              defaultValue: false
            }
        }, {
            sequelize,
            modelName: 'Organization'
        })
    }
    static associate(models: any) {
        this.hasMany(models.User, {
            foreignKey: 'organizationId',
            as: USERS
        })
        this.hasMany(models.Meeting, {
            foreignKey: 'organizationId',
            as: MEETINGS
        })
    }
}

