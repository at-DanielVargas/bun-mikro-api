// src/repository/RelationLoader.ts
// Batch-loads relations (N+1-free) using IN (...) queries.

import type { DatabaseDriver } from '../database/DatabaseDriver';
import { MetadataStore, type RelationMeta } from '../core/MetadataStore';

type Row = Record<string, unknown>;

export class RelationLoader {
  constructor(private readonly db: DatabaseDriver) {}

  private q(id: string): string {
    return this.db.getDialect() === 'postgres' ? `"${id}"` : `\`${id}\``;
  }

  async load(
    records: Row[],
    relations: string[],
    RepositoryClass: new (...args: unknown[]) => unknown,
  ): Promise<Row[]> {
    if (records.length === 0 || relations.length === 0) return records;

    const allRelations = MetadataStore.getRelations(RepositoryClass);

    for (const relation of relations) {
      const [immediate, nested] = this.parseNested(relation);
      const relMeta = allRelations.get(immediate);
      if (!relMeta) continue;
      records = await this.resolveRelation(records, immediate, relMeta, nested);
    }

    return records;
  }

  /* ------------------------------------------------------------------ */
  /*  Resolution per relation type                                        */
  /* ------------------------------------------------------------------ */

  private async resolveRelation(
    records: Row[],
    propName: string,
    rel: RelationMeta,
    nested: string | null,
  ): Promise<Row[]> {
    switch (rel.type) {
      case 'hasMany':     return this.loadHasMany(records, rel, propName, nested);
      case 'hasOne':      return this.loadHasOne(records, rel, propName, nested);
      case 'belongsTo':   return this.loadBelongsTo(records, rel, propName, nested);
      case 'belongsToMany': return this.loadBelongsToMany(records, rel, propName, nested);
    }
  }

  // ── HasMany ────────────────────────────────────────────────────────

  private async loadHasMany(records: Row[], rel: RelationMeta, propName: string, nested: string | null): Promise<Row[]> {
    const relRepo = new rel.repository() as { getTable(): string; getPrimaryKey(): string; loadWith(r: Row[], n: string[]): Promise<Row[]> };
    const localKey = rel.localKey ?? 'id';
    const key = rel.as ?? propName;

    const localIds = this.extractIds(records, localKey);
    if (localIds.length === 0) return this.fillEmpty(records, key, []);

    let related = await this.fetchWhereIn(relRepo.getTable(), rel.foreignKey, localIds);
    if (nested) related = await relRepo.loadWith(related, [nested]);

    const grouped: Record<string, Row[]> = {};
    for (const row of related) {
      const fk = String(row[rel.foreignKey]);
      if (!grouped[fk]) grouped[fk] = [];
      grouped[fk].push(row);
    }

    return records.map((r) => ({ ...r, [key]: grouped[String(r[localKey])] ?? [] }));
  }

  // ── HasOne ─────────────────────────────────────────────────────────

  private async loadHasOne(records: Row[], rel: RelationMeta, propName: string, nested: string | null): Promise<Row[]> {
    const relRepo = new rel.repository() as { getTable(): string; loadWith(r: Row[], n: string[]): Promise<Row[]> };
    const localKey = rel.localKey ?? 'id';
    const key = rel.as ?? propName;

    const localIds = this.extractIds(records, localKey);
    if (localIds.length === 0) return this.fillEmpty(records, key, null);

    let related = await this.fetchWhereIn(relRepo.getTable(), rel.foreignKey, localIds);
    if (nested) related = await relRepo.loadWith(related, [nested]);

    const indexed: Record<string, Row> = {};
    for (const row of related) {
      const fk = String(row[rel.foreignKey]);
      if (!indexed[fk]) indexed[fk] = row;
    }

    return records.map((r) => ({ ...r, [key]: indexed[String(r[localKey])] ?? null }));
  }

  // ── BelongsTo ──────────────────────────────────────────────────────

