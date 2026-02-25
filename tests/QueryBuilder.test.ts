// tests/QueryBuilder.test.ts
// Tests the QueryBuilder in isolation using SqliteDriver + bun:sqlite in-memory DB.

import { describe, it, expect, beforeEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { SqliteDriver }   from '../src/database/SqliteDriver';
import { QueryBuilder }   from '../src/repository/QueryBuilder';
import { BaseRepository } from '../src/repository/BaseRepository';

/* ---- Setup ----------------------------------------------------------- */

let db: ReturnType<typeof createDb>;

function createDb() {
  const sqlite = new Database(':memory:');
  sqlite.query(`CREATE TABLE users (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT NOT NULL,
    email TEXT NOT NULL,
    role  TEXT NOT NULL DEFAULT 'user',
    deleted_at TEXT
  )`).run();

  sqlite.query("INSERT INTO users (name, email, role) VALUES ('Alice', 'alice@x.com', 'admin')").run();
  sqlite.query("INSERT INTO users (name, email, role) VALUES ('Bob',   'bob@x.com',   'user')").run();
  sqlite.query("INSERT INTO users (name, email, role) VALUES ('Carol', 'carol@x.com', 'user')").run();

  const driver = new SqliteDriver(sqlite);
  return { sqlite, driver };
}

class UserRepository extends BaseRepository {
  protected readonly table = 'users';
  protected readonly primaryKey = 'id';
  protected readonly fillable = ['name', 'email', 'role'];
  protected readonly useSoftDeletes = true;
  protected readonly softDeleteColumn = 'deleted_at';
}

/* ---- Tests ----------------------------------------------------------- */

describe('QueryBuilder – SQLite dialect', () => {
  beforeEach(() => { db = createDb(); });

  it('gets all rows', async () => {
    const rows = await new QueryBuilder(db.driver, 'users', 'id', false, 'deleted_at').get();
    expect(rows).toHaveLength(3);
  });

  it('filters with where()', async () => {
    const rows = await new QueryBuilder(db.driver, 'users', 'id', false, 'deleted_at')
      .where('role', 'admin')
      .get();
    expect(rows).toHaveLength(1);
    expect((rows[0] as Record<string, unknown>)['name']).toBe('Alice');
  });

  it('limits results', async () => {
    const rows = await new QueryBuilder(db.driver, 'users', 'id', false, 'deleted_at')
      .limit(2)
      .get();
    expect(rows).toHaveLength(2);
  });

  it('counts rows', async () => {
    const total = await new QueryBuilder(db.driver, 'users', 'id', false, 'deleted_at').count();
    expect(total).toBe(3);
  });

  it('returns first matching row', async () => {
    const row = await new QueryBuilder(db.driver, 'users', 'id', false, 'deleted_at')
      .where('role', 'user')
      .first() as Record<string, unknown>;
    expect(row?.['name']).toBe('Bob');
  });

  it('paginates results', async () => {
    const result = await new QueryBuilder(db.driver, 'users', 'id', false, 'deleted_at')
      .paginate(1, 2);
    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(3);
    expect(result.last_page).toBe(2);
  });

  it('orderBy DESC', async () => {
    const rows = await new QueryBuilder(db.driver, 'users', 'id', false, 'deleted_at')
      .orderBy('name', 'DESC')
      .get() as Record<string, unknown>[];
    expect(rows[0]?.['name']).toBe('Carol');
  });

  it('whereIn filters by multiple values', async () => {
    const rows = await new QueryBuilder(db.driver, 'users', 'id', false, 'deleted_at')
      .whereIn('role', ['admin', 'user'])
      .get();
    expect(rows).toHaveLength(3);
  });

  it('orWhere includes additional match', async () => {
    const rows = await new QueryBuilder(db.driver, 'users', 'id', false, 'deleted_at')
      .where('name', 'Alice')
      .orWhere('name', 'Bob')
      .get();
    expect(rows).toHaveLength(2);
  });
});

describe('BaseRepository – CRUD', () => {
  beforeEach(() => { db = createDb(); });

  it('findAll returns all records', async () => {
    const repo = new UserRepository(db.driver);
    const all = await repo.findAll();
    expect(all).toHaveLength(3);
  });

  it('findById returns correct record', async () => {
    const repo = new UserRepository(db.driver);
    const user = await repo.findById(1) as Record<string, unknown>;
    expect(user?.['name']).toBe('Alice');
  });

  it('findById returns null for missing id', async () => {
    const repo = new UserRepository(db.driver);
    expect(await repo.findById(999)).toBeNull();
  });

  it('create inserts a new row', async () => {
    const repo = new UserRepository(db.driver);
    const user = await repo.create({ name: 'Dave', email: 'dave@x.com', role: 'user' }) as Record<string, unknown>;
    expect(user?.['name']).toBe('Dave');
    expect(await repo.count()).toBe(4);
  });

  it('update modifies the record', async () => {
    const repo = new UserRepository(db.driver);
    const updated = await repo.update(1, { role: 'user' }) as Record<string, unknown>;
    expect(updated?.['role']).toBe('user');
  });

  it('softDelete sets deleted_at', async () => {
    const repo = new UserRepository(db.driver);
    const ok = await repo.delete(1);
    expect(ok).toBe(true);
    // Soft-deleted record should not appear in findAll (soft deletes active)
    const all = await repo.findAll();
    expect(all).toHaveLength(2);
  });

  it('paginate returns structured result', async () => {
    const repo = new UserRepository(db.driver);
    const result = await repo.paginate(1, 2);
    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(3);
  });

  it('exists returns true for existing value', async () => {
    const repo = new UserRepository(db.driver);
    expect(await repo.exists('email', 'alice@x.com')).toBe(true);
    expect(await repo.exists('email', 'nobody@x.com')).toBe(false);
  });
});
