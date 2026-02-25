// src/schema/Migration.ts

import { MetadataStore } from '../core/MetadataStore';
import type { DatabaseDriver } from '../database/DatabaseDriver';
import { SchemaBuilder } from './SchemaBuilder';

/**
 * Base class for database migrations.
 *
 * ## Decorator-based (recommended)
 *
 * Apply @Table, @Column, @PrimaryKey, @Timestamps, @SoftDeletes directly on the
 * migration class. The default up()/down() implementations read those decorators
 * and generate the appropriate CREATE TABLE or ALTER TABLE SQL automatically.
 *
 * @example
 * \@Table('users')
 * \@Timestamps()
 * export class CreateUsersTable extends Migration {
 *   \@PrimaryKey()
 *   id!: number;
 *
 *   \@Column({ type: 'TEXT', nullable: false })
 *   email!: string;
 * }
 *
 * ## Raw SQL (override up/down manually)
 *
 * @example
 * export class AddIndexToUsers extends Migration {
 *   async up(db: DatabaseDriver) {
 *     await db.execute('CREATE INDEX idx_users_email ON `users` (`email`)');
 *   }
 *   async down(db: DatabaseDriver) {
 *     await db.execute('DROP INDEX IF EXISTS idx_users_email');
 *   }
 * }
 */
export class Migration {
  /**
   * Applies this migration.
   *
   * Default behaviour (requires @Table decorator on the subclass):
   * - If the table does not yet exist → CREATE TABLE
   * - If the table already exists     → ALTER TABLE ADD COLUMN for any missing columns
   *
   * Override this method to run arbitrary SQL instead.
   */
  async up(db: DatabaseDriver): Promise<void> {
    const tableMeta = MetadataStore.getTable(this.constructor);
    if (!tableMeta?.name) {
      throw new Error(
        `${this.constructor.name}.up(): no @Table decorator found. ` +
        `Either add @Table('table_name') to the class or override up() with custom SQL.`,
      );
    }

    const schema = new SchemaBuilder(db);

    if (await schema.tableExists(tableMeta.name)) {
      const statements = await schema.buildAlterTable(this.constructor);
      for (const sql of statements) {
        await db.execute(sql);
      }
    } else {
      const sql = schema.buildCreateTable(this.constructor);
      if (sql) await db.execute(sql);
    }
  }

  /**
   * Reverts this migration.
   *
   * Default behaviour (requires @Table decorator on the subclass):
   * - Drops the table (DROP TABLE IF EXISTS)
   *
   * Override this method to run arbitrary SQL instead.
   */
  async down(db: DatabaseDriver): Promise<void> {
    const tableMeta = MetadataStore.getTable(this.constructor);
    if (!tableMeta?.name) {
      throw new Error(
        `${this.constructor.name}.down(): no @Table decorator found. ` +
        `Either add @Table('table_name') to the class or override down() with custom SQL.`,
      );
    }

    const dialect = db.getDialect();
    const q = (id: string) => dialect === 'postgres' ? `"${id}"` : `\`${id}\``;
    await db.execute(`DROP TABLE IF EXISTS ${q(tableMeta.name)}`);
  }
}
