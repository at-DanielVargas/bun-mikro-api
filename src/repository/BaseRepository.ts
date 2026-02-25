// src/repository/BaseRepository.ts

import type { DatabaseDriver } from '../database/DatabaseDriver';
import { QueryBuilder } from './QueryBuilder';
import { RelationLoader } from './RelationLoader';

type Row = Record<string, unknown>;

/**
 * Generic CRUD repository with fluent QueryBuilder, soft deletes, and eager loading.
 *
 * @example
 * class UserRepository extends BaseRepository {
 *   protected table = 'users';
 *   protected fillable = ['name', 'email', 'role'];
 * }
 */
export abstract class BaseRepository {
  protected abstract readonly table: string;
  protected readonly primaryKey: string = 'id';
  protected readonly softDeleteColumn: string = 'deleted_at';
  protected readonly useSoftDeletes: boolean = false;
  protected readonly fillable: string[] = [];

  private eagerLoad: string[] = [];

  constructor(protected readonly db: DatabaseDriver) {}

  /* ------------------------------------------------------------------ */
  /*  Eager loading                                                       */
  /* ------------------------------------------------------------------ */

  /** Returns a clone with the specified relations queued for loading. */
  with(...relations: string[]): this {
    const clone = Object.create(Object.getPrototypeOf(this)) as this;
    Object.assign(clone, this);
    clone.eagerLoad = relations;
    return clone;
  }

  async loadWith(records: Row[], relations: string[]): Promise<Row[]> {
    if (records.length === 0 || relations.length === 0) return records;
    const loader = new RelationLoader(this.db);
    return loader.load(records, relations, this.constructor as new () => unknown);
  }

  /* ------------------------------------------------------------------ */
  /*  QueryBuilder                                                        */
  /* ------------------------------------------------------------------ */

