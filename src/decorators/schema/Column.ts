// src/decorators/schema/Column.ts

import { MetadataStore } from '../../core/MetadataStore';

export interface ColumnOptions {
  type?: string;
  nullable?: boolean;
  unique?: boolean;
  default?: unknown;
  name?: string;
}

/**
 * Marks a property as a database column.
 *
 * @example
 * @Column({ type: 'VARCHAR(255)', nullable: false })
 * name!: string;
 */
export function Column(options: ColumnOptions = {}): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    const field = String(propertyKey);
    MetadataStore.setColumn(target.constructor, field, {
      name: options.name ?? field,
      type: options.type ?? 'TEXT',
      nullable: options.nullable ?? true,
      unique: options.unique ?? false,
      primary: false,
      default: options.default,
    });
  };
}
