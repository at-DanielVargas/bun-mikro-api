// src/decorators/validation/Matches.ts

import { MetadataStore } from '../../core/MetadataStore';

export function Matches(pattern: RegExp, message = ':field has an invalid format'): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    MetadataStore.addValidationRule(target.constructor, String(propertyKey), {
      type: 'matches',
      message,
      pattern: pattern.source,
      flags: pattern.flags,
    });
  };
}
