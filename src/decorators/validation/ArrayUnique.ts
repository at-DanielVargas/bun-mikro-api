// src/decorators/validation/ArrayUnique.ts

import { MetadataStore } from '../../core/MetadataStore';

export function ArrayUnique(message = ':field must contain unique values'): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    MetadataStore.addValidationRule(target.constructor, String(propertyKey), {
      type: 'arrayUnique',
      message,
    });
  };
}
