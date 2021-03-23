import fs from 'fs'
import jwt from 'jsonwebtoken'
import { format } from 'util'

const PRIVATE_KEY = fs.readFileSync(`${__dirname}/private.key`, 'utf8')
const PUBLIC_KEY = fs.readFileSync(`${__dirname}/public.key`, 'utf8')

const RS256 = 'RS256'

export const createJwtToken = async (payload: any, expiresIn: (string | number)) => {
    try {
      return await jwt.sign(payload, PRIVATE_KEY, {
        expiresIn,
        algorithm: RS256
      })
    } catch (ex) {
      ex.message = format('TAG unable to generate jwt token: %s', ex.message)
      throw ex
    }
  }

export const verifyJwtToken = async (jwtToken: string) => {
    try {
        return await jwt.verify(jwtToken, PUBLIC_KEY, {
            algorithms: [RS256]
        })
    } catch (ex) {
        ex.message = format(
            'TAG unable to decode rs256 token or it has expired: %s',
            ex.message
        )
        throw ex
    }
}

export const decodeJwtToken = (jwtToken: string) => {
    return jwt.decode(jwtToken)
}