// src/schema/SchemaBuilder.ts
// Reads MetadataStore and generates CREATE TABLE / ALTER TABLE SQL.

import { MetadataStore, type ColumnMeta } from '../core/MetadataStore';
import type { DatabaseDriver } from '../database/DatabaseDriver';

export class SchemaBuilder {
  constructor(private readonly db: DatabaseDriver) {}

  private q(id: string): string {
    return this.db.getDialect() === 'postgres' ? `"${id}"` : `\`${id}\``;
  }

  /**
   * Generate and execute CREATE TABLE IF NOT EXISTS for the given entity class.
   */
  async createTable(EntityClass: Function): Promise<void> {
    const sql = this.buildCreateTable(EntityClass);
    if (sql) await this.db.execute(sql);
  }

  /**
   * Returns true if the given table already exists in the database.
   */
  async tableExists(tableName: string): Promise<boolean> {
    if (this.db.getDialect() === 'postgres') {
      const row = await this.db.queryOne<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ?`,
        [tableName],
      );
      return row !== null;
    }
    const row = await this.db.queryOne<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
      [tableName],
    );
    return row !== null;
  }

  /**
   * Generate ALTER TABLE ADD COLUMN statements for columns that exist in the
   * entity metadata but are not yet present in the actual table.
   * Returns an array of SQL statements (one per missing column).
   */
  async buildAlterTable(EntityClass: Function): Promise<string[]> {
    const tableMeta = MetadataStore.getTable(EntityClass);
    if (!tableMeta?.name) return [];

    const dialect = this.db.getDialect();
    const tbl = this.q(tableMeta.name);

    // Collect existing column names from the database
    const existingColumns = new Set<string>();
    if (dialect === 'postgres') {
      const rows = await this.db.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ?`,
        [tableMeta.name],
      );
      for (const row of rows) existingColumns.add(row.column_name);
    } else {
      // SQLite: PRAGMA takes an identifier, not a bind parameter
      const rows = await this.db.query<{ name: string }>(
        `PRAGMA table_info(${tbl})`,
      );
      for (const row of rows) existingColumns.add(row.name);
    }

    const statements: string[] = [];

    // Decorated @Column / @PrimaryKey properties
    for (const [, col] of MetadataStore.getColumns(EntityClass)) {
      if (!existingColumns.has(col.name)) {
        statements.push(
          `ALTER TABLE ${tbl} ADD COLUMN ${this.buildColumnDef(col, dialect)}`,
        );
      }
    }

    // @Timestamps columns
    if (tableMeta.timestamps) {
      if (!existingColumns.has('created_at')) {
        const def = dialect === 'postgres'
          ? `${this.q('created_at')} TIMESTAMPTZ DEFAULT NOW()`
          : `${this.q('created_at')} TEXT DEFAULT CURRENT_TIMESTAMP`;
        statements.push(`ALTER TABLE ${tbl} ADD COLUMN ${def}`);
      }
      if (!existingColumns.has('updated_at')) {
        const def = dialect === 'postgres'
          ? `${this.q('updated_at')} TIMESTAMPTZ DEFAULT NOW()`
          : `${this.q('updated_at')} TEXT DEFAULT CURRENT_TIMESTAMP`;
        statements.push(`ALTER TABLE ${tbl} ADD COLUMN ${def}`);
      }
    }

    // @SoftDeletes column
    if (tableMeta.softDeletes) {
      if (!existingColumns.has('deleted_at')) {
        const def = dialect === 'postgres'
          ? `${this.q('deleted_at')} TIMESTAMPTZ`
          : `${this.q('deleted_at')} TEXT`;
        statements.push(`ALTER TABLE ${tbl} ADD COLUMN ${def}`);
      }
    }

    return statements;
  }

  /**
   * Generate CREATE TABLE SQL without executing it.
   */
  buildCreateTable(EntityClass: Function): string | null {
    const tableMeta = MetadataStore.getTable(EntityClass);
    if (!tableMeta?.name) return null;

    const columns = MetadataStore.getColumns(EntityClass);
    const dialect = this.db.getDialect();
    const parts: string[] = [];
    const foreignKeys: string[] = [];

    for (const [, col] of columns) {
      parts.push(this.buildColumnDef(col, dialect));
      if (col.foreignKey) {
        foreignKeys.push(
          `FOREIGN KEY (${this.q(col.name)}) REFERENCES ${this.q(col.foreignKey.table)}(${this.q(col.foreignKey.column)}) ON DELETE ${col.foreignKey.onDelete ?? 'RESTRICT'}`,
        );
      }
    }

    if (tableMeta.timestamps) {
      if (dialect === 'postgres') {
        parts.push(`${this.q('created_at')} TIMESTAMPTZ DEFAULT NOW()`);
        parts.push(`${this.q('updated_at')} TIMESTAMPTZ DEFAULT NOW()`);
      } else {
        parts.push(`${this.q('created_at')} TEXT DEFAULT CURRENT_TIMESTAMP`);
        parts.push(`${this.q('updated_at')} TEXT DEFAULT CURRENT_TIMESTAMP`);
      }
    }

    if (tableMeta.softDeletes) {
      parts.push(dialect === 'postgres'
        ? `${this.q('deleted_at')} TIMESTAMPTZ`
        : `${this.q('deleted_at')} TEXT`,
      );
    }

    parts.push(...foreignKeys);

    return `CREATE TABLE IF NOT EXISTS ${this.q(tableMeta.name)} (\n  ${parts.join(',\n  ')}\n)`;
  }

  private buildColumnDef(col: ColumnMeta, dialect: 'sqlite' | 'postgres'): string {
    let def = `${this.q(col.name)} `;

    if (col.primary && dialect === 'sqlite') {
      def += `${col.type} PRIMARY KEY AUTOINCREMENT`;
      return def;
    }
    if (col.primary && dialect === 'postgres') {
      def += `SERIAL PRIMARY KEY`;
      return def;
    }

    def += col.type;
    if (!col.nullable) def += ' NOT NULL';
    if (col.unique) def += ' UNIQUE';
    if (col.default !== undefined) {
      const d = typeof col.default === 'string' ? `'${col.default}'` : String(col.default);
      def += ` DEFAULT ${d}`;
    }

    return def;
  }
}
