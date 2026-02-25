// src/database/DatabaseDriver.ts

export interface ExecuteResult {
  lastInsertId: number;
  changes: number;
}

/**
 * Dialect-aware database driver interface.
 * SQLite (D1 + Bun): placeholders `?`, identifiers `\`table\``
 * Postgres:          placeholders `$1, $2`, identifiers `"table"`
 */
export interface DatabaseDriver {
  execute(sql: string, params?: unknown[]): Promise<ExecuteResult>;
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  queryOne<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null>;
  getDialect(): 'sqlite' | 'postgres';
}
