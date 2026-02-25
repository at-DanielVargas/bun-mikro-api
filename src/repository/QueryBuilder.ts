// src/repository/QueryBuilder.ts

import type { DatabaseDriver } from '../database/DatabaseDriver';

type WhereClause = ['AND' | 'OR', string, string, unknown];

/**
 * Fluent SQL query builder. Dialect-aware: SQLite uses backticks + `?`,
 * Postgres uses double-quotes + `$N`.
 *
 * @example
 * repo.query()
 *   .select('id', 'name')
 *   .where('active', 1)
 *   .orderBy('name')
 *   .limit(10)
 *   .get();
 */
export class QueryBuilder<T = Record<string, unknown>> {
  private selects: string[] = [];
  private joins: string[] = [];
  private wheres: WhereClause[] = [];
  private orders: string[] = [];
  private limitVal: number | null = null;
  private offsetVal: number | null = null;
  private withTrashedFlag = false;

  constructor(
    private readonly db: DatabaseDriver,
    private readonly table: string,
    private readonly primaryKey: string,
    private readonly useSoftDeletes: boolean,
    private readonly softDeleteColumn: string,
  ) {}

  /* ------------------------------------------------------------------ */
  /*  Quoting helpers                                                     */
  /* ------------------------------------------------------------------ */

  private q(identifier: string): string {
    return this.db.getDialect() === 'postgres'
      ? `"${identifier}"`
      : `\`${identifier}\``;
  }

  private placeholder(index: number): string {
    return this.db.getDialect() === 'postgres' ? `$${index}` : '?';
  }

  /* ------------------------------------------------------------------ */
  /*  SELECT                                                              */
  /* ------------------------------------------------------------------ */

  select(...columns: string[]): this {
    this.selects = columns;
    return this;
  }

  /* ------------------------------------------------------------------ */
  /*  JOINs                                                               */
  /* ------------------------------------------------------------------ */

  join(table: string, first: string, operator: string, second: string): this {
    this.joins.push(`INNER JOIN ${this.q(table)} ON ${this.q(first)} ${operator} ${this.q(second)}`);
    return this;
  }

  leftJoin(table: string, first: string, operator: string, second: string): this {
    this.joins.push(`LEFT JOIN ${this.q(table)} ON ${this.q(first)} ${operator} ${this.q(second)}`);
    return this;
  }

  /* ------------------------------------------------------------------ */
  /*  WHERE                                                               */
  /* ------------------------------------------------------------------ */

  where(column: string, value: unknown, operator = '='): this {
    this.wheres.push(['AND', column, operator, value]);
    return this;
  }

  orWhere(column: string, value: unknown, operator = '='): this {
    this.wheres.push(['OR', column, operator, value]);
    return this;
  }

  whereNull(column: string): this {
    this.wheres.push(['AND', column, 'IS NULL', null]);
    return this;
  }

  whereNotNull(column: string): this {
    this.wheres.push(['AND', column, 'IS NOT NULL', null]);
    return this;
  }

  whereIn(column: string, values: unknown[]): this {
    if (values.length === 0) return this;
    this.wheres.push(['AND', column, `IN_ARRAY`, values]);
    return this;
  }

  whereBetween(column: string, min: unknown, max: unknown): this {
    this.wheres.push(['AND', column, 'BETWEEN', [min, max]]);
    return this;
  }

  whereLike(column: string, pattern: string): this {
    this.wheres.push(['AND', column, 'LIKE', pattern]);
    return this;
  }

  /* ------------------------------------------------------------------ */
  /*  ORDER / LIMIT / OFFSET                                              */
  /* ------------------------------------------------------------------ */

  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.orders.push(`${this.q(column)} ${direction === 'DESC' ? 'DESC' : 'ASC'}`);
    return this;
  }

  limit(n: number): this {
    this.limitVal = n;
    return this;
  }

  offset(n: number): this {
    this.offsetVal = n;
    return this;
  }

  page(page: number, perPage = 15): this {
    return this.limit(perPage).offset((page - 1) * perPage);
  }

  withTrashed(): this {
    this.withTrashedFlag = true;
    return this;
  }

  /* ------------------------------------------------------------------ */
  /*  Execution                                                           */
  /* ------------------------------------------------------------------ */

  async get(): Promise<T[]> {
    const [sql, params] = this.buildSelect();
    return this.db.query<T>(sql, params);
  }

  async first(): Promise<T | null> {
    this.limit(1);
    const [sql, params] = this.buildSelect();
    return this.db.queryOne<T>(sql, params);
  }

  async count(): Promise<number> {
    const [sql, params] = this.buildSelect(true);
    const row = await this.db.queryOne<Record<string, unknown>>(sql, params);
    return Number(row?.total ?? 0);
  }

  async exists(): Promise<boolean> {
    return (await this.count()) > 0;
  }

  async paginate(page: number, perPage = 15): Promise<{
    data: T[];
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    from: number;
    to: number;
  }> {
    const total = await this.count();
    const data  = await this.page(page, perPage).get();
    return {
      data,
      total,
      per_page: perPage,
      current_page: page,
      last_page: Math.ceil(total / perPage),
      from: (page - 1) * perPage + 1,
      to: Math.min(page * perPage, total),
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Build                                                               */
  /* ------------------------------------------------------------------ */

  private buildSelect(count = false): [string, unknown[]] {
    const params: unknown[] = [];
    let pIndex = 0;
    const ph = () => this.placeholder(++pIndex);

    // SELECT
    let select: string;
    if (count) {
      select = 'SELECT COUNT(*) as total';
    } else if (this.selects.length > 0) {
      const cols = this.selects.map((c) =>
        c.includes('.') || c.includes('(') ? c : this.q(c),
      ).join(', ');
      select = `SELECT ${cols}`;
    } else {
      select = `SELECT ${this.q(this.table)}.*`;
    }

    let sql = `${select} FROM ${this.q(this.table)}`;

    // JOINs
    if (this.joins.length > 0) sql += ' ' + this.joins.join(' ');

    // WHERE
    const conditions: WhereClause[] = [...this.wheres];
    if (this.useSoftDeletes && !this.withTrashedFlag) {
      conditions.push(['AND', this.softDeleteColumn, 'IS NULL', null]);
    }

    if (conditions.length > 0) {
      const parts: string[] = [];
      conditions.forEach(([bool, col, op, val], i) => {
        const prefix = i === 0 ? '' : `${bool} `;
        if (op === 'IS NULL' || op === 'IS NOT NULL') {
          parts.push(`${prefix}${this.q(col)} ${op}`);
        } else if (op === 'IN_ARRAY') {
          const arr = val as unknown[];
          const holders = arr.map(() => ph()).join(', ');
          parts.push(`${prefix}${this.q(col)} IN (${holders})`);
          params.push(...arr);
        } else if (op === 'BETWEEN') {
          const [min, max] = val as [unknown, unknown];
          parts.push(`${prefix}${this.q(col)} BETWEEN ${ph()} AND ${ph()}`);
          params.push(min, max);
        } else {
          parts.push(`${prefix}${this.q(col)} ${op} ${ph()}`);
          params.push(val);
        }
      });
      sql += ' WHERE ' + parts.join(' ');
    }

    // ORDER BY
    if (this.orders.length > 0 && !count) {
      sql += ' ORDER BY ' + this.orders.join(', ');
    }

    // LIMIT / OFFSET
    if (this.limitVal !== null && !count) sql += ` LIMIT ${this.limitVal}`;
    if (this.offsetVal !== null && !count) sql += ` OFFSET ${this.offsetVal}`;

    return [sql, params];
  }
}
