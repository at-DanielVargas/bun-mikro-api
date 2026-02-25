// src/decorators/schema/ForeignKey.ts

import { MetadataStore } from '../../core/MetadataStore';

/**
 * Defines a foreign key constraint on a column.
 *
 * @example
 * @ForeignKey('users', 'id', 'CASCADE')
 * user_id!: number;
 */
export function ForeignKey(table: string, column: string, onDelete = 'RESTRICT'): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    const field = String(propertyKey);
    const existing = MetadataStore.getColumns(target.constructor).get(field) ?? {
      name: field,
      type: 'INTEGER',
      nullable: false,
      unique: false,
      primary: false,
    };
    MetadataStore.setColumn(target.constructor, field, {
      ...existing,
      foreignKey: { table, column, onDelete },
    });
  };
}
