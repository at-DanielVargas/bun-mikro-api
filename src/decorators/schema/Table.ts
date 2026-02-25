// src/decorators/schema/Table.ts

import { MetadataStore } from '../../core/MetadataStore';

/**
 * Marks a class as a database table entity.
 *
 * @example
 * @Table('users')
 * class User { ... }
 */
export function Table(name: string): ClassDecorator {
  return (target: Function) => {
    const existing = MetadataStore.getTable(target);
    MetadataStore.setTable(target, {
      name,
      timestamps: existing?.timestamps ?? false,
      softDeletes: existing?.softDeletes ?? false,
    });
  };
}
