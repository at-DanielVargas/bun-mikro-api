// src/decorators/validation/IsEmail.ts

import { MetadataStore } from '../../core/MetadataStore';

export function IsEmail(message = ':field must be a valid email'): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    MetadataStore.addValidationRule(target.constructor, String(propertyKey), {
      type: 'isEmail',
      message,
    });
  };
}
