// src/core/App.ts

import { Router } from './Router';
import { MikroRequest } from './MikroRequest';
import { MikroResponse } from './MikroResponse';
import { ServiceException } from './errors';
import { SwaggerGenerator, type SwaggerConfig } from '../swagger/SwaggerGenerator';
import { SwaggerUI } from '../swagger/SwaggerUI';
import { SwaggerAuth, type SwaggerUser } from '../swagger/SwaggerAuth';
import { LibraryDocsPage } from '../docs/LibraryDocsPage';
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
  /** HTML documentation guide path (default: /docs/guide) */
  docsPath?: string;
  /** Controllers to exclude from the spec */
  excludeControllers?: Array<new () => unknown>;
  /** Controllers to document (default: all registered) */
  controllers?: Array<new () => unknown>;
  /** Guards that imply Bearer authentication */
  authGuards?: GuardCtor[];
  /** Basic auth users for Swagger access */
  users?: SwaggerUser[];
}

export class App<Env = {}> {
  private readonly router = new Router<Env>();
  private corsOptions: CORSOptions | null = null;
  private registeredControllers: Array<new () => unknown> = [];
  private swaggerUI: SwaggerUI | null = null;
  private libraryDocs: { page: LibraryDocsPage; path: string; auth: SwaggerAuth } | null = null;

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
   * app.enableSwagger(
   *   { title: 'My API', version: '1.0.0' },
   *   { 
   *     users: [
   *       { username: 'admin', password: 'secret123' },
   *       { username: 'dev', password: 'dev123' }
   *     ]
   *   }
   * );
   * // Serves: GET /docs       →  Swagger UI
   * //         GET /docs/json  →  OpenAPI 3.0 JSON
   * //         GET /docs/guide →  HTML Documentation (ES/EN)
   */
  enableSwagger(config: SwaggerConfig = {}, options: SwaggerOptions = {}): this {
    const toDocument = options.controllers ?? this.registeredControllers;
    const exclude    = options.excludeControllers ?? [];

    const generator = new SwaggerGenerator();
    if (options.authGuards?.length) generator.setAuthGuards(options.authGuards);

    const spec = generator.generate(toDocument, exclude, config);

    // Setup authentication
    const auth = new SwaggerAuth(options.users ?? []);

    this.swaggerUI = new SwaggerUI(
      spec,
      options.path     ?? '/docs',
      options.jsonPath ?? '/docs/json',
      auth,
      options.docsPath ?? '/docs/guide',
    );

    return this;
  }

  /* ------------------------------------------------------------------ */
  /*  Library Documentation                                               */
  /* ------------------------------------------------------------------ */

  /**
   * Enables library documentation page with usage examples.
   *
   * @example
   * app.enableLibraryDocs('/docs/library', [
   *   { username: 'admin', password: 'admin123' }
   * ]);
   * // Serves: GET /docs/library  →  Library documentation (ES/EN)
   */
  enableLibraryDocs(path: string = '/docs/library', users: SwaggerUser[] = []): this {
    const auth = new SwaggerAuth(users);
    this.libraryDocs = {
      page: new LibraryDocsPage(path),
      path,
      auth
    };
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

      // Intercept library docs route
      if (this.libraryDocs !== null && path === this.libraryDocs.path) {
        if (!this.libraryDocs.auth.verify(request)) {
          return this.libraryDocs.auth.unauthorizedResponse();
        }
        const lang = url.searchParams.get('lang') === 'es' ? 'es' : 'en';
        const html = this.libraryDocs.page.generate(lang);
        const response = new Response(html, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
        return this.corsOptions ? this.applyCORS(response, request) : response;
      }

      // Intercept Swagger routes before normal dispatch
      if (this.swaggerUI !== null && this.swaggerUI.matches(path)) {
        return this.corsOptions
          ? this.applyCORS(this.swaggerUI.handle(path, request), request)
          : this.swaggerUI.handle(path, request);
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
