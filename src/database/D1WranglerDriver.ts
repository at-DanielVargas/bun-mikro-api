// src/database/D1WranglerDriver.ts
//
// DatabaseDriver that shells out to the Wrangler CLI for Cloudflare D1.
//
// --local  (default): `wrangler d1 execute --local`
//          Wrangler v4 stores the local SQLite in
//          .wrangler/state/v3/d1/miniflare-D1DatabaseObject/<hash>.sqlite
//          The hash is internal to Miniflare — we cannot compute it, so we
//          must delegate to the CLI even for local mode.
//
// --remote:           `wrangler d1 execute --remote`  (production D1)
//
// The driver auto-detects wrangler.toml / wrangler.json / wrangler.jsonc
// by walking up from cwd, then runs wrangler with the project directory as
// cwd and the config path passed explicitly via --config.

import { spawnSync }                         from 'node:child_process';
import { writeFileSync, unlinkSync,
         readFileSync, existsSync }           from 'node:fs';
import { join, resolve, dirname }            from 'node:path';
import { tmpdir }                            from 'node:os';
import type { DatabaseDriver, ExecuteResult } from './DatabaseDriver';

export interface D1WranglerOptions {
  /**
   * D1 binding name as defined in wrangler config (e.g. "DB").
   */
  database: string;
  /**
   * Target the local Miniflare database. Default: true.
   */
  local?: boolean;
  /**
   * Target remote production D1. Overrides local.
   */
  remote?: boolean;
  /**
   * Path to wrangler.toml / wrangler.json / wrangler.jsonc.
   * Auto-detected by walking up from cwd if omitted.
   */
  configPath?: string;
}

interface WranglerResult {
  results: Record<string, unknown>[];
  success: boolean;
  meta?: { last_row_id?: number; changes?: number };
}

// ── D1WranglerDriver ────────────────────────────────────────────────────────

export class D1WranglerDriver implements DatabaseDriver {
  private readonly remote: boolean;
  private configFile: string | null = null; // cached after first lookup

  constructor(private readonly opts: D1WranglerOptions) {
    this.remote = opts.remote === true;
  }

  getDialect(): 'sqlite' {
    return 'sqlite';
  }

  async execute(sql: string, params: unknown[] = []): Promise<ExecuteResult> {
    const out = this.runWrangler(this.interpolate(sql, params), true);
    try {
      const parsed = JSON.parse(out) as WranglerResult[];
      const meta   = parsed[0]?.meta;
      return {
        lastInsertId: meta?.last_row_id ?? 0,
        changes:      meta?.changes     ?? 0,
      };
    } catch {
      return { lastInsertId: 0, changes: 0 };
    }
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const out = this.runWrangler(this.interpolate(sql, params), true);
    try {
      const parsed = JSON.parse(out) as WranglerResult[];
      return (parsed[0]?.results ?? []) as T[];
    } catch {
      return [];
    }
  }

