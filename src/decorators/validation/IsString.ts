// src/decorators/validation/IsString.ts

import { MetadataStore } from '../../core/MetadataStore';

export function IsString(message = ':field must be a string'): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    MetadataStore.addValidationRule(target.constructor, String(propertyKey), {
      type: 'isString',
      message,
    });
  };
}
