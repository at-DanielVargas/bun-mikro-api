// src/decorators/schema/HasMany.ts

import { MetadataStore } from '../../core/MetadataStore';

export interface HasManyOptions {
  foreignKey: string;
  localKey?: string;
  as?: string;
}

/**
 * Defines a one-to-many relationship.
 *
 * @example
 * @HasMany(() => PostRepository, { foreignKey: 'user_id' })
 * posts!: Post[];
 */
export function HasMany(
  repositoryFn: () => new () => unknown,
  options: HasManyOptions,
): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    MetadataStore.setRelation(target.constructor, String(propertyKey), {
      type: 'hasMany',
      repository: repositoryFn(),
      foreignKey: options.foreignKey,
      localKey: options.localKey,
      as: options.as,
    });
  };
}
