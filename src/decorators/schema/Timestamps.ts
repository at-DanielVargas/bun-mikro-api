// src/decorators/schema/Timestamps.ts

import { MetadataStore } from '../../core/MetadataStore';

/**
 * Adds `created_at` and `updated_at` timestamp columns to the schema.
 *
 * @example
 * @Table('users')
 * @Timestamps()
 * class User { ... }
 */
export function Timestamps(): ClassDecorator {
  return (target: Function) => {
    const existing = MetadataStore.getTable(target);
    MetadataStore.setTable(target, {
      name: existing?.name ?? '',
      timestamps: true,
      softDeletes: existing?.softDeletes ?? false,
    });
  };
}
