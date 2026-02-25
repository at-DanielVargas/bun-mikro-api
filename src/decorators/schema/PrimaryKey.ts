// src/decorators/schema/PrimaryKey.ts

import { MetadataStore } from '../../core/MetadataStore';

/**
 * Marks a property as the primary key column.
 *
 * @example
 * @PrimaryKey()
 * id!: number;
 */
export function PrimaryKey(type = 'INTEGER'): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    const field = String(propertyKey);
    MetadataStore.setColumn(target.constructor, field, {
      name: field,
      type,
      nullable: false,
      unique: true,
      primary: true,
    });
  };
}
