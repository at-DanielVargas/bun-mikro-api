// src/decorators/validation/IsArray.ts

import { MetadataStore } from '../../core/MetadataStore';

export function IsArray(message = ':field must be an array'): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    MetadataStore.addValidationRule(target.constructor, String(propertyKey), {
      type: 'isArray',
      message,
    });
  };
}
