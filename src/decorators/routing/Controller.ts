// src/decorators/routing/Controller.ts

import { MetadataStore } from '../../core/MetadataStore';

/**
 * Marks a class as a route controller with an optional path prefix.
 *
 * @example
 * @Controller('users')
 * class UserController { ... }
 */
export function Controller(prefix = ''): ClassDecorator {
  return (target: Function) => {
    MetadataStore.setController(target, { prefix: prefix.replace(/^\/+|\/+$/g, '') });
  };
}
