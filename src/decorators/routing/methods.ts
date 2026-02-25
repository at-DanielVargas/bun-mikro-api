// src/decorators/routing/methods.ts

import { Route } from './Route';

/** @example @Get('users/:id') */
export const Get    = (path = ''): MethodDecorator => Route('GET',    path);
export const Post   = (path = ''): MethodDecorator => Route('POST',   path);
export const Put    = (path = ''): MethodDecorator => Route('PUT',    path);
export const Patch  = (path = ''): MethodDecorator => Route('PATCH',  path);
export const Delete = (path = ''): MethodDecorator => Route('DELETE', path);
