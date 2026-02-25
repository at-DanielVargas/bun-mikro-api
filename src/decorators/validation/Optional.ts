// src/decorators/validation/Optional.ts

import { MetadataStore } from '../../core/MetadataStore';

/**
 * Marks a DTO field as optional. If the field is absent from the request body,
 * all validation rules on it are skipped.
 */
export function Optional(): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    MetadataStore.setOptional(target.constructor, String(propertyKey));
  };
}
