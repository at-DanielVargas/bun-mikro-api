// src/database/PostgresDriver.ts
// Postgres driver for use with Hyperdrive or a direct postgres.js connection.

import type { DatabaseDriver, ExecuteResult } from './DatabaseDriver';

/**
 * Minimal interface that postgres.js and pg-compatible clients expose.
 * You can pass a postgres.js `sql` tagged-template client or a similar object.
 */
export interface PostgresClient {
  query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number }>;
}

/**
 * Postgres driver.
 * Converts `?` placeholders to `$1, $2, ...` before executing.
 *
 * @example
 * import postgres from 'postgres';
 * const sql = postgres(env.DATABASE_URL);
 * const db = new PostgresDriver({ query: (s, p) => sql.unsafe(s, p) });
 */
export class PostgresDriver implements DatabaseDriver {
  constructor(private readonly client: PostgresClient) {}

  getDialect(): 'postgres' {
    return 'postgres';
  }

  /** Convert SQLite-style `?` to Postgres `$N` */
  private convertPlaceholders(sql: string): string {
    let i = 0;
    return sql.replace(/\?/g, () => `$${++i}`);
  }

  async execute(sql: string, params: unknown[] = []): Promise<ExecuteResult> {
    const result = await this.client.query(this.convertPlaceholders(sql), params);
    const firstRow = result.rows[0] as Record<string, unknown> | undefined;
    return {
      lastInsertId: (firstRow?.id as number) ?? 0,
      changes: result.rowCount ?? 0,
    };
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = await this.client.query(this.convertPlaceholders(sql), params);
    return result.rows as T[];
  }

  async queryOne<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
    const result = await this.client.query(this.convertPlaceholders(sql), params);
    return (result.rows[0] as T) ?? null;
  }
}
