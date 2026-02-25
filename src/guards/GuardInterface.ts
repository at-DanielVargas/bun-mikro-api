// src/guards/GuardInterface.ts

import type { MikroRequest } from '../core/MikroRequest';

export interface GuardInterface<Env = {}> {
  canActivate(req: MikroRequest<Env>): boolean | Promise<boolean>;
  deny(): Response;
}
