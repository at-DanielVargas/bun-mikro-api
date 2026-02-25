// src/decorators/schema/HasOne.ts

import { MetadataStore } from '../../core/MetadataStore';

export interface HasOneOptions {
  foreignKey: string;
  localKey?: string;
  as?: string;
}

/**
 * Defines a one-to-one relationship.
 *
 * @example
 * @HasOne(() => ProfileRepository, { foreignKey: 'user_id' })
 * profile!: Profile;
 */
export function HasOne(
  repositoryFn: () => new () => unknown,
  options: HasOneOptions,
): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    MetadataStore.setRelation(target.constructor, String(propertyKey), {
      type: 'hasOne',
      repository: repositoryFn(),
      foreignKey: options.foreignKey,
      localKey: options.localKey,
      as: options.as,
    });
  };
}