  async queryOne<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows[0] ?? null;
  }

  // ── Wrangler invocation ──────────────────────────────────────────────────

  /**
   * Write SQL to a temp file and invoke `wrangler d1 execute --file`.
   * The process runs with cwd = project root (where wrangler config lives)
   * so wrangler can find its local state directory.
   */
  private runWrangler(sql: string, json: boolean): string {
    const configFile = this.findWranglerConfig();
    const projectDir = dirname(resolve(configFile));
    const tmpFile    = join(tmpdir(), `mikro-migrate-${process.pid}-${Date.now()}.sql`);

    try {
      writeFileSync(tmpFile, sql, 'utf-8');

      const args: string[] = [
        'd1', 'execute', this.opts.database,
        '--file',   tmpFile,
        '--config', configFile,
      ];

      args.push(this.remote ? '--remote' : '--local');

      if (json) args.push('--json');

      const result = spawnSync('wrangler', args, {
        encoding: 'utf-8',
        cwd:      projectDir,              // critical: run in project root
        stdio:    ['ignore', 'pipe', 'pipe'], // capture both for error reporting
      });

      // Forward wrangler's stderr so warnings/progress are visible
      if (result.stderr) process.stderr.write(result.stderr);

      if (result.error) {
        throw new Error(`Failed to spawn wrangler: ${result.error.message}`);
      }

      if (result.status !== 0) {
        const detail = result.stderr?.trim() || result.stdout?.trim() || 'No output from wrangler.';
        throw new Error(
          `wrangler d1 execute failed (exit code ${result.status}):\n${detail}`,
        );
      }

      return result.stdout ?? '[]';
    } finally {
      try { unlinkSync(tmpFile); } catch { /* ignore cleanup errors */ }
    }
  }

  // ── Config detection ─────────────────────────────────────────────────────

  private findWranglerConfig(): string {
    if (this.configFile) return this.configFile;

    if (this.opts.configPath) {
      const p = resolve(this.opts.configPath);
      if (!existsSync(p)) throw new Error(`Wrangler config not found: ${p}`);
      this.configFile = p;
      return p;
    }

    // Walk up from cwd looking for any wrangler config file
    let dir = process.cwd();
    for (;;) {
      for (const name of ['wrangler.toml', 'wrangler.json', 'wrangler.jsonc']) {
        const candidate = join(dir, name);
        if (existsSync(candidate)) {
          this.configFile = candidate;
          return candidate;
        }
      }
      const parent = dirname(dir);
      if (parent === dir) break; // filesystem root
      dir = parent;
    }

    throw new Error(
      'Could not find wrangler.toml / wrangler.json / wrangler.jsonc.\n' +
      'Run from your Cloudflare Worker project directory, or pass --config=<path>.',
    );
  }

  // ── SQL interpolation ────────────────────────────────────────────────────

  /**
   * Interpolate ? placeholders — only for the MigrationRunner's internal
   * tracking queries (INSERT/DELETE/SELECT on `migrations`).
   * User migration SQL is passed without params so no interpolation happens.
   */
  private interpolate(sql: string, params: unknown[]): string {
    if (!params.length) return sql.trim();
    let i = 0;
    return sql.trim().replace(/\?/g, () => {
      const val = params[i++];
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number')           return String(val);
      return `'${String(val).replace(/'/g, "''")}'`;
    });
  }
}

// ── Wrangler config readers (exported for testing) ───────────────────────────

/**
 * Extract the database_id for a given binding name from any wrangler config.
 * Supports wrangler.toml, wrangler.json, and wrangler.jsonc.
 * Not needed by the driver at runtime (wrangler resolves it internally),
 * but exported for tooling that needs to inspect the config.
 */
export function readD1DatabaseId(configFile: string, bindingName: string): string | null {
  const content = readFileSync(configFile, 'utf-8');
  if (configFile.endsWith('.json') || configFile.endsWith('.jsonc')) {
    return readFromJson(content, bindingName);
  }
  return readFromToml(content, bindingName);
}

function readFromJson(content: string, bindingName: string): string | null {
  // Strip single-line and block comments for JSONC
  const stripped = content
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  try {
    const cfg = JSON.parse(stripped) as {
      d1_databases?: Array<{ binding?: string; database_id?: string }>;
    };
    return cfg.d1_databases?.find(d => d.binding === bindingName)?.database_id ?? null;
  } catch {
    return null;
  }
}

function readFromToml(content: string, bindingName: string): string | null {
  let inSection = false;
  let binding: string | null    = null;
  let dbId: string | null       = null;

  for (const raw of content.split('\n')) {
    const line = raw.trim();

    if (line === '[[d1_databases]]') {
      if (inSection && binding === bindingName && dbId) return dbId;
      inSection = true; binding = null; dbId = null;
      continue;
    }
    if (/^\[/.test(line)) {
      if (inSection && binding === bindingName && dbId) return dbId;
      inSection = false; continue;
    }
    if (!inSection || line.startsWith('#')) continue;

    const kv = line.match(/^(\w+)\s*=\s*["']?([^"'\s#]+)["']?/);
    if (!kv) continue;
    if (kv[1] === 'binding')     binding = kv[2]!;
    if (kv[1] === 'database_id') dbId    = kv[2]!;
  }

  if (inSection && binding === bindingName && dbId) return dbId;
  return null;
}
