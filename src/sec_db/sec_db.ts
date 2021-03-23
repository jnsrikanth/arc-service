import { Model, DATE, INTEGER, STRING, Sequelize } from 'sequelize'
import { getSequelize } from "./getSequelize"
import models from "./models/"

export class SecDb {
    private static secdb: any

    sequelize: Sequelize

    private constructor() {
        //Private for singleton purpose
        this.sequelize = getSequelize()
        const modelValues = Object.values(models)
        modelValues.forEach(model => model.load(this.sequelize))
        modelValues.forEach(model => model.associate && model.associate(models))
        this.sequelize.sync({
            alter: true
        })
    }

    public static getInstance(): Sequelize {
        if (!SecDb.secdb)
            SecDb.secdb = new SecDb()
        return SecDb.secdb
    }
}