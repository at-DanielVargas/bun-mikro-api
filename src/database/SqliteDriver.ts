// src/database/SqliteDriver.ts
// bun:sqlite driver for local development and testing.

import type { DatabaseDriver, ExecuteResult } from './DatabaseDriver';

/**
 * Minimal interface matching bun:sqlite Database.
 * Imported as a type so the module can be bundled without bun:sqlite available.
 */
export interface BunSqliteDatabase {
  query(sql: string): {
    all(...params: unknown[]): (Record<string, unknown> | undefined)[];
    get(...params: unknown[]): Record<string, unknown> | null | undefined;
    run(...params: unknown[]): { lastInsertRowid: number | bigint; changes: number };
  };
}

/**
 * Bun SQLite driver for local development and tests.
 *
 * @example
 * import { Database } from 'bun:sqlite';
 * const db = new SqliteDriver(new Database(':memory:'));
 */
export class SqliteDriver implements DatabaseDriver {
  constructor(private readonly db: BunSqliteDatabase) {}

  getDialect(): 'sqlite' {
    return 'sqlite';
  }

  async execute(sql: string, params: unknown[] = []): Promise<ExecuteResult> {
    const result = this.db.query(sql).run(...params);
    return {
      lastInsertId: Number(result.lastInsertRowid),
      changes: result.changes,
    };
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.db.query(sql).all(...params).filter(Boolean) as T[];
  }

  async queryOne<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
    return (this.db.query(sql).get(...params) as T) ?? null;
  }
}
