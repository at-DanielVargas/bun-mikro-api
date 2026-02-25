// src/decorators/validation/IsBool.ts

import { MetadataStore } from '../../core/MetadataStore';

export function IsBool(message = ':field must be a boolean'): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    MetadataStore.addValidationRule(target.constructor, String(propertyKey), {
      type: 'isBool',
      message,
    });
  };
}
