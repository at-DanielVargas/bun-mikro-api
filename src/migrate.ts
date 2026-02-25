// src/migrate.ts
// Sub-path barrel for migration CLI tools (Bun / Node.js runtime only).
//
// Import as:  import { MigrationRunner } from 'mikro-api/migrate';
//
// Do NOT import this in Cloudflare Worker code — it uses node:fs, node:path,
// node:child_process and other Node.js built-ins unavailable in the Workers runtime.

export { MigrationRunner }   from './migrations/MigrationRunner';
export { D1WranglerDriver }  from './database/D1WranglerDriver';
export type { D1WranglerOptions } from './database/D1WranglerDriver';

// Re-export the shared pieces consumers need when writing migration files
export { Migration }         from './schema/Migration';
export type { DatabaseDriver, ExecuteResult } from './database/DatabaseDriver';
export { SqliteDriver }      from './database/SqliteDriver';
export { PostgresDriver }    from './database/PostgresDriver';
