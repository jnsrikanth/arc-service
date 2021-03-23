import { Sequelize } from "sequelize/types";
import { Model, INTEGER, DATE, STRING } from 'sequelize'
import { JwtTokenStatus } from "../../constants";


export class JwtInfo extends Model {
  public id!: number
  public expiryDate!: Date
  public status!: JwtTokenStatus

  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  static load(sequelize: Sequelize) {
    this.init({
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      expiryDate: {
        type: DATE
      },
      status: {
        type: STRING,
        defaultValue: JwtTokenStatus.INITIAL
      },
    }, {
      sequelize,
      modelName: 'JwtInfo'
    })
  }
  static associate(models: any) {
  }
}

