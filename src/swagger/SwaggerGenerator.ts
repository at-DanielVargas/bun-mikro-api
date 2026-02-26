// src/swagger/SwaggerGenerator.ts
// Reads MetadataStore (routing + validation decorators) and generates an OpenAPI 3.0 spec.

import { MetadataStore, type ApiDocMeta, type GuardCtor } from '../core/MetadataStore';
import { DtoSchemaBuilder } from './DtoSchemaBuilder';
import type { RequestDto } from '../validation/RequestDto';

export interface SwaggerConfig {
  title?: string;
  version?: string;
  description?: string;
  servers?: Array<{ url: string; description?: string }>;
}

type OpenApiSpec = Record<string, unknown>;

export class SwaggerGenerator {
  private readonly schemaBuilder = new DtoSchemaBuilder();
  private authGuards: GuardCtor[] = [];
  private isLegacySpec: boolean = false;

  /**
   * Guards whose presence on a route signals Bearer authentication.
   * Auto-detection also fires for guards whose class name contains 'Auth' or 'Jwt'.
   */
  setAuthGuards(guards: GuardCtor[]): this {
    this.authGuards = guards;
    return this;
  }

  generate(
    controllers: Array<new () => unknown>,
    excludeControllers: Array<new () => unknown>,
    config: SwaggerConfig,
    isLegacy: boolean = false,
  ): OpenApiSpec {
    this.isLegacySpec = isLegacy;
    const filtered = controllers.filter((c) => !excludeControllers.includes(c));

    const paths:   Record<string, Record<string, unknown>> = {};
    const tags:    Array<{ name: string; description?: string }> = [];
    const schemas: Record<string, unknown> = {};
    const tagNames = new Set<string>();

    for (const ControllerClass of filtered) {
      const { paths: cPaths, tags: cTags, schemas: cSchemas } =
        this.processController(ControllerClass);

      for (const [path, methods] of Object.entries(cPaths)) {
        paths[path] = { ...(paths[path] ?? {}), ...methods };
      }

      for (const tag of cTags) {
        if (!tagNames.has(tag.name)) {
          tags.push(tag);
          tagNames.add(tag.name);
        }
      }

      Object.assign(schemas, cSchemas);
    }

    // Sort paths alphabetically
    const sortedPaths = Object.fromEntries(
      Object.entries(paths).sort(([a], [b]) => a.localeCompare(b)),
    );

    return isLegacy 
      ? this.buildSwagger2Spec(sortedPaths, tags, schemas, config)
      : this.buildSpec(sortedPaths, tags, schemas, config);
  }

  /* ------------------------------------------------------------------ */
  /*  Per-controller processing                                           */
  /* ------------------------------------------------------------------ */

  private processController(ControllerClass: new () => unknown): {
    paths: Record<string, Record<string, unknown>>;
    tags: Array<{ name: string; description?: string }>;
    schemas: Record<string, unknown>;
  } {
    const paths:   Record<string, Record<string, unknown>> = {};
    const schemas: Record<string, unknown> = {};

    const ctrlMeta = MetadataStore.getController(ControllerClass);
    const prefix   = ctrlMeta ? `/${ctrlMeta.prefix}` : '';

    const tagName = this.resolveTagName(ControllerClass);
    const tagMeta = this.resolveTagMeta(ControllerClass, tagName);
    const classGs = MetadataStore.getClassGuards(ControllerClass);

    for (const [methodName, routeMeta] of MetadataStore.getRoutes(ControllerClass)) {
      const apiDoc = MetadataStore.getApiDoc(ControllerClass, methodName);

      // Excluded endpoints are skipped
      if (apiDoc?.exclude) continue;

      const httpMethod = routeMeta.method.toLowerCase();
      const rawPath    = routeMeta.path
        ? `${prefix}/${routeMeta.path.replace(/^\/+/, '')}`
        : prefix || '/';
      const fullPath    = this.normalizePath(rawPath);
      const swaggerPath = this.toSwaggerPath(fullPath);

      const methodGs = MetadataStore.getMethodGuards(ControllerClass, methodName);
      const allGuards = [...classGs, ...methodGs];

      const DtoClass = MetadataStore.getBody(ControllerClass, methodName) ?? null;

      if (DtoClass !== null) {
        const shortName    = this.dtoShortName(DtoClass);
        schemas[shortName] = this.schemaBuilder.build(DtoClass);
      }

      const operation = this.buildOperation({
        methodName,
        tagName,
        fullPath,
        guards: allGuards,
        DtoClass,
        apiDoc,
      });

      if (!paths[swaggerPath]) paths[swaggerPath] = {};
      paths[swaggerPath][httpMethod] = operation;
    }

    return { paths, tags: [tagMeta], schemas };
  }

