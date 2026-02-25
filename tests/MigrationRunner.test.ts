// tests/MigrationRunner.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { SqliteDriver } from '../src/database/SqliteDriver';
import { MigrationRunner } from '../src/migrations/MigrationRunner';
import { Migration } from '../src/schema/Migration';
import type { DatabaseDriver } from '../src/database/DatabaseDriver';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ── Helpers ────────────────────────────────────────────────────────────────

const TMP_DIR = join(import.meta.dir, '_tmp_migrations');

function makeDriver(): SqliteDriver {
  return new SqliteDriver(new Database(':memory:'));
}

function writeFixture(filename: string, content: string): void {
  if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });
  writeFileSync(join(TMP_DIR, filename), content, 'utf-8');
}

function writeMigration(filename: string, className: string, upSql: string, downSql: string): void {
  writeFixture(filename, [
    `import type { DatabaseDriver } from '../../src/database/DatabaseDriver';`,
    `import { Migration } from '../../src/schema/Migration';`,
    `export class ${className} extends Migration {`,
    `  async up(db: DatabaseDriver) { await db.execute(\`${upSql}\`); }`,
    `  async down(db: DatabaseDriver) { await db.execute(\`${downSql}\`); }`,
    `}`,
  ].join('\n'));
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('MigrationRunner', () => {
  let driver: SqliteDriver;
  let runner: MigrationRunner;

  beforeEach(async () => {
    if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });
    driver = makeDriver();
    runner = new MigrationRunner(driver, TMP_DIR);
    await runner.init();
  });

  afterEach(() => {
    if (existsSync(TMP_DIR)) rmSync(TMP_DIR, { recursive: true, force: true });
  });

  // ── fileToClass ──────────────────────────────────────────────────────────

  describe('fileToClass()', () => {
    it('converts a standard filename to PascalCase class name', () => {
      expect(runner.fileToClass('2024_01_15_000001_create_users_table.ts'))
        .toBe('CreateUsersTable');
    });

    it('handles single-word names', () => {
      expect(runner.fileToClass('2024_06_01_000002_users.ts')).toBe('Users');
    });

    it('works with .js extension', () => {
      expect(runner.fileToClass('2024_06_01_000003_add_email_column.js'))
        .toBe('AddEmailColumn');
    });
  });

  // ── makeFilename ─────────────────────────────────────────────────────────

  describe('MigrationRunner.makeFilename()', () => {
    it('generates a properly formatted filename', () => {
      const name = MigrationRunner.makeFilename('create_users_table', 1);
      expect(name).toMatch(/^\d{4}_\d{2}_\d{2}_000001_create_users_table\.ts$/);
    });

    it('converts CamelCase names to snake_case', () => {
      const name = MigrationRunner.makeFilename('CreateUsersTable', 2);
      expect(name).toMatch(/_create_users_table\.ts$/);
    });

    it('converts spaces and hyphens to underscores', () => {
      const name = MigrationRunner.makeFilename('add email column', 3);
      expect(name).toMatch(/_add_email_column\.ts$/);
    });

    it('zero-pads the sequence number to 6 digits', () => {
      const name = MigrationRunner.makeFilename('test', 42);
      expect(name).toMatch(/_000042_test\.ts$/);
    });
  });

  // ── status ───────────────────────────────────────────────────────────────

  describe('status()', () => {
    it('prints "No migration files found" when directory is empty', async () => {
      const lines: string[] = [];
      const orig = console.log;
      console.log = (msg: string) => lines.push(msg);
      await runner.status();
      console.log = orig;
      expect(lines.some(l => l.includes('No migration files found'))).toBe(true);
    });

    it('shows pending status for new files', async () => {
      writeMigration(
        '2024_01_01_000001_create_foo.ts', 'CreateFoo',
        'CREATE TABLE foo (id INTEGER PRIMARY KEY)',
        'DROP TABLE foo',
      );
      const lines: string[] = [];
      const orig = console.log;
      console.log = (msg: string) => lines.push(msg);
      await runner.status();
      console.log = orig;
      expect(lines.some(l => l.includes('○ Pending'))).toBe(true);
    });
  });

  // ── migrate ──────────────────────────────────────────────────────────────

  describe('migrate()', () => {
    it('runs pending migrations and marks them as executed', async () => {
      writeMigration(
        '2024_01_01_000001_create_alpha.ts', 'CreateAlpha',
        'CREATE TABLE alpha (id INTEGER PRIMARY KEY)',
        'DROP TABLE alpha',
      );
      writeMigration(
        '2024_01_02_000002_create_beta.ts', 'CreateBeta',
        'CREATE TABLE beta (id INTEGER PRIMARY KEY)',
        'DROP TABLE beta',
      );

      await runner.migrate();

      // Both tables should exist
      const alpha = driver['db'].query('SELECT name FROM sqlite_master WHERE type="table" AND name="alpha"').all();
      const beta  = driver['db'].query('SELECT name FROM sqlite_master WHERE type="table" AND name="beta"').all();
      expect(alpha).toHaveLength(1);
      expect(beta).toHaveLength(1);
    });

    it('logs "Nothing to migrate" when everything is up to date', async () => {
      const lines: string[] = [];
      const orig = console.log;
      console.log = (msg: string) => lines.push(msg);
      await runner.migrate();
      console.log = orig;
      expect(lines.some(l => l.includes('Nothing to migrate'))).toBe(true);
    });

    it('does not re-run already migrated files', async () => {
      writeMigration(
        '2024_01_01_000001_create_gamma.ts', 'CreateGamma',
        'CREATE TABLE gamma (id INTEGER PRIMARY KEY)',
        'DROP TABLE gamma',
      );

      await runner.migrate(); // first run
      await runner.migrate(); // second run — should be a no-op

      // migrations table should only have one entry
      const rows = driver['db'].query('SELECT * FROM `migrations`').all();
      expect(rows).toHaveLength(1);
    });
  });

  // ── rollback ─────────────────────────────────────────────────────────────

  describe('rollback()', () => {
    it('rolls back the last migration', async () => {
      writeMigration(
        '2024_01_01_000001_create_delta.ts', 'CreateDelta',
        'CREATE TABLE delta (id INTEGER PRIMARY KEY)',
        'DROP TABLE delta',
      );

      await runner.migrate();

      // table exists
      let rows = driver['db'].query('SELECT name FROM sqlite_master WHERE type="table" AND name="delta"').all();
      expect(rows).toHaveLength(1);

      await runner.rollback();

      // table gone
      rows = driver['db'].query('SELECT name FROM sqlite_master WHERE type="table" AND name="delta"').all();
      expect(rows).toHaveLength(0);
    });

    it('logs "No migrations to rollback" when nothing has been run', async () => {
      const lines: string[] = [];
      const orig = console.log;
      console.log = (msg: string) => lines.push(msg);
      await runner.rollback();
      console.log = orig;
      expect(lines.some(l => l.includes('No migrations to rollback'))).toBe(true);
    });
  });

  // ── reset ────────────────────────────────────────────────────────────────

  describe('reset()', () => {
    it('rolls back all migrations in reverse order', async () => {
      writeMigration(
        '2024_01_01_000001_create_epsilon.ts', 'CreateEpsilon',
        'CREATE TABLE epsilon (id INTEGER PRIMARY KEY)',
        'DROP TABLE epsilon',
      );
      writeMigration(
        '2024_01_02_000002_create_zeta.ts', 'CreateZeta',
        'CREATE TABLE zeta (id INTEGER PRIMARY KEY)',
        'DROP TABLE zeta',
      );

      await runner.migrate();
      await runner.reset();

      const migrationsLeft = driver['db'].query('SELECT * FROM `migrations`').all();
      expect(migrationsLeft).toHaveLength(0);

      const epsilonExists = driver['db'].query('SELECT name FROM sqlite_master WHERE type="table" AND name="epsilon"').all();
      const zetaExists    = driver['db'].query('SELECT name FROM sqlite_master WHERE type="table" AND name="zeta"').all();
      expect(epsilonExists).toHaveLength(0);
      expect(zetaExists).toHaveLength(0);
    });

    it('logs "No migrations to reset" when nothing has been run', async () => {
      const lines: string[] = [];
      const orig = console.log;
      console.log = (msg: string) => lines.push(msg);
      await runner.reset();
      console.log = orig;
      expect(lines.some(l => l.includes('No migrations to reset'))).toBe(true);
    });
  });

  // ── status after migrate ─────────────────────────────────────────────────

  describe('status() after migrate()', () => {
    it('shows "✓ Ran" for executed migrations', async () => {
      writeMigration(
        '2024_01_01_000001_create_eta.ts', 'CreateEta',
        'CREATE TABLE eta (id INTEGER PRIMARY KEY)',
        'DROP TABLE eta',
      );

      await runner.migrate();

      const lines: string[] = [];
      const orig = console.log;
      console.log = (msg: string) => lines.push(msg);
      await runner.status();
      console.log = orig;

      expect(lines.some(l => l.includes('✓ Ran'))).toBe(true);
    });
  });

  // ── error handling ───────────────────────────────────────────────────────

  describe('error handling', () => {
    it('throws when migration file has no recognizable class export', async () => {
      writeFixture('2024_01_01_000001_bad_migration.ts', 'export const foo = 42;');

      await expect(runner.migrate()).rejects.toThrow('Migration class not found');
    });
  });

  // ── ensureMigrationsTable idempotent ─────────────────────────────────────

  describe('init() idempotent', () => {
    it('calling init() multiple times does not throw', async () => {
      await expect(runner.init()).resolves.toBeUndefined();
      await expect(runner.init()).resolves.toBeUndefined();
    });
  });
});
