// src/database/D1Driver.ts
// Cloudflare D1 driver (SQLite-compatible, serverless)

import type { DatabaseDriver, ExecuteResult } from './DatabaseDriver';

/**
 * Cloudflare D1 driver.
 * Pass the D1Database binding from your Worker's env.
 *
 * @example
 * const db = new D1Driver(env.DB);
 */
export class D1Driver implements DatabaseDriver {
  constructor(private readonly d1: D1Database) {}

  getDialect(): 'sqlite' {
    return 'sqlite';
  }

  async execute(sql: string, params: unknown[] = []): Promise<ExecuteResult> {
    const stmt = this.d1.prepare(sql).bind(...params);
    const result = await stmt.run();
    return {
      lastInsertId: (result.meta.last_row_id as number) ?? 0,
      changes: result.meta.changes ?? 0,
    };
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const stmt = this.d1.prepare(sql).bind(...params);
    const result = await stmt.all<T>();
    return result.results ?? [];
  }

  async queryOne<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
    const stmt = this.d1.prepare(sql).bind(...params);
    return (await stmt.first<T>()) ?? null;
  }
}
