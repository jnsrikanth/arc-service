import { format } from "util"
import { Op } from 'sequelize'
import { CommonError } from "../errors/CommonError"
import { User } from "../sec_db/models/User"

export const postUser = async (req: any, res: any, next: Function) => {
    try {
        const { email } = req.body
        const user = await User.findOne({
            where: {
                email
            }
        })
        if(user) {
            throw new CommonError(format('User with email: %s already exist.', email), 400)
        }
        next()
    } catch(ex) {
        next(ex)
    }
}

export const putUser = async (req: any, res: any, next: Function) => {
    try {
        const userId = +req.params.userId
        const { email } = req.body
        const user = await User.findOne({
            where: {
                id: userId
            }
        })
        if(!user) {
            throw new CommonError(format('User with id: %d is not found.', userId), 400)
        }
        if(await User.findOne({
            where: {
                id: {
                    [Op.not]: userId
                },
                email
            }
        })) {
            throw new CommonError(format('User with email: %s already exist.', email), 400)
        }
        req.context.user = user
        next()
    } catch(ex) {
        next(ex)
    }
}

export const deleteUser = async (req: any, res: any, next: Function) => {
    try {
        const userId = +req.params.userId
        const user = await User.findOne({
            where: {
                id: userId
            }
        })
        if(!user) {
            throw new CommonError(format('User with id: %d is not found.', userId), 400)
        }
        req.context.user = user
        next()
    } catch(ex) {
        next(ex)
    }
}