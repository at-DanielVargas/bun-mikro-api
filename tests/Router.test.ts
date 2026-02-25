// tests/Router.test.ts

import { describe, it, expect } from 'bun:test';
import { App }          from '../src/core/App';
import { MikroRequest } from '../src/core/MikroRequest';
import { MikroResponse } from '../src/core/MikroResponse';
import { Controller }   from '../src/decorators/routing/Controller';
import { Get, Post, Delete } from '../src/decorators/routing/methods';
import { Body }         from '../src/decorators/routing/Body';
import { UseGuards }    from '../src/decorators/routing/UseGuards';
import { BaseGuard }    from '../src/guards/BaseGuard';
import { RequestDto }   from '../src/validation/RequestDto';
import { Required, IsString } from '../src/decorators/validation/index';

/* ---- Fixtures -------------------------------------------------------- */

class CreateItemDto extends RequestDto {
  @Required()
  @IsString()
  name!: string;
}

class DenyGuard extends BaseGuard {
  canActivate(_req: MikroRequest): boolean { return false; }
}

class AllowGuard extends BaseGuard {
  canActivate(_req: MikroRequest): boolean { return true; }
}

@Controller('items')
class ItemController {
  @Get()
  index(_req: MikroRequest) {
    return MikroResponse.json([{ id: 1, name: 'Widget' }]);
  }

  @Get(':id')
  show(req: MikroRequest) {
    return MikroResponse.json({ id: req.params['id'] });
  }

  @Post()
  @Body(CreateItemDto)
  create(req: MikroRequest) {
    const dto = req.dto as CreateItemDto;
    return MikroResponse.json({ name: dto.name }, 201);
  }

  @Get('protected')
  @UseGuards(DenyGuard)
  protected(_req: MikroRequest) {
    return MikroResponse.json({ secret: true });
  }
}

const app = new App();
app.useController(ItemController);

async function req(method: string, path: string, body?: unknown): Promise<Response> {
  const init: RequestInit = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json' };
  }
  return app.fetch(
    new Request(`http://localhost${path}`, init),
    {},
    {} as ExecutionContext,
  );
}

/* ---- Tests ----------------------------------------------------------- */

describe('Router', () => {
  it('GET /items returns 200', async () => {
    const res = await req('GET', '/items');
    expect(res.status).toBe(200);
    const body = await res.json() as unknown[];
    expect(body).toHaveLength(1);
  });

  it('GET /items/:id returns param', async () => {
    const res = await req('GET', '/items/42');
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body['id']).toBe('42');
  });

  it('POST /items validates body and returns 201', async () => {
    const res = await req('POST', '/items', { name: 'Gadget' });
    expect(res.status).toBe(201);
    const body = await res.json() as Record<string, unknown>;
    expect(body['name']).toBe('Gadget');
  });

  it('POST /items with missing name returns 422', async () => {
    const res = await req('POST', '/items', {});
    expect(res.status).toBe(422);
    const body = await res.json() as Record<string, unknown>;
    expect(body['errors']).toBeDefined();
  });

  it('GET /unknown returns 404', async () => {
    const res = await req('GET', '/unknown');
    expect(res.status).toBe(404);
  });

  it('Guard denies access and returns 401', async () => {
    const res = await req('GET', '/items/protected');
    expect(res.status).toBe(401);
  });
});

describe('App – CORS', () => {
  const corsApp = new App().useController(ItemController).enableCORS();

  it('handles OPTIONS preflight', async () => {
    const res = await corsApp.fetch(
      new Request('http://localhost/items', { method: 'OPTIONS', headers: { Origin: 'https://example.com' } }),
      {},
      {} as ExecutionContext,
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('adds CORS headers to normal response', async () => {
    const res = await corsApp.fetch(
      new Request('http://localhost/items', { method: 'GET', headers: { Origin: 'https://example.com' } }),
      {},
      {} as ExecutionContext,
    );
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});
