// src/guards/BaseGuard.ts

import type { MikroRequest } from '../core/MikroRequest';
import type { GuardInterface } from './GuardInterface';

/**
 * Base guard class. Override `canActivate` to implement your logic.
 * `deny()` returns a 401 response by default.
 *
 * @example
 * class AuthGuard extends BaseGuard {
 *   canActivate(req: MikroRequest): boolean {
 *     return req.header('Authorization') !== null;
 *   }
 * }
 */
export abstract class BaseGuard<Env = {}> implements GuardInterface<Env> {
  abstract canActivate(req: MikroRequest<Env>): boolean | Promise<boolean>;

  deny(): Response {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
