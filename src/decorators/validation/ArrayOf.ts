// src/decorators/validation/ArrayOf.ts

import { MetadataStore } from '../../core/MetadataStore';

export function ArrayOf(type: 'string' | 'int' | 'float' | 'bool', message = ':field must be an array of :type'): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    MetadataStore.addValidationRule(target.constructor, String(propertyKey), {
      type: 'arrayOf',
      message,
      itemType: type,
    });
  };
}
