// src/decorators/routing/ApiDoc.ts

import { MetadataStore, type ApiDocMeta } from '../../core/MetadataStore';

/**
 * Enriches the OpenAPI documentation for a specific route method.
 * All fields are optional — if omitted, they are inferred automatically
 * from the method name, guards, and DTO.
 *
 * @example
 * @Post()
 * @Body(CreateUserDto)
 * @ApiDoc({
 *   summary: 'Create user',
 *   description: 'Creates a new user in the system',
 *   responses: { 201: 'User created', 409: 'Email already taken', 422: 'Validation error' },
 * })
 * create(req: MikroRequest) { ... }
 */
export function ApiDoc(meta: ApiDocMeta): MethodDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    MetadataStore.setApiDoc(target.constructor, String(propertyKey), meta);
  };
}
