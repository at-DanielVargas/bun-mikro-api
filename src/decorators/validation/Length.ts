// src/decorators/validation/Length.ts

import { MetadataStore } from '../../core/MetadataStore';

export function Length(min: number, max: number, message = ':field must be between :min and :max characters'): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    MetadataStore.addValidationRule(target.constructor, String(propertyKey), {
      type: 'length',
      message,
      min,
      max,
    });
  };
}
