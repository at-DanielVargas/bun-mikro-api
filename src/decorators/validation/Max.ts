// src/decorators/validation/Max.ts

import { MetadataStore } from '../../core/MetadataStore';

export function Max(max: number, message = ':field must be at most :max'): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    MetadataStore.addValidationRule(target.constructor, String(propertyKey), {
      type: 'max',
      message,
      max,
    });
  };
}
