// src/decorators/validation/MinLength.ts

import { MetadataStore } from '../../core/MetadataStore';

export function MinLength(min: number, message = ':field must be at least :min characters'): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    MetadataStore.addValidationRule(target.constructor, String(propertyKey), {
      type: 'minLength',
      message,
      min,
    });
  };
}
