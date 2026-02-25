// src/decorators/schema/BelongsToMany.ts

import { MetadataStore } from '../../core/MetadataStore';

export interface BelongsToManyOptions {
  pivotTable: string;
  foreignKey: string;
  relatedKey: string;
  localKey?: string;
  relatedPk?: string;
  pivotColumns?: string[];
  as?: string;
}

/**
 * Defines a many-to-many relationship via a pivot table.
 *
 * @example
 * @BelongsToMany(() => RoleRepository, {
 *   pivotTable: 'user_roles',
 *   foreignKey: 'user_id',
 *   relatedKey: 'role_id',
 * })
 * roles!: Role[];
 */
export function BelongsToMany(
  repositoryFn: () => new () => unknown,
  options: BelongsToManyOptions,
): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    MetadataStore.setRelation(target.constructor, String(propertyKey), {
      type: 'belongsToMany',
      repository: repositoryFn(),
      foreignKey: options.foreignKey,
      localKey: options.localKey,
      pivotTable: options.pivotTable,
      relatedKey: options.relatedKey,
      relatedPk: options.relatedPk,
      pivotColumns: options.pivotColumns,
      as: options.as,
    });
  };
}
