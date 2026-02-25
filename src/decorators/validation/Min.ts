// src/decorators/validation/Min.ts

import { MetadataStore } from '../../core/MetadataStore';

export function Min(min: number, message = ':field must be at least :min'): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    MetadataStore.addValidationRule(target.constructor, String(propertyKey), {
      type: 'min',
      message,
      min,
    });
  };
}
