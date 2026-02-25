// src/decorators/routing/Body.ts

import { MetadataStore } from '../../core/MetadataStore';
import type { RequestDto } from '../../validation/RequestDto';

/**
 * Binds a DTO class to a route method for automatic body validation.
 * The validated DTO is available as `req.dto`.
 *
 * @example
 * @Post('users')
 * @Body(CreateUserDto)
 * create(req: MikroRequest) {
 *   const dto = req.dto as CreateUserDto;
 * }
 */
export function Body(DtoClass: new () => RequestDto): MethodDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    MetadataStore.setBody(target.constructor, String(propertyKey), DtoClass);
  };
}
