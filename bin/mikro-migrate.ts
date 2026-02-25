#!/usr/bin/env bun
// bin/mikro-migrate.ts
//
// CLI for running database migrations using MigrationRunner.
//
// Usage:
//   bunx mikro-migrate <command> [options]
//
// Commands:
//   migrate              Run all pending migrations
//   rollback             Revert the last executed migration
//   reset                Revert all executed migrations
//   status               Show which migrations have run / are pending
//   make <name>          Scaffold a new migration file
//
// Options:
//   --migrations=<path>  Migrations directory (default: database/migrations)
//
//   SQLite (local dev):
//     --sqlite=<path>    SQLite database file (default: database/database.sqlite)
//
//   Cloudflare D1 via Wrangler:
//     --d1=<name>        D1 database name (from wrangler.toml)
//     --local            Target local Miniflare DB — default when --d1 is used
//     --remote           Target remote production D1
//     --config=<path>    Path to wrangler.toml (default: auto-detect)
//
//   Postgres:
//     --db=<url>         Postgres connection string
//
// Environment variables:
//   DATABASE_URL         Postgres connection URL
//   SQLITE_PATH          SQLite file path
//   MIGRATIONS_PATH      Migrations directory path

import { writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { MigrationRunner }    from '../src/migrations/MigrationRunner';
import { SqliteDriver }       from '../src/database/SqliteDriver';
import { PostgresDriver }     from '../src/database/PostgresDriver';
import { D1WranglerDriver }   from '../src/database/D1WranglerDriver';
import type { DatabaseDriver } from '../src/database/DatabaseDriver';

// ── Parse CLI arguments ─────────────────────────────────────────────────────

const args    = process.argv.slice(2);
const command = args[0] ?? 'status';

const flags: Record<string, string> = {};
for (let i = 1; i < args.length; i++) {
  const arg = args[i]!;
  if (arg.startsWith('--')) {
    const eqIdx = arg.indexOf('=');
    if (eqIdx !== -1) {
      flags[arg.slice(2, eqIdx)] = arg.slice(eqIdx + 1);
    } else {
      // Boolean flag or next-arg value
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = 'true';
      }
    }
  }
}

const migrationsPath = flags['migrations'] ?? process.env['MIGRATIONS_PATH'] ?? 'database/migrations';
const databaseUrl    = flags['db']         ?? process.env['DATABASE_URL']     ?? '';
const sqlitePath     = flags['sqlite']     ?? process.env['SQLITE_PATH']      ?? 'database/database.sqlite';
const d1Name         = flags['d1']         ?? '';

// ── Database driver factory ─────────────────────────────────────────────────

async function buildDriver(): Promise<DatabaseDriver> {
  // ① Cloudflare D1 via Wrangler CLI
  if (d1Name) {
    return new D1WranglerDriver({
      database:   d1Name,
      remote:     flags['remote'] === 'true',
      local:      flags['remote'] !== 'true',   // default: local
      configPath: flags['config'],
    });
  }

  // ② Postgres
  if (databaseUrl.startsWith('postgres')) {
    // Requires the `postgres` npm package in the consuming project
    const { default: postgres } = await import('postgres') as {
      default: (url: string) => unknown;
    };
    return new PostgresDriver(postgres(databaseUrl));
  }

  // ③ Default: bun:sqlite for local development
  const { Database } = await import('bun:sqlite');
  await MigrationRunner.ensureDir(resolve(sqlitePath, '..'));
  return new SqliteDriver(new Database(sqlitePath));
}

// ── make command ────────────────────────────────────────────────────────────

/**
 * Try to infer a snake_case table name from the migration name.
 *   create_users_table  → users
 *   create_posts        → posts
 *   add_email_to_users  → users
 *   anything_else       → null
 */
function inferTableName(snakeName: string): string | null {
  let m = snakeName.match(/^create_(.+?)(?:_table)?$/);
  if (m) return m[1]!;
  m = snakeName.match(/_to_([a-z0-9_]+)$/);
  if (m) return m[1]!;
  return null;
}

function runMake(name: string): void {
  if (!name) {
    console.error('Usage: mikro-migrate make <migration_name>');
    process.exit(1);
  }

  const dir = resolve(migrationsPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const existingFiles = readdirSync(dir).filter(
    (f: string) => f.endsWith('.ts') || f.endsWith('.js'),
  );
  const seq      = existingFiles.length + 1;
  const filename = MigrationRunner.makeFilename(name, seq);

  // Derive class name using the runner's own logic (no DB needed)
  const tmpRunner = new MigrationRunner({} as DatabaseDriver, migrationsPath);
  const className = tmpRunner.fileToClass(filename);

  // Infer table name from migration name (snake_case version of class name)
  const snakeName = filename.replace(/^\d{4}_\d{2}_\d{2}_\d{6}_/, '').replace(/\.(ts|js)$/, '');
  const tableName = inferTableName(snakeName) ?? 'table_name';

  const template = [
    `import { Migration, Table, Column, PrimaryKey, Timestamps } from 'mikro-api';`,
    ``,
    `@Table('${tableName}')`,
    `@Timestamps()`,
    `export class ${className} extends Migration {`,
    `  @PrimaryKey()`,
    `  id!: number;`,
    ``,
    `  // Add your columns here:`,
    `  // @Column({ type: 'TEXT', nullable: false })`,
    `  // name!: string;`,
    `}`,
    ``,
  ].join('\n');

  writeFileSync(join(dir, filename), template, 'utf-8');
  console.log(`Created: ${join(migrationsPath, filename)}`);
}

// ── help ─────────────────────────────────────────────────────────────────────

function printHelp(): void {
  console.log(`
mikro-migrate — database migration runner for mikro-api

Usage:
  mikro-migrate <command> [options]

Commands:
  migrate              Run all pending migrations
  rollback             Revert the last executed migration
  reset                Revert all executed migrations
  status               Show migration status (default)
  make <name>          Scaffold a new migration file

Options:
  --migrations=<path>  Migrations directory (default: database/migrations)

  SQLite (local dev):
    --sqlite=<path>    SQLite file (default: database/database.sqlite)

  Cloudflare D1 via Wrangler:
    --d1=<name>        D1 database name from wrangler.toml
    --local            Use local Miniflare database [default]
    --remote           Use remote production D1
    --config=<path>    Path to wrangler.toml

  Postgres:
    --db=<url>         postgres://user:pass@host/db

Examples:
  # Local SQLite
  mikro-migrate migrate

  # D1 local (wrangler dev)
  mikro-migrate migrate --d1=my-db --local

  # D1 production
  mikro-migrate migrate --d1=my-db --remote

  # Postgres
  mikro-migrate migrate --db=postgres://user:pass@localhost/mydb

  # Custom migrations directory
  mikro-migrate status --migrations=src/database/migrations
  `.trim());
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (command === 'make') {
    runMake(args[1] ?? '');
    return;
  }

  if (command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  const driver = await buildDriver();
  const runner = new MigrationRunner(driver, migrationsPath);
  await runner.init();

  switch (command) {
    case 'migrate':
      await runner.migrate();
      break;
    case 'rollback':
      await runner.rollback();
      break;
    case 'reset':
      await runner.reset();
      break;
    case 'status':
      await runner.status();
      break;
    default:
      console.error(`Unknown command: "${command}"`);
      printHelp();
      process.exit(1);
  }
}

main().catch(err => {
  console.error((err as Error).message ?? err);
  process.exit(1);
});
