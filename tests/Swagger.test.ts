// tests/Swagger.test.ts

import { describe, it, expect } from 'bun:test';
import { App }           from '../src/core/App';
import { Controller }    from '../src/decorators/routing/Controller';
import { Get, Post, Delete } from '../src/decorators/routing/methods';
import { Body }          from '../src/decorators/routing/Body';
import { UseGuards }     from '../src/decorators/routing/UseGuards';
import { ApiDoc }        from '../src/decorators/routing/ApiDoc';
import { ApiTag }        from '../src/decorators/routing/ApiTag';
import { BaseGuard }     from '../src/guards/BaseGuard';
import { RequestDto }    from '../src/validation/RequestDto';
import { MikroRequest }  from '../src/core/MikroRequest';
import {
  Required, Optional, IsString, IsInt, IsEmail, IsIn, MinLength, Max,
} from '../src/decorators/validation/index';
import { SwaggerGenerator } from '../src/swagger/SwaggerGenerator';
import { DtoSchemaBuilder }  from '../src/swagger/DtoSchemaBuilder';
import { SwaggerUI }         from '../src/swagger/SwaggerUI';

/* ---- Fixtures -------------------------------------------------------- */

class CreateUserDto extends RequestDto {
  @Required()
  @IsString()
  @MinLength(2)
  name!: string;

  @Required()
  @IsEmail()
  email!: string;

  @Optional()
  @IsInt()
  @Max(150)
  age?: number;
}

class UpdateUserDto extends RequestDto {
  @Optional()
  @IsString()
  name?: string;

  @Optional()
  @IsIn(['admin', 'user'])
  role?: string;
}

class JwtAuthGuard extends BaseGuard {
  canActivate(_req: MikroRequest): boolean { return true; }
}

@Controller('users')
@ApiTag({ name: 'Users', description: 'User management' })
class UserController {
  @Get()
  @ApiDoc({ summary: 'List all users' })
  index(_req: MikroRequest) { return []; }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(_req: MikroRequest) { return {}; }

  @Post()
  @Body(CreateUserDto)
  @ApiDoc({
    summary: 'Create a user',
    responses: { 201: 'User created', 422: 'Validation error' },
  })
  create(_req: MikroRequest) { return {}; }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiDoc({ summary: 'Delete user', deprecated: true })
  remove(_req: MikroRequest) { return {}; }

  @Get('internal')
  @ApiDoc({ exclude: true })
  internal(_req: MikroRequest) { return {}; }
}

@Controller('products')
class ProductController {
  @Get()
  list(_req: MikroRequest) { return []; }
}

/* ---- Tests ----------------------------------------------------------- */

describe('DtoSchemaBuilder', () => {
  const builder = new DtoSchemaBuilder();

  it('builds schema from DTO validation rules', () => {
    const schema = builder.build(CreateUserDto);
    expect(schema.type).toBe('object');
    expect(schema.properties['name']).toBeDefined();
    expect(schema.properties['email']).toBeDefined();
    expect(schema.properties['age']).toBeDefined();
  });

  it('marks required fields correctly', () => {
    const schema = builder.build(CreateUserDto);
    expect(schema.required).toContain('name');
    expect(schema.required).toContain('email');
    expect(schema.required).not.toContain('age');
  });

  it('maps IsString → type string', () => {
    const schema = builder.build(CreateUserDto);
    expect(schema.properties['name']['type']).toBe('string');
  });

  it('maps IsEmail → format email', () => {
    const schema = builder.build(CreateUserDto);
    expect(schema.properties['email']['format']).toBe('email');
  });

  it('maps MinLength → minLength', () => {
    const schema = builder.build(CreateUserDto);
    expect(schema.properties['name']['minLength']).toBe(2);
  });

  it('maps IsInt → type integer', () => {
    const schema = builder.build(CreateUserDto);
    expect(schema.properties['age']['type']).toBe('integer');
  });

  it('maps Max → maximum', () => {
    const schema = builder.build(CreateUserDto);
    expect(schema.properties['age']['maximum']).toBe(150);
  });

  it('maps IsIn → enum', () => {
    const schema = builder.build(UpdateUserDto);
    expect(schema.properties['role']['enum']).toEqual(['admin', 'user']);
  });
});

