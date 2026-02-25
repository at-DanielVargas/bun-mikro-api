// src/decorators/schema/Unique.ts

import { MetadataStore } from '../../core/MetadataStore';

/**
 * Marks a column as unique.
 */
export function Unique(): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    const field = String(propertyKey);
    const existing = MetadataStore.getColumns(target.constructor).get(field) ?? {
      name: field,
      type: 'TEXT',
      nullable: true,
      unique: false,
      primary: false,
    };
    MetadataStore.setColumn(target.constructor, field, { ...existing, unique: true });
  };
}
