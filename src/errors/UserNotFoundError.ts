import { StatusCodes } from 'http-status-codes'
import { format } from 'util'
import CommonError from './CommonError'
class UserNotFoundError extends CommonError {
  constructor(userId: number) {
    super(format('user with userId: %d not found', userId), StatusCodes.NOT_FOUND)
  }
}
export default UserNotFoundError