  query<T = Row>(): QueryBuilder<T> {
    return new QueryBuilder<T>(
      this.db,
      this.table,
      this.primaryKey,
      this.useSoftDeletes,
      this.softDeleteColumn,
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Read                                                                */
  /* ------------------------------------------------------------------ */

  async findAll(): Promise<Row[]> {
    const records = await this.query().get();
    return this.hydrate(records);
  }

  async findById(id: number): Promise<Row | null> {
    const record = await this.query().where(this.primaryKey, id).first();
    if (!record) return null;
    const results = await this.hydrate([record]);
    return results[0] ?? null;
  }

  async findBy(column: string, value: unknown): Promise<Row[]> {
    const records = await this.query().where(column, value).get();
    return this.hydrate(records);
  }

  async findOneBy(column: string, value: unknown): Promise<Row | null> {
    const record = await this.query().where(column, value).first();
    if (!record) return null;
    const results = await this.hydrate([record]);
    return results[0] ?? null;
  }

  async findWhere(conditions: Record<string, unknown>): Promise<Row[]> {
    const qb = this.query();
    for (const [col, val] of Object.entries(conditions)) qb.where(col, val);
    const records = await qb.get();
    return this.hydrate(records);
  }

  async count(conditions: Record<string, unknown> = {}): Promise<number> {
    const qb = this.query();
    for (const [col, val] of Object.entries(conditions)) qb.where(col, val);
    return qb.count();
  }

  async exists(column: string, value: unknown, excludeId?: number): Promise<boolean> {
    const qb = this.query().where(column, value);
    if (excludeId !== undefined) qb.where(this.primaryKey, excludeId, '!=');
    return qb.exists();
  }

  async paginate(page: number, perPage = 15, conditions: Record<string, unknown> = {}): Promise<{
    data: Row[];
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    from: number;
    to: number;
  }> {
    const qb = this.query();
    for (const [col, val] of Object.entries(conditions)) qb.where(col, val);
    const result = await qb.paginate(page, perPage);
    result.data = await this.hydrate(result.data);
    return result;
  }

  /* ------------------------------------------------------------------ */
  /*  Write                                                               */
  /* ------------------------------------------------------------------ */

  async create(data: Record<string, unknown>): Promise<Row> {
    const filtered = this.filterColumns(data);
    const cols = Object.keys(filtered);
    const vals = Object.values(filtered);
    const dialect = this.db.getDialect();
    const q = (s: string) => dialect === 'postgres' ? `"${s}"` : `\`${s}\``;

    const colsSql = cols.map(q).join(', ');
    const holders = cols.map((_, i) => dialect === 'postgres' ? `$${i + 1}` : '?').join(', ');

    if (dialect === 'postgres') {
      const row = await this.db.queryOne<Row>(
        `INSERT INTO ${q(this.table)} (${colsSql}) VALUES (${holders}) RETURNING *`,
        vals,
      );
      return row!;
    }

    const { lastInsertId } = await this.db.execute(
      `INSERT INTO ${q(this.table)} (${colsSql}) VALUES (${holders})`,
      vals,
    );
    return (await this.findById(lastInsertId)) ?? { [this.primaryKey]: lastInsertId, ...filtered };
  }

  async update(id: number, data: Record<string, unknown>): Promise<Row | null> {
    const filtered = this.filterColumns(data);
    if (Object.keys(filtered).length === 0) return this.findById(id);

    const dialect = this.db.getDialect();
    const q = (s: string) => dialect === 'postgres' ? `"${s}"` : `\`${s}\``;
    const cols = Object.keys(filtered);
    const vals = Object.values(filtered);

    const set = cols.map((c, i) =>
      `${q(c)} = ${dialect === 'postgres' ? `$${i + 1}` : '?'}`
    ).join(', ');

    const pkPlaceholder = dialect === 'postgres' ? `$${cols.length + 1}` : '?';

    await this.db.execute(
      `UPDATE ${q(this.table)} SET ${set} WHERE ${q(this.primaryKey)} = ${pkPlaceholder}`,
      [...vals, id],
    );
    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    if (this.useSoftDeletes) return this.softDelete(id);
    const dialect = this.db.getDialect();
    const q = (s: string) => dialect === 'postgres' ? `"${s}"` : `\`${s}\``;
    const { changes } = await this.db.execute(
      `DELETE FROM ${q(this.table)} WHERE ${q(this.primaryKey)} = ${dialect === 'postgres' ? '$1' : '?'}`,
      [id],
    );
    return changes > 0;
  }

  async softDelete(id: number): Promise<boolean> {
    const dialect = this.db.getDialect();
    const q = (s: string) => dialect === 'postgres' ? `"${s}"` : `\`${s}\``;
    const now = dialect === 'postgres' ? 'NOW()' : 'CURRENT_TIMESTAMP';
    const { changes } = await this.db.execute(
      `UPDATE ${q(this.table)} SET ${q(this.softDeleteColumn)} = ${now} WHERE ${q(this.primaryKey)} = ${dialect === 'postgres' ? '$1' : '?'}`,
      [id],
    );
    return changes > 0;
  }

  async restore(id: number): Promise<Row | null> {
    const dialect = this.db.getDialect();
    const q = (s: string) => dialect === 'postgres' ? `"${s}"` : `\`${s}\``;
    await this.db.execute(
      `UPDATE ${q(this.table)} SET ${q(this.softDeleteColumn)} = NULL WHERE ${q(this.primaryKey)} = ${dialect === 'postgres' ? '$1' : '?'}`,
      [id],
    );
    return this.findById(id);
  }

  /* ------------------------------------------------------------------ */
  /*  Raw queries                                                         */
  /* ------------------------------------------------------------------ */

  protected async raw(sql: string, params: unknown[] = []): Promise<Row[]> {
    return this.db.query<Row>(sql, params);
  }

  protected async rawOne(sql: string, params: unknown[] = []): Promise<Row | null> {
    return this.db.queryOne<Row>(sql, params);
  }

  /* ------------------------------------------------------------------ */
  /*  Public accessors (used by RelationLoader)                          */
  /* ------------------------------------------------------------------ */

  getTable(): string { return this.table; }
  getPrimaryKey(): string { return this.primaryKey; }

  /* ------------------------------------------------------------------ */
  /*  Private helpers                                                     */
  /* ------------------------------------------------------------------ */

  private async hydrate(records: Row[]): Promise<Row[]> {
    if (this.eagerLoad.length === 0 || records.length === 0) return records;
    const relations = this.eagerLoad;
    (this as unknown as { eagerLoad: string[] }).eagerLoad = [];
    const loader = new RelationLoader(this.db);
    return loader.load(records, relations, this.constructor as new () => unknown);
  }

  private filterColumns(data: Record<string, unknown>): Record<string, unknown> {
    if (this.fillable.length > 0) {
      return Object.fromEntries(
        Object.entries(data).filter(([k]) => this.fillable.includes(k)),
      );
    }
    const { [this.primaryKey]: _pk, created_at: _ca, updated_at: _ua, deleted_at: _da, ...rest } = data;
    return rest;
  }
}
