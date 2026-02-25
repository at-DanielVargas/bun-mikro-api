// src/decorators/schema/BelongsTo.ts

import { MetadataStore } from '../../core/MetadataStore';

export interface BelongsToOptions {
  foreignKey: string;
  ownerKey?: string;
  as?: string;
}

/**
 * Defines an inverse one-to-one / many-to-one relationship.
 *
 * @example
 * @BelongsTo(() => UserRepository, { foreignKey: 'user_id' })
 * user!: User;
 */
export function BelongsTo(
  repositoryFn: () => new () => unknown,
  options: BelongsToOptions,
): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    MetadataStore.setRelation(target.constructor, String(propertyKey), {
      type: 'belongsTo',
      repository: repositoryFn(),
      foreignKey: options.foreignKey,
      ownerKey: options.ownerKey,
      as: options.as,
    });
  };
}
