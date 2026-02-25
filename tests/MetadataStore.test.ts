// tests/MetadataStore.test.ts

import { describe, it, expect, beforeEach } from 'bun:test';
import { MetadataStore } from '../src/core/MetadataStore';
import { Controller }   from '../src/decorators/routing/Controller';
import { Get, Post }    from '../src/decorators/routing/methods';
import { Body }         from '../src/decorators/routing/Body';
import { UseGuards }    from '../src/decorators/routing/UseGuards';
import { Required, IsString, IsEmail } from '../src/decorators/validation/index';
import { Table }       from '../src/decorators/schema/Table';
import { Column }      from '../src/decorators/schema/Column';
import { PrimaryKey }  from '../src/decorators/schema/PrimaryKey';
import { Timestamps }  from '../src/decorators/schema/Timestamps';
import { SoftDeletes } from '../src/decorators/schema/SoftDeletes';
import { RequestDto }   from '../src/validation/RequestDto';
import { BaseGuard }    from '../src/guards/BaseGuard';
import { MikroRequest } from '../src/core/MikroRequest';

/* ------------------------------------------------------------------ */
/*  Fixtures                                                            */
/* ------------------------------------------------------------------ */

class TestDto extends RequestDto {
  @Required()
  @IsString()
  name!: string;

  @Required()
  @IsEmail()
  email!: string;
}

class MockGuard extends BaseGuard {
  canActivate(_req: MikroRequest): boolean { return true; }
}

@Controller('users')
class UserController {
  @Get(':id')
  findOne(_req: MikroRequest) { return {}; }

  @Post()
  @Body(TestDto)
  @UseGuards(MockGuard)
  create(_req: MikroRequest) { return {}; }
}

@UseGuards(MockGuard)
@Controller('admin')
class AdminController {
  @Get()
  index(_req: MikroRequest) { return {}; }
}

@Table('articles')
@Timestamps()
@SoftDeletes()
class ArticleEntity {
  @PrimaryKey()
  id!: number;

  @Column({ type: 'TEXT', nullable: false })
  title!: string;
}

/* ------------------------------------------------------------------ */
/*  Tests                                                               */
/* ------------------------------------------------------------------ */

describe('MetadataStore', () => {
  describe('Controller decorator', () => {
    it('stores controller prefix', () => {
      const meta = MetadataStore.getController(UserController);
      expect(meta).toBeDefined();
      expect(meta?.prefix).toBe('users');
    });

    it('stores empty prefix when none given', () => {
      @Controller()
      class Empty {}
      expect(MetadataStore.getController(Empty)?.prefix).toBe('');
    });
  });

  describe('Route decorators', () => {
    it('stores GET route', () => {
      const routes = MetadataStore.getRoutes(UserController);
      const findOne = routes.get('findOne');
      expect(findOne?.method).toBe('GET');
      expect(findOne?.path).toBe(':id');
    });

    it('stores POST route', () => {
      const routes = MetadataStore.getRoutes(UserController);
      const create = routes.get('create');
      expect(create?.method).toBe('POST');
      expect(create?.path).toBe('');
    });
  });

  describe('Body decorator', () => {
    it('associates DTO class with method', () => {
      const dto = MetadataStore.getBody(UserController, 'create');
      expect(dto).toBe(TestDto);
    });

    it('returns undefined for methods without @Body', () => {
      expect(MetadataStore.getBody(UserController, 'findOne')).toBeUndefined();
    });
  });

  describe('UseGuards decorator', () => {
    it('stores method-level guards', () => {
      const guards = MetadataStore.getMethodGuards(UserController, 'create');
      expect(guards).toContain(MockGuard);
    });

    it('stores class-level guards', () => {
      const guards = MetadataStore.getClassGuards(AdminController);
      expect(guards).toContain(MockGuard);
    });
  });

  describe('Validation decorators', () => {
    it('stores Required and IsString rules for name', () => {
      const rules = MetadataStore.getValidationRules(TestDto).get('name');
      expect(rules?.some((r) => r.type === 'required')).toBe(true);
      expect(rules?.some((r) => r.type === 'isString')).toBe(true);
    });

    it('stores IsEmail rule for email', () => {
      const rules = MetadataStore.getValidationRules(TestDto).get('email');
      expect(rules?.some((r) => r.type === 'isEmail')).toBe(true);
    });
  });

  describe('Schema decorators', () => {
    it('stores table metadata', () => {
      const meta = MetadataStore.getTable(ArticleEntity);
      expect(meta?.name).toBe('articles');
      expect(meta?.timestamps).toBe(true);
      expect(meta?.softDeletes).toBe(true);
    });

    it('stores primary key column', () => {
      const columns = MetadataStore.getColumns(ArticleEntity);
      expect(columns.get('id')?.primary).toBe(true);
    });

    it('stores regular column', () => {
      const columns = MetadataStore.getColumns(ArticleEntity);
      const title = columns.get('title');
      expect(title?.type).toBe('TEXT');
      expect(title?.nullable).toBe(false);
    });
  });
});
