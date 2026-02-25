// src/core/App.ts

import { Router } from './Router';
import { MikroRequest } from './MikroRequest';
import { MikroResponse } from './MikroResponse';
import { ServiceException } from './errors';
import { SwaggerGenerator, type SwaggerConfig } from '../swagger/SwaggerGenerator';
import { SwaggerUI } from '../swagger/SwaggerUI';
import type { GuardCtor } from './MetadataStore';

export interface CORSOptions {
  origin?: string | string[];
  methods?: string | string[];
  allowedHeaders?: string | string[];
  credentials?: boolean;
  maxAge?: number;
  optionsSuccessStatus?: number;
}

/**
 * Main application class. Use as Cloudflare Worker default export.
 *
 * @example
 * const app = new App<Env>();
 * app.useController(UserController);
 * app.enableCORS();
 * export default app;
 */
export interface SwaggerOptions {
  /** Swagger UI path (default: /docs) */
  path?: string;
  /** OpenAPI JSON spec path (default: /docs/json) */
  jsonPath?: string;
  /** Controllers to exclude from the spec */
  excludeControllers?: Array<new () => unknown>;
  /** Controllers to document (default: all registered) */
  controllers?: Array<new () => unknown>;
  /** Guards that imply Bearer authentication */
  authGuards?: GuardCtor[];
}

export class App<Env = {}> {
  private readonly router = new Router<Env>();
  private corsOptions: CORSOptions | null = null;
  private registeredControllers: Array<new () => unknown> = [];
  private swaggerUI: SwaggerUI | null = null;

  /* ------------------------------------------------------------------ */
  /*  Controller registration                                             */
  /* ------------------------------------------------------------------ */

  useController(...controllers: Array<new () => unknown>): this {
    for (const ctrl of controllers) {
      this.registeredControllers.push(ctrl);
      this.router.registerController(ctrl);
    }
    return this;
  }

  /* ------------------------------------------------------------------ */
  /*  Swagger                                                             */
  /* ------------------------------------------------------------------ */

  /**
   * Enables auto-generated Swagger UI documentation.
   *
   * @example
   * app.enableSwagger({ title: 'My API', version: '1.0.0' });
   * // Serves: GET /docs  →  Swagger UI
   * //         GET /docs/json  →  OpenAPI 3.0 JSON
   */
  enableSwagger(config: SwaggerConfig = {}, options: SwaggerOptions = {}): this {
    const toDocument = options.controllers ?? this.registeredControllers;
    const exclude    = options.excludeControllers ?? [];

    const generator = new SwaggerGenerator();
    if (options.authGuards?.length) generator.setAuthGuards(options.authGuards);

    const spec = generator.generate(toDocument, exclude, config);

    this.swaggerUI = new SwaggerUI(
      spec,
      options.path     ?? '/docs',
      options.jsonPath ?? '/docs/json',
    );

    return this;
  }

  /* ------------------------------------------------------------------ */
  /*  CORS                                                                */
  /* ------------------------------------------------------------------ */

  enableCORS(options: CORSOptions = {}): this {
    this.corsOptions = {
      origin: '*',
      methods: 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      allowedHeaders: 'Content-Type, Authorization',
      credentials: false,
      optionsSuccessStatus: 204,
      ...options,
    };
    return this;
  }

  /* ------------------------------------------------------------------ */
  /*  Cloudflare Worker fetch handler                                     */
  /* ------------------------------------------------------------------ */

  fetch = async (request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> => {
    // CORS preflight
    if (this.corsOptions && request.method === 'OPTIONS') {
      return this.applyCORS(
        new Response(null, { status: this.corsOptions.optionsSuccessStatus ?? 204 }),
        request,
      );
    }

    let response: Response;

    try {
      const url  = new URL(request.url);
      const path = url.pathname;

      // Intercept Swagger routes before normal dispatch
      if (this.swaggerUI !== null && this.swaggerUI.matches(path)) {
        return this.corsOptions
          ? this.applyCORS(this.swaggerUI.handle(path), request)
          : this.swaggerUI.handle(path);
      }

      const mikro = await MikroRequest.fromRequest<Env>(request, env);
      response = await this.router.dispatch(mikro);
    } catch (err) {
      if (err instanceof ServiceException) {
        response = MikroResponse.error(err.message, err.statusCode);
      } else {
        const message = err instanceof Error ? err.message : 'Internal Server Error';
        response = MikroResponse.error(message, 500);
      }
    }

    return this.corsOptions ? this.applyCORS(response, request) : response;
  };

  /* ------------------------------------------------------------------ */
  /*  CORS helper                                                         */
  /* ------------------------------------------------------------------ */

  private applyCORS(response: Response, request: Request): Response {
    const opts = this.corsOptions!;
    const headers = new Headers(response.headers);

    // Determine allowed origin
    const origin = request.headers.get('Origin') ?? '';
    const originOpt = opts.origin ?? '*';
    let allowOrigin = '';

    if (Array.isArray(originOpt)) {
      allowOrigin = originOpt.includes(origin) ? origin : (originOpt.includes('*') ? '*' : '');
    } else {
      allowOrigin = originOpt;
    }

    if (allowOrigin) {
      headers.set('Access-Control-Allow-Origin', allowOrigin);
      if (allowOrigin !== '*') headers.set('Vary', 'Origin');
    }

    const methods = Array.isArray(opts.methods) ? opts.methods.join(', ') : (opts.methods ?? '');
    if (methods) headers.set('Access-Control-Allow-Methods', methods);

    const allowedHeaders = Array.isArray(opts.allowedHeaders)
      ? opts.allowedHeaders.join(', ')
      : (opts.allowedHeaders ?? '');
    if (allowedHeaders) {
      headers.set('Access-Control-Allow-Headers', allowedHeaders);
    } else {
      const requestedHeaders = request.headers.get('Access-Control-Request-Headers');
      if (requestedHeaders) headers.set('Access-Control-Allow-Headers', requestedHeaders);
    }

    if (opts.credentials) headers.set('Access-Control-Allow-Credentials', 'true');
    if (opts.maxAge !== undefined) headers.set('Access-Control-Max-Age', String(opts.maxAge));

    // CF Workers: cannot mutate headers post-construction, so rebuild Response
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
}