  /* ------------------------------------------------------------------ */
  /*  Operation builder                                                   */
  /* ------------------------------------------------------------------ */

  private buildOperation(opts: {
    methodName: string;
    tagName: string;
    fullPath: string;
    guards: GuardCtor[];
    DtoClass: (new () => RequestDto) | null;
    apiDoc: ApiDocMeta | undefined;
  }): Record<string, unknown> {
    const { methodName, tagName, fullPath, guards, DtoClass, apiDoc } = opts;

    const operation: Record<string, unknown> = {
      tags:        [tagName],
      summary:     apiDoc?.summary ?? this.inferSummary(methodName),
      operationId: this.buildOperationId(tagName, methodName),
    };

    if (apiDoc?.description) operation['description'] = apiDoc.description;
    if (apiDoc?.deprecated)  operation['deprecated']  = true;

    // Path parameters (:id → {id})
    const pathParams = this.extractPathParams(fullPath);
    if (pathParams.length > 0) operation['parameters'] = pathParams;

    // Bearer security
    if (this.hasAuthGuard(guards)) {
      operation['security'] = [{ bearerAuth: [] }];
    }

    // Request body
    if (DtoClass !== null) {
      const shortName = this.dtoShortName(DtoClass);
      const schemaRef = this.isLegacySpec 
        ? `#/definitions/${shortName}`
        : `#/components/schemas/${shortName}`;
      
      if (this.isLegacySpec) {
        // Swagger 2.0 uses parameters array for body
        const params = operation['parameters'] as Array<Record<string, unknown>> || [];
        params.push({
          name: 'body',
          in: 'body',
          required: true,
          schema: { $ref: schemaRef },
        });
        operation['parameters'] = params;
      } else {
        // OpenAPI 3.0 uses requestBody
        operation['requestBody'] = {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: schemaRef },
            },
          },
        };
      }
    }

    operation['responses'] = this.buildResponses(apiDoc, DtoClass, guards);

    return operation;
  }

  /* ------------------------------------------------------------------ */
  /*  Responses                                                           */
  /* ------------------------------------------------------------------ */

  private buildResponses(
    apiDoc: ApiDocMeta | undefined,
    DtoClass: (new () => RequestDto) | null,
    guards: GuardCtor[],
  ): Record<string, unknown> {
    // Explicit responses take priority
    if (apiDoc?.responses && Object.keys(apiDoc.responses).length > 0) {
      return Object.fromEntries(
        Object.entries(apiDoc.responses).map(([code, desc]) => [
          String(code),
          { description: desc },
        ]),
      );
    }

    // Auto-infer
    const responses: Record<string, unknown> = {};

    if (DtoClass !== null) {
      responses['201'] = { description: 'Created' };
      responses['422'] = { description: 'Validation error' };
    } else {
      responses['200'] = { description: 'OK' };
    }

    if (this.hasAuthGuard(guards)) {
      responses['401'] = { description: 'Unauthorized' };
    }

    return responses;
  }

  /* ------------------------------------------------------------------ */
  /*  Full spec builder                                                   */
  /* ------------------------------------------------------------------ */

  private buildSpec(
    paths: Record<string, unknown>,
    tags: Array<{ name: string; description?: string }>,
    schemas: Record<string, unknown>,
    config: SwaggerConfig,
  ): OpenApiSpec {
    const spec: OpenApiSpec = {
      openapi: '3.0.3',
      info: {
        title:       config.title       ?? 'API',
        version:     config.version     ?? '1.0.0',
        description: config.description ?? '',
      },
      servers: config.servers ?? [{ url: '/', description: 'Default' }],
      tags,
      paths,
    };

    const components: Record<string, unknown> = {};

    if (Object.keys(schemas).length > 0) {
      components['schemas'] = schemas;
    }

    if (this.specHasAuth(paths as Record<string, Record<string, Record<string, unknown>>>)) {
      components['securitySchemes'] = {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      };
    }

    if (Object.keys(components).length > 0) {
      spec['components'] = components;
    }

    return spec;
  }

  private buildSwagger2Spec(
    paths: Record<string, unknown>,
    tags: Array<{ name: string; description?: string }>,
    schemas: Record<string, unknown>,
    config: SwaggerConfig,
  ): OpenApiSpec {
    const spec: OpenApiSpec = {
      swagger: '2.0',
      info: {
        title:       config.title       ?? 'API',
        version:     config.version     ?? '1.0.0',
        description: config.description ?? '',
      },
      host: this.extractHost(config.servers),
      basePath: this.extractBasePath(config.servers),
      schemes: this.extractSchemes(config.servers),
      tags,
      paths,
    };

    if (Object.keys(schemas).length > 0) {
      spec['definitions'] = schemas;
    }

    if (this.specHasAuth(paths as Record<string, Record<string, Record<string, unknown>>>)) {
      spec['securityDefinitions'] = {
        bearerAuth: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
          description: 'Bearer token authentication. Format: Bearer {token}',
        },
      };
    }

    return spec;
  }

  private extractHost(servers?: Array<{ url: string; description?: string }>): string {
    if (!servers || servers.length === 0) return '';
    const url = servers[0].url;
    try {
      const parsed = new URL(url);
      return parsed.host;
    } catch {
      return '';
    }
  }

  private extractBasePath(servers?: Array<{ url: string; description?: string }>): string {
    if (!servers || servers.length === 0) return '/';
    const url = servers[0].url;
    try {
      const parsed = new URL(url);
      return parsed.pathname || '/';
    } catch {
      // If it's a relative path
      return url.startsWith('/') ? url : '/';
    }
  }

  private extractSchemes(servers?: Array<{ url: string; description?: string }>): string[] {
    if (!servers || servers.length === 0) return ['http'];
    const url = servers[0].url;
    try {
      const parsed = new URL(url);
      return [parsed.protocol.replace(':', '')];
    } catch {
      return ['http'];
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                             */
  /* ------------------------------------------------------------------ */

  private resolveTagName(ControllerClass: new () => unknown): string {
    const tag = MetadataStore.getApiTag(ControllerClass);
    if (tag) return tag.name;
    return ControllerClass.name.replace(/Controller$/i, '');
  }

  private resolveTagMeta(
    ControllerClass: new () => unknown,
    tagName: string,
  ): { name: string; description?: string } {
    const tag = MetadataStore.getApiTag(ControllerClass);
    return tag ? { name: tag.name, description: tag.description } : { name: tagName };
  }

  private extractPathParams(path: string): Array<Record<string, unknown>> {
    const matches = [...path.matchAll(/:([a-zA-Z_][a-zA-Z0-9_]*)/g)];
    return matches.map((m) => ({
      name:     m[1],
      in:       'path',
      required: true,
      schema:   { type: 'string' },
    }));
  }

  private hasAuthGuard(guards: GuardCtor[]): boolean {
    return guards.some((g) => {
      if (this.authGuards.includes(g)) return true;
      const name = g.name ?? '';
      return /auth|jwt/i.test(name);
    });
  }

  private specHasAuth(paths: Record<string, Record<string, Record<string, unknown>>>): boolean {
    return Object.values(paths).some((methods) =>
      Object.values(methods).some((op) => op['security'] !== undefined),
    );
  }

  private normalizePath(path: string): string {
    const p = '/' + path.replace(/^\/+|\/+$/g, '');
    return p === '/' ? '/' : p.replace(/\/+/g, '/');
  }

  private toSwaggerPath(path: string): string {
    return path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '{$1}');
  }

  private dtoShortName(DtoClass: new () => unknown): string {
    return DtoClass.name;
  }

  private buildOperationId(tag: string, method: string): string {
    return tag.charAt(0).toLowerCase() + tag.slice(1) + method.charAt(0).toUpperCase() + method.slice(1);
  }

  private inferSummary(methodName: string): string {
    const spaced = methodName.replace(/([A-Z])/g, ' $1');
    return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
  }
}
