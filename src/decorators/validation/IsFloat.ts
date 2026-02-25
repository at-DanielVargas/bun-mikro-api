// src/decorators/validation/IsFloat.ts

import { MetadataStore } from '../../core/MetadataStore';

export function IsFloat(message = ':field must be a number'): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    MetadataStore.addValidationRule(target.constructor, String(propertyKey), {
      type: 'isFloat',
      message,
    });
  };
}
