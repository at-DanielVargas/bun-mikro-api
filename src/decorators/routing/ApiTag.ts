// src/decorators/routing/ApiTag.ts

import { MetadataStore, type ApiTagMeta } from '../../core/MetadataStore';

/**
 * Groups a controller under a named tag in the Swagger UI.
 * If omitted, the tag is inferred from the class name (UserController → User).
 *
 * @example
 * @Controller('users')
 * @ApiTag({ name: 'Users', description: 'User management endpoints' })
 * class UserController { ... }
 */
export function ApiTag(meta: ApiTagMeta): ClassDecorator {
  return (target: Function) => {
    MetadataStore.setApiTag(target, meta);
  };
}
