// src/decorators/routing/Route.ts

import { MetadataStore } from '../../core/MetadataStore';

/**
 * Registers a method as a route handler.
 *
 * @example
 * @Route('GET', 'profile')
 * getProfile(req: MikroRequest) { ... }
 */
export function Route(method: string, path = ''): MethodDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    MetadataStore.setRoute(
      target.constructor,
      String(propertyKey),
      { method: method.toUpperCase(), path: String(path).replace(/^\/+/, '') },
    );
  };
}
