// src/core/MetadataStore.ts
// Central singleton that replaces reflect-metadata.
// Decorators write here at module-load time; Router and Validator read at request time.

import type { RequestDto } from '../validation/RequestDto';

/* ------------------------------------------------------------------ */
/*  Type definitions                                                    */
/* ------------------------------------------------------------------ */

export interface ControllerMeta {
  prefix: string;
}

export interface RouteMeta {
  method: string;
  path: string;
}

export interface ValidationRule {
  type: string;
  message: string;
  [key: string]: unknown;
}

export interface TableMeta {
  name: string;
  timestamps: boolean;
  softDeletes: boolean;
}

export interface ColumnMeta {
  name: string;
  type: string;
  nullable: boolean;
  unique: boolean;
  primary: boolean;
  default?: unknown;
  foreignKey?: { table: string; column: string; onDelete?: string };
}

export interface RelationMeta {
  type: 'hasMany' | 'hasOne' | 'belongsTo' | 'belongsToMany';
  repository: new () => unknown;
  foreignKey: string;
  localKey?: string;
  ownerKey?: string;
  pivotTable?: string;
  relatedKey?: string;
  relatedPk?: string;
  pivotColumns?: string[];
  as?: string;
}

export type GuardCtor = new () => { canActivate(req: unknown): boolean | Promise<boolean>; deny(): Response };

export interface ApiDocMeta {
  summary?: string;
  description?: string;
  deprecated?: boolean;
  responses?: Record<string, string>;
  exclude?: boolean;
}

export interface ApiTagMeta {
  name: string;
  description?: string;
}

/* ------------------------------------------------------------------ */
/*  The five core Maps                                                  */
/* ------------------------------------------------------------------ */

const controllerMeta = new Map<Function, ControllerMeta>();
const routeMeta      = new Map<Function, Map<string, RouteMeta>>();
const bodyMeta       = new Map<Function, Map<string, new () => RequestDto>>();
const methodGuards   = new Map<Function, Map<string, GuardCtor[]>>();
const classGuards    = new Map<Function, GuardCtor[]>();
const validationMeta = new Map<Function, Map<string, ValidationRule[]>>();
const optionalFields = new Map<Function, Set<string>>();
const apiDocMeta     = new Map<Function, Map<string, ApiDocMeta>>();
const apiTagMeta     = new Map<Function, ApiTagMeta>();
const tableMeta      = new Map<Function, TableMeta>();
const columnMeta     = new Map<Function, Map<string, ColumnMeta>>();
const relationMeta   = new Map<Function, Map<string, RelationMeta>>();

/* ------------------------------------------------------------------ */
/*  Controller metadata                                                 */
/* ------------------------------------------------------------------ */

export const MetadataStore = {
  setController(target: Function, meta: ControllerMeta): void {
    controllerMeta.set(target, meta);
  },

  getController(target: Function): ControllerMeta | undefined {
    return controllerMeta.get(target);
  },

  /* ---------------------------------------------------------------- */
  /*  Route metadata                                                   */
  /* ---------------------------------------------------------------- */

  setRoute(target: Function, methodName: string, meta: RouteMeta): void {
    if (!routeMeta.has(target)) routeMeta.set(target, new Map());
    routeMeta.get(target)!.set(methodName, meta);
  },

  getRoutes(target: Function): Map<string, RouteMeta> {
    return routeMeta.get(target) ?? new Map();
  },

  /* ---------------------------------------------------------------- */
  /*  Body DTO metadata                                                */
  /* ---------------------------------------------------------------- */

  setBody(target: Function, methodName: string, dtoCtor: new () => RequestDto): void {
    if (!bodyMeta.has(target)) bodyMeta.set(target, new Map());
    bodyMeta.get(target)!.set(methodName, dtoCtor);
  },

  getBody(target: Function, methodName: string): (new () => RequestDto) | undefined {
    return bodyMeta.get(target)?.get(methodName);
  },

  /* ---------------------------------------------------------------- */
  /*  Guard metadata                                                   */
  /* ---------------------------------------------------------------- */

  setMethodGuards(target: Function, methodName: string, guards: GuardCtor[]): void {
    if (!methodGuards.has(target)) methodGuards.set(target, new Map());
    const existing = methodGuards.get(target)!.get(methodName) ?? [];
    methodGuards.get(target)!.set(methodName, [...existing, ...guards]);
  },

  getMethodGuards(target: Function, methodName: string): GuardCtor[] {
    return methodGuards.get(target)?.get(methodName) ?? [];
  },

  setClassGuards(target: Function, guards: GuardCtor[]): void {
    const existing = classGuards.get(target) ?? [];
    classGuards.set(target, [...existing, ...guards]);
  },

  getClassGuards(target: Function): GuardCtor[] {
    return classGuards.get(target) ?? [];
  },

  /* ---------------------------------------------------------------- */
  /*  Validation metadata                                              */
  /* ---------------------------------------------------------------- */

  addValidationRule(target: Function, field: string, rule: ValidationRule): void {
    if (!validationMeta.has(target)) validationMeta.set(target, new Map());
    const fieldRules = validationMeta.get(target)!.get(field) ?? [];
    fieldRules.push(rule);
    validationMeta.get(target)!.set(field, fieldRules);
  },

  getValidationRules(target: Function): Map<string, ValidationRule[]> {
    return validationMeta.get(target) ?? new Map();
  },

  setOptional(target: Function, field: string): void {
    if (!optionalFields.has(target)) optionalFields.set(target, new Set());
    optionalFields.get(target)!.add(field);
  },

  isOptional(target: Function, field: string): boolean {
    return optionalFields.get(target)?.has(field) ?? false;
  },

  getOptionalFields(target: Function): Set<string> {
    return optionalFields.get(target) ?? new Set();
  },

  /* ---------------------------------------------------------------- */
  /*  ApiDoc / ApiTag metadata                                        */
  /* ---------------------------------------------------------------- */

  setApiDoc(target: Function, methodName: string, meta: ApiDocMeta): void {
    if (!apiDocMeta.has(target)) apiDocMeta.set(target, new Map());
    apiDocMeta.get(target)!.set(methodName, meta);
  },

  getApiDoc(target: Function, methodName: string): ApiDocMeta | undefined {
    return apiDocMeta.get(target)?.get(methodName);
  },

  setApiTag(target: Function, meta: ApiTagMeta): void {
    apiTagMeta.set(target, meta);
  },

  getApiTag(target: Function): ApiTagMeta | undefined {
    return apiTagMeta.get(target);
  },

  /* ---------------------------------------------------------------- */
  /*  Schema metadata                                                  */
  /* ---------------------------------------------------------------- */

  setTable(target: Function, meta: TableMeta): void {
    tableMeta.set(target, meta);
  },

  getTable(target: Function): TableMeta | undefined {
    return tableMeta.get(target);
  },

  setColumn(target: Function, field: string, meta: ColumnMeta): void {
    if (!columnMeta.has(target)) columnMeta.set(target, new Map());
    columnMeta.get(target)!.set(field, meta);
  },

  getColumns(target: Function): Map<string, ColumnMeta> {
    return columnMeta.get(target) ?? new Map();
  },

  setRelation(target: Function, field: string, meta: RelationMeta): void {
    if (!relationMeta.has(target)) relationMeta.set(target, new Map());
    relationMeta.get(target)!.set(field, meta);
  },

  getRelations(target: Function): Map<string, RelationMeta> {
    return relationMeta.get(target) ?? new Map();
  },
};
