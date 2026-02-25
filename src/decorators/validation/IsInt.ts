// src/decorators/validation/IsInt.ts

import { MetadataStore } from '../../core/MetadataStore';

export function IsInt(message = ':field must be an integer'): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    MetadataStore.addValidationRule(target.constructor, String(propertyKey), {
      type: 'isInt',
      message,
    });
  };
}
