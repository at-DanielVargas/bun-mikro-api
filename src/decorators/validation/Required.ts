// src/decorators/validation/Required.ts

import { MetadataStore } from '../../core/MetadataStore';

export function Required(message = ':field is required'): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    MetadataStore.addValidationRule(target.constructor, String(propertyKey), {
      type: 'required',
      message,
    });
  };
}