  private async loadBelongsTo(records: Row[], rel: RelationMeta, propName: string, nested: string | null): Promise<Row[]> {
    const relRepo = new rel.repository() as { getTable(): string; getPrimaryKey(): string; loadWith(r: Row[], n: string[]): Promise<Row[]> };
    const ownerKey = rel.ownerKey ?? relRepo.getPrimaryKey();
    const key = rel.as ?? propName;

    const foreignIds = this.extractIds(records, rel.foreignKey);
    if (foreignIds.length === 0) return this.fillEmpty(records, key, null);

    let related = await this.fetchWhereIn(relRepo.getTable(), ownerKey, foreignIds);
    if (nested) related = await relRepo.loadWith(related, [nested]);

    const indexed: Record<string, Row> = {};
    for (const row of related) indexed[String(row[ownerKey])] = row;

    return records.map((r) => ({ ...r, [key]: indexed[String(r[rel.foreignKey])] ?? null }));
  }

  // ── BelongsToMany ──────────────────────────────────────────────────

  private async loadBelongsToMany(records: Row[], rel: RelationMeta, propName: string, nested: string | null): Promise<Row[]> {
    const relRepo = new rel.repository() as { getTable(): string; getPrimaryKey(): string; loadWith(r: Row[], n: string[]): Promise<Row[]> };
    const localKey = rel.localKey ?? 'id';
    const relatedPk = rel.relatedPk ?? relRepo.getPrimaryKey();
    const key = rel.as ?? propName;
    const pivotTable = rel.pivotTable!;
    const relatedTable = relRepo.getTable();

    const localIds = this.extractIds(records, localKey);
    if (localIds.length === 0) return this.fillEmpty(records, key, []);

    const dialect = this.db.getDialect();
    const holders = localIds.map((_, i) =>
      dialect === 'postgres' ? `$${i + 1}` : '?',
    ).join(', ');

    let extraCols = '';
    if (rel.pivotColumns?.length) {
      extraCols = ', ' + rel.pivotColumns.map(
        (c) => `${this.q(pivotTable)}.${this.q(c)} as ${this.q(`pivot_${c}`)}`,
      ).join(', ');
    }

    const sql = `
      SELECT ${this.q(relatedTable)}.*${extraCols},
             ${this.q(pivotTable)}.${this.q(rel.foreignKey)} as _pivot_fk
      FROM ${this.q(relatedTable)}
      INNER JOIN ${this.q(pivotTable)}
        ON ${this.q(pivotTable)}.${this.q(rel.relatedKey!)} = ${this.q(relatedTable)}.${this.q(relatedPk)}
      WHERE ${this.q(pivotTable)}.${this.q(rel.foreignKey)} IN (${holders})
    `;

    let related = await this.db.query<Row>(sql, localIds);
    if (nested) related = await relRepo.loadWith(related, [nested]);

    const grouped: Record<string, Row[]> = {};
    for (const row of related) {
      const fk = String(row['_pivot_fk']);
      const { _pivot_fk: _ignored, ...cleanRow } = row;
      if (!grouped[fk]) grouped[fk] = [];
      grouped[fk].push(cleanRow);
    }

    return records.map((r) => ({ ...r, [key]: grouped[String(r[localKey])] ?? [] }));
  }

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                             */
  /* ------------------------------------------------------------------ */

  private async fetchWhereIn(table: string, column: string, ids: unknown[]): Promise<Row[]> {
    const dialect = this.db.getDialect();
    const holders = ids.map((_, i) =>
      dialect === 'postgres' ? `$${i + 1}` : '?',
    ).join(', ');
    return this.db.query<Row>(
      `SELECT * FROM ${this.q(table)} WHERE ${this.q(column)} IN (${holders})`,
      ids,
    );
  }

  private extractIds(records: Row[], key: string): unknown[] {
    return [...new Set(records.map((r) => r[key]).filter(Boolean))];
  }

  private fillEmpty(records: Row[], key: string, empty: unknown): Row[] {
    return records.map((r) => ({ ...r, [key]: empty }));
  }

  private parseNested(relation: string): [string, string | null] {
    const idx = relation.indexOf('.');
    return idx === -1
      ? [relation, null]
      : [relation.slice(0, idx), relation.slice(idx + 1)];
  }
}
