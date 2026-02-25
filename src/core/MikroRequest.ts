// src/core/MikroRequest.ts

export class MikroRequest<Env = {}> {
  readonly raw: Request;
  readonly env: Env;
  readonly method: string;
  readonly path: string;
  readonly query: Record<string, string>;
  params: Record<string, string> = {};
  body: Record<string, unknown> = {};
  dto: unknown | null = null;

  constructor(raw: Request, env: Env, body: Record<string, unknown> = {}) {
    this.raw = raw;
    this.env = env;
    this.method = raw.method.toUpperCase();
    const url = new URL(raw.url);
    this.path = url.pathname;
    const queryObj: Record<string, string> = {};
    url.searchParams.forEach((v, k) => { queryObj[k] = v; });
    this.query = queryObj;
    this.body = body;
  }

  get headers(): Headers {
    return this.raw.headers;
  }

  header(name: string): string | null {
    return this.raw.headers.get(name);
  }

  /**
   * Parse and cache the body as JSON.
   * Call this once before dispatch; guards and validators read from this.body.
   */
  static async fromRequest<Env = {}>(raw: Request, env: Env): Promise<MikroRequest<Env>> {
    let body: Record<string, unknown> = {};
    const contentType = raw.headers.get('content-type') ?? '';

    if (['POST', 'PUT', 'PATCH'].includes(raw.method.toUpperCase())) {
      if (contentType.includes('application/json')) {
        try {
          body = (await raw.json()) as Record<string, unknown>;
        } catch {
          body = {};
        }
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        try {
          const text = await raw.text();
          const bodyObj: Record<string, string> = {};
          new URLSearchParams(text).forEach((v, k) => { bodyObj[k] = v; });
          body = bodyObj;
        } catch {
          body = {};
        }
      }
    }

    return new MikroRequest<Env>(raw, env, body);
  }
}
