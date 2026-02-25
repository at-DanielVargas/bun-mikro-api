// src/decorators/validation/MaxLength.ts

import { MetadataStore } from '../../core/MetadataStore';

export function MaxLength(max: number, message = ':field must be at most :max characters'): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    MetadataStore.addValidationRule(target.constructor, String(propertyKey), {
      type: 'maxLength',
      message,
      max,
    });
  };
}
