// src/migrations/MigrationRunner.ts

import type { DatabaseDriver } from '../database/DatabaseDriver';
import type { Migration } from '../schema/Migration';
import { readdir, access, mkdir } from 'node:fs/promises';
import { resolve, join, basename } from 'node:path';

export class MigrationRunner {
  private db: DatabaseDriver;
  private migrationsPath: string;

  constructor(db: DatabaseDriver, migrationsPath = 'database/migrations') {
    this.db = db;
    this.migrationsPath = resolve(migrationsPath);
  }

  /** Must be called once before running any commands. Creates the tracking table. */
  async init(): Promise<void> {
    await this.ensureMigrationsTable();
  }

  // ── Commands ────────────────────────────────────────────────────────────

  /** Runs all pending migrations in chronological order. */
  async migrate(): Promise<void> {
    const pending = await this.getPending();

    if (pending.length === 0) {
      this.log('Nothing to migrate. Everything is up to date.');
      return;
    }

    for (const file of pending) {
      this.log(`Migrating: ${file}`);
      const migration = await this.loadMigration(file);
      await migration.up(this.db);
      await this.markAsMigrated(file);
      this.log(`  ✓ ${file}`);
    }

    this.log(`${pending.length} migration(s) executed.`);
  }

  /** Reverts the most recently executed migration. */
  async rollback(): Promise<void> {
    const last = await this.getLastMigrated();

    if (!last) {
      this.log('No migrations to rollback.');
      return;
    }

    this.log(`Rolling back: ${last}`);
    const migration = await this.loadMigration(last);
    await migration.down(this.db);
    await this.markAsRolledBack(last);
    this.log(`  ✓ ${last} rolled back.`);
  }

  /** Reverts all executed migrations in reverse order. */
  async reset(): Promise<void> {
    const migrated = await this.getAllMigrated();

    if (migrated.length === 0) {
      this.log('No migrations to reset.');
      return;
    }

    for (const file of [...migrated].reverse()) {
      this.log(`Rolling back: ${file}`);
      const migration = await this.loadMigration(file);
      await migration.down(this.db);
      await this.markAsRolledBack(file);
      this.log(`  ✓ ${file}`);
    }

    this.log(`${migrated.length} migration(s) rolled back.`);
  }

  /** Prints the status of all migrations (ran / pending). */
  async status(): Promise<void> {
    const migrated = await this.getAllMigrated();
    const all      = await this.getAllFiles();

    this.log(`${'Migration'.padEnd(60)}Status`);
    this.log('─'.repeat(72));

    if (all.length === 0) {
      this.log('No migration files found.');
      return;
    }

    for (const file of all) {
      const status = migrated.includes(file) ? '✓ Ran' : '○ Pending';
      this.log(`${file.padEnd(60)}${status}`);
    }
  }

  // ── Migrations table ────────────────────────────────────────────────────

  private async ensureMigrationsTable(): Promise<void> {
    if (this.db.getDialect() === 'postgres') {
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS "migrations" (
          "id"          SERIAL PRIMARY KEY,
          "migration"   VARCHAR(255) NOT NULL,
          "migrated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } else {
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS \`migrations\` (
          \`id\`          INTEGER PRIMARY KEY AUTOINCREMENT,
          \`migration\`   TEXT NOT NULL,
          \`migrated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
  }

  private async markAsMigrated(file: string): Promise<void> {
    const col = this.q('migration');
    const tbl = this.q('migrations');
    await this.db.execute(`INSERT INTO ${tbl} (${col}) VALUES (?)`, [file]);
  }

  private async markAsRolledBack(file: string): Promise<void> {
    const col = this.q('migration');
    const tbl = this.q('migrations');
    await this.db.execute(`DELETE FROM ${tbl} WHERE ${col} = ?`, [file]);
  }

  private async getLastMigrated(): Promise<string | null> {
    const col = this.q('migration');
    const id  = this.q('id');
    const tbl = this.q('migrations');
    const row = await this.db.queryOne<{ migration: string }>(
      `SELECT ${col} FROM ${tbl} ORDER BY ${id} DESC LIMIT 1`,
    );
    return row?.migration ?? null;
  }

  private async getAllMigrated(): Promise<string[]> {
    const col = this.q('migration');
    const id  = this.q('id');
    const tbl = this.q('migrations');
    const rows = await this.db.query<{ migration: string }>(
      `SELECT ${col} FROM ${tbl} ORDER BY ${id} ASC`,
    );
    return rows.map(r => r.migration);
  }

  // ── File helpers ────────────────────────────────────────────────────────

  private async getAllFiles(): Promise<string[]> {
    try {
      await access(this.migrationsPath);
    } catch {
      return [];
    }
    const entries = await readdir(this.migrationsPath);
    return entries
      .filter((f: string) => f.endsWith('.ts') || f.endsWith('.js'))
      .sort();
  }

  private async getPending(): Promise<string[]> {
    const migrated = await this.getAllMigrated();
    const all      = await this.getAllFiles();
    return all.filter(f => !migrated.includes(f));
  }

  private async loadMigration(filename: string): Promise<Migration> {
    const filePath  = join(this.migrationsPath, filename);
    const className = this.fileToClass(filename);

    // Dynamic import — Bun resolves absolute paths natively
    const mod: Record<string, unknown> = await import(filePath);

    // Try named export matching class name, then default export, then first class-like export
    const MigrationClass =
      (mod[className] as (new () => Migration) | undefined) ??
      (mod['default'] as (new () => Migration) | undefined) ??
      (Object.values(mod).find(
        (v): v is new () => Migration =>
          typeof v === 'function' &&
          typeof (v as { prototype?: { up?: unknown } }).prototype?.up === 'function',
      ));

    if (!MigrationClass) {
      throw new Error(
        `Migration class not found in "${filename}". ` +
        `Export a class named "${className}" or use a default export.`,
      );
    }

    return new MigrationClass();
  }

  /** Convert filename to PascalCase class name.
   *  @example `2024_01_15_000001_create_users_table.ts` → `CreateUsersTable`
   */
  fileToClass(filename: string): string {
    const base = basename(filename).replace(/\.(ts|js)$/, '');
    const name = base.replace(/^\d{4}_\d{2}_\d{2}_\d{6}_/, '');
    return name
      .split('_')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('');
  }

  /** Quote an identifier for the current dialect. */
  private q(identifier: string): string {
    return this.db.getDialect() === 'postgres'
      ? `"${identifier}"`
      : `\`${identifier}\``;
  }

  /** Generate a migration filename with current timestamp + sequence number. */
  static makeFilename(name: string, seq: number): string {
    const now  = new Date();
    const yyyy = now.getFullYear();
    const mm   = String(now.getMonth() + 1).padStart(2, '0');
    const dd   = String(now.getDate()).padStart(2, '0');
    const seqStr  = String(seq).padStart(6, '0');
    const snake = name
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '')
      .replace(/[\s-]+/g, '_');
    return `${yyyy}_${mm}_${dd}_${seqStr}_${snake}.ts`;
  }

  /** Ensure the migrations directory exists. */
  static async ensureDir(path: string): Promise<void> {
    await mkdir(resolve(path), { recursive: true });
  }

  private log(message: string): void {
    console.log(message);
  }
}
