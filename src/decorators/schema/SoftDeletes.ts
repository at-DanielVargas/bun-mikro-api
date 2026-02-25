// src/decorators/schema/SoftDeletes.ts

import { MetadataStore } from '../../core/MetadataStore';

/**
 * Adds a `deleted_at` column that enables soft-delete behaviour.
 *
 * @example
 * @Table('posts')
 * @SoftDeletes()
 * class Post { ... }
 */
export function SoftDeletes(): ClassDecorator {
  return (target: Function) => {
    const existing = MetadataStore.getTable(target);
    MetadataStore.setTable(target, {
      name: existing?.name ?? '',
      timestamps: existing?.timestamps ?? false,
      softDeletes: true,
    });
  };
}
