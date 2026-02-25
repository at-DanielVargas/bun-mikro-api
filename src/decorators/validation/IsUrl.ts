// src/decorators/validation/IsUrl.ts

import { MetadataStore } from '../../core/MetadataStore';

export function IsUrl(message = ':field must be a valid URL'): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    MetadataStore.addValidationRule(target.constructor, String(propertyKey), {
      type: 'isUrl',
      message,
    });
  };
}
