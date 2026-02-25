// src/service/BaseService.ts

import { ServiceException } from '../core/errors';

/**
 * Base class for business-logic services.
 * Use helper methods to throw typed HTTP errors.
 *
 * @example
 * class UserService extends BaseService {
 *   constructor(private users: UserRepository) { super(); }
 *
 *   async getUser(id: number) {
 *     const user = await this.users.findById(id);
 *     if (!user) this.notFound('User not found');
 *     return user;
 *   }
 * }
 */
export abstract class BaseService {
  protected fail(message: string, statusCode = 400): never {
    throw new ServiceException(message, statusCode);
  }

  protected notFound(message = 'Resource not found'): never {
    this.fail(message, 404);
  }

  protected unauthorized(message = 'Unauthorized'): never {
    this.fail(message, 401);
  }

  protected forbidden(message = 'Forbidden'): never {
    this.fail(message, 403);
  }

  protected conflict(message = 'Conflict'): never {
    this.fail(message, 409);
  }
}
