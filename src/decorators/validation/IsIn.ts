// src/decorators/validation/IsIn.ts

import { MetadataStore } from '../../core/MetadataStore';

export function IsIn(values: unknown[], message = ':field must be one of: :values'): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    MetadataStore.addValidationRule(target.constructor, String(propertyKey), {
      type: 'isIn',
      message,
      values,
    });
  };
}
