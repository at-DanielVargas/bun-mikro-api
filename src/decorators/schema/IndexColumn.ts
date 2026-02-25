// src/decorators/schema/IndexColumn.ts

import { MetadataStore } from '../../core/MetadataStore';

/**
 * Marks a column as indexed.
 */
export function Index(): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    const field = String(propertyKey);
    const existing = MetadataStore.getColumns(target.constructor).get(field) ?? {
      name: field,
      type: 'TEXT',
      nullable: true,
      unique: false,
      primary: false,
    };
    (existing as unknown as Record<string, unknown>)['index'] = true;
    MetadataStore.setColumn(target.constructor, field, existing);
  };
}