describe('SwaggerGenerator', () => {
  const generator = new SwaggerGenerator();
  generator.setAuthGuards([JwtAuthGuard]);

  const spec = generator.generate(
    [UserController, ProductController],
    [],
    { title: 'Test API', version: '2.0.0' },
  ) as Record<string, unknown>;

  it('generates openapi 3.0.3 spec', () => {
    expect(spec['openapi']).toBe('3.0.3');
  });

  it('populates info', () => {
    const info = spec['info'] as Record<string, unknown>;
    expect(info['title']).toBe('Test API');
    expect(info['version']).toBe('2.0.0');
  });

  it('includes both controller tags', () => {
    const tags = spec['tags'] as Array<{ name: string }>;
    const names = tags.map((t) => t.name);
    expect(names).toContain('Users');
    expect(names).toContain('Product');
  });

  it('uses @ApiTag name and description', () => {
    const tags = spec['tags'] as Array<{ name: string; description?: string }>;
    const users = tags.find((t) => t.name === 'Users')!;
    expect(users.description).toBe('User management');
  });

  it('generates paths for all non-excluded routes', () => {
    const paths = spec['paths'] as Record<string, unknown>;
    expect(paths['/users']).toBeDefined();
    expect(paths['/users/{id}']).toBeDefined();
    expect(paths['/products']).toBeDefined();
  });

  it('excludes endpoint decorated with @ApiDoc({ exclude: true })', () => {
    const paths = spec['paths'] as Record<string, unknown>;
    // /users/internal should not appear
    expect(paths['/users/internal']).toBeUndefined();
  });

  it('uses @ApiDoc summary', () => {
    const paths = spec['paths'] as Record<string, Record<string, Record<string, unknown>>>;
    expect(paths['/users']['get']['summary']).toBe('List all users');
  });

  it('uses explicit responses from @ApiDoc', () => {
    const paths = spec['paths'] as Record<string, Record<string, Record<string, unknown>>>;
    const responses = paths['/users']['post']['responses'] as Record<string, unknown>;
    expect(responses['201']).toBeDefined();
    expect(responses['422']).toBeDefined();
  });

  it('marks deprecated endpoints', () => {
    const paths = spec['paths'] as Record<string, Record<string, Record<string, unknown>>>;
    expect(paths['/users/{id}']['delete']['deprecated']).toBe(true);
  });

  it('adds security to auth-guarded routes', () => {
    const paths = spec['paths'] as Record<string, Record<string, Record<string, unknown>>>;
    expect(paths['/users/{id}']['get']['security']).toBeDefined();
    expect(paths['/users']['get']['security']).toBeUndefined();
  });

  it('includes bearerAuth security scheme when auth guards are present', () => {
    const components = spec['components'] as Record<string, unknown>;
    const schemes = components['securitySchemes'] as Record<string, unknown>;
    expect(schemes['bearerAuth']).toBeDefined();
  });

  it('includes DTO schema in components', () => {
    const components = spec['components'] as Record<string, unknown>;
    const schemas = components['schemas'] as Record<string, unknown>;
    expect(schemas['CreateUserDto']).toBeDefined();
  });

  it('adds $ref to requestBody for POST with @Body', () => {
    const paths = spec['paths'] as Record<string, Record<string, Record<string, unknown>>>;
    const requestBody = paths['/users']['post']['requestBody'] as Record<string, unknown>;
    const content = requestBody['content'] as Record<string, Record<string, unknown>>;
    const schemaRef = content['application/json']['schema'] as Record<string, unknown>;
    expect(schemaRef['$ref']).toBe('#/components/schemas/CreateUserDto');
  });

  it('adds path parameters for :param routes', () => {
    const paths = spec['paths'] as Record<string, Record<string, Record<string, unknown>>>;
    const params = paths['/users/{id}']['get']['parameters'] as Array<{ name: string; in: string }>;
    expect(params.some((p) => p.name === 'id' && p.in === 'path')).toBe(true);
  });

  it('excludes specified controllers', () => {
    const specFiltered = generator.generate(
      [UserController, ProductController],
      [ProductController],
      {},
    ) as Record<string, unknown>;
    const paths = specFiltered['paths'] as Record<string, unknown>;
    expect(paths['/products']).toBeUndefined();
    expect(paths['/users']).toBeDefined();
  });
});

describe('SwaggerUI', () => {
  const spec = { openapi: '3.0.3', info: { title: 'My API', version: '1.0' }, paths: {} };
  const ui = new SwaggerUI(spec, '/docs', '/docs/json');

  it('matches /docs and /docs/json', () => {
    expect(ui.matches('/docs')).toBe(true);
    expect(ui.matches('/docs/json')).toBe(true);
    expect(ui.matches('/other')).toBe(false);
  });

  it('serves JSON spec at /docs/json', async () => {
    const res = ui.handle('/docs/json');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/json');
    const body = await res.json() as Record<string, unknown>;
    expect(body['openapi']).toBe('3.0.3');
  });

  it('serves HTML at /docs', async () => {
    const res = ui.handle('/docs');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('swagger-ui');
    expect(html).toContain('/docs/json');
    expect(html).toContain('My API');
  });
});

describe('App.enableSwagger()', () => {
  const app = new App()
    .useController(UserController)
    .enableSwagger({ title: 'Worker API', version: '3.0.0' });

  async function req(path: string): Promise<Response> {
    return app.fetch(
      new Request(`http://localhost${path}`),
      {},
      {} as ExecutionContext,
    );
  }

  it('GET /docs returns HTML', async () => {
    const res = await req('/docs');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/html');
  });

  it('GET /docs/json returns OpenAPI spec', async () => {
    const res = await req('/docs/json');
    expect(res.status).toBe(200);
    const spec = await res.json() as Record<string, unknown>;
    expect(spec['openapi']).toBe('3.0.3');
    const info = spec['info'] as Record<string, unknown>;
    expect(info['title']).toBe('Worker API');
  });

  it('normal routes still work alongside swagger', async () => {
    const res = await req('/users');
    expect(res.status).toBe(200);
  });
});
