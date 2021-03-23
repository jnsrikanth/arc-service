import crypto from 'crypto'

const genRandomString = (length: number) => {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString('hex') /** convert to hexadecimal format */
    .slice(0, length) /** return required number of characters */
}

export const sha256 = (password: string, salt: string) => {
  const hash = crypto.createHmac('sha256', salt) /** Hashing algorithm sha256 */
  hash.update(password)
  const value = hash.digest('hex')
  return {
    salt: salt,
    hash: value
  }
}

export const saltHashPassword = (password: string) => {
  const salt = genRandomString(16) /** Gives us salt of length 16 */
  return sha256(password, salt)
}

export const generateRandomNumber = function (len = 5) {
  let text = ''
  const possible = '0123456789'
  for (var i = 0; i < len; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}