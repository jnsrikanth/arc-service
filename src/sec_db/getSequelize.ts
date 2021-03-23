import { config } from "process";
import { CONFIG } from "../config/config";

import { Sequelize } from 'sequelize'

export const getSequelize = () => {
    console.log(CONFIG)
    if (CONFIG.DB_ENV == 'prod') {
        return new Sequelize(CONFIG.DB_NAME || '', CONFIG.DB_USER || '', CONFIG.DB_PASS, {
            host: CONFIG.DB_HOST,
            port: +(CONFIG.DB_PORT || 0),
            logging: console.log,
            dialect: 'mysql',
            pool: { max: 5, idle: 30 },
        })
    } else {
     
        return new Sequelize({
            dialect: 'sqlite',
            storage: './database.sqlite'
        })
    }
}