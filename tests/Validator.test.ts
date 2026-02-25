// tests/Validator.test.ts

import { describe, it, expect } from 'bun:test';
import { Validator }    from '../src/validation/Validator';
import { RequestDto }   from '../src/validation/RequestDto';
import { Required }     from '../src/decorators/validation/Required';
import { Optional }     from '../src/decorators/validation/Optional';
import { IsString }     from '../src/decorators/validation/IsString';
import { IsInt }        from '../src/decorators/validation/IsInt';
import { IsEmail }      from '../src/decorators/validation/IsEmail';
import { IsIn }         from '../src/decorators/validation/IsIn';
import { MinLength }    from '../src/decorators/validation/MinLength';
import { Min }          from '../src/decorators/validation/Min';
import { Max }          from '../src/decorators/validation/Max';
import { IsArray }      from '../src/decorators/validation/IsArray';
import { ArrayUnique }  from '../src/decorators/validation/ArrayUnique';
import { ArrayOf }      from '../src/decorators/validation/ArrayOf';
import { IsUrl }        from '../src/decorators/validation/IsUrl';
import { Matches }      from '../src/decorators/validation/Matches';
import { IsBool }       from '../src/decorators/validation/IsBool';
import { Length }       from '../src/decorators/validation/Length';
import { IsFloat }      from '../src/decorators/validation/IsFloat';

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
  @Min(0)
  @Max(150)
  age?: number;
}

class RolesDto extends RequestDto {
  @Required()
  @IsIn(['admin', 'user', 'mod'])
  role!: string;

  @Optional()
  @IsArray()
  @ArrayUnique()
  @ArrayOf('string')
  tags?: string[];
}

describe('Validator', () => {
  it('returns DTO when all required fields are valid', () => {
    const v = new Validator();
    const dto = v.validate(CreateUserDto, { name: 'Alice', email: 'alice@example.com' });
    expect(dto).not.toBeNull();
    expect(dto!.name).toBe('Alice');
    expect(v.hasErrors()).toBe(false);
  });

  it('collects error when required field is missing', () => {
    const v = new Validator();
    const dto = v.validate(CreateUserDto, { email: 'x@x.com' });
    expect(dto).toBeNull();
    expect(v.hasErrors()).toBe(true);
    expect(v.getErrors()['name']).toBeDefined();
  });

  it('collects error for invalid email', () => {
    const v = new Validator();
    const dto = v.validate(CreateUserDto, { name: 'Bob', email: 'not-an-email' });
    expect(dto).toBeNull();
    expect(v.getErrors()['email']).toBeDefined();
  });

  it('enforces minLength', () => {
    const v = new Validator();
    const dto = v.validate(CreateUserDto, { name: 'A', email: 'a@a.com' });
    expect(dto).toBeNull();
    expect(v.getErrors()['name']).toBeDefined();
  });

  it('skips optional field when absent', () => {
    const v = new Validator();
    const dto = v.validate(CreateUserDto, { name: 'Alice', email: 'a@a.com' });
    expect(dto).not.toBeNull();
    expect((dto as unknown as Record<string, unknown>)['age']).toBeUndefined();
  });

  it('validates optional int field when present', () => {
    const v = new Validator();
    const dto = v.validate(CreateUserDto, { name: 'Alice', email: 'a@a.com', age: 25 });
    expect(dto).not.toBeNull();
  });

  it('fails when optional int exceeds max', () => {
    const v = new Validator();
    const dto = v.validate(CreateUserDto, { name: 'Alice', email: 'a@a.com', age: 200 });
    expect(dto).toBeNull();
    expect(v.getErrors()['age']).toBeDefined();
  });

  it('validates isIn rule', () => {
    const v = new Validator();
    const dto = v.validate(RolesDto, { role: 'admin' });
    expect(dto).not.toBeNull();

    const v2 = new Validator();
    const dto2 = v2.validate(RolesDto, { role: 'superadmin' });
    expect(dto2).toBeNull();
    expect(v2.getErrors()['role']).toBeDefined();
  });

  it('validates arrayUnique', () => {
    const v = new Validator();
    const dto = v.validate(RolesDto, { role: 'user', tags: ['a', 'b', 'a'] });
    expect(dto).toBeNull();
    expect(v.getErrors()['tags']).toBeDefined();
  });

  it('validates arrayOf string type', () => {
    const v = new Validator();
    const dto = v.validate(RolesDto, { role: 'user', tags: ['a', 1] });
    expect(dto).toBeNull();
    expect(v.getErrors()['tags']).toBeDefined();
  });
});

describe('Validator – format rules', () => {
  class FormatDto extends RequestDto {
    @Optional()
    @IsUrl()
    website?: string;

    @Optional()
    @Matches(/^\d{4}-\d{2}-\d{2}$/)
    date?: string;

    @Optional()
    @IsBool()
    active?: boolean;

    @Optional()
    @Length(3, 10)
    code?: string;

    @Optional()
    @IsFloat()
    price?: number;
  }

  it('rejects invalid URL', () => {
    const v = new Validator();
    expect(v.validate(FormatDto, { website: 'not-a-url' })).toBeNull();
  });

  it('accepts valid URL', () => {
    const v = new Validator();
    expect(v.validate(FormatDto, { website: 'https://example.com' })).not.toBeNull();
  });

  it('validates regex pattern', () => {
    const v1 = new Validator();
    expect(v1.validate(FormatDto, { date: '2024-01-01' })).not.toBeNull();
    const v2 = new Validator();
    expect(v2.validate(FormatDto, { date: '01/01/2024' })).toBeNull();
  });

  it('validates bool – rejects non-bool', () => {
    const v = new Validator();
    expect(v.validate(FormatDto, { active: 'yes' as unknown as boolean })).toBeNull();
  });

  it('validates length range', () => {
    const v1 = new Validator();
    expect(v1.validate(FormatDto, { code: 'ab' })).toBeNull();
    const v2 = new Validator();
    expect(v2.validate(FormatDto, { code: 'abc' })).not.toBeNull();
  });

  it('validates float', () => {
    const v1 = new Validator();
    expect(v1.validate(FormatDto, { price: 9.99 })).not.toBeNull();
    const v2 = new Validator();
    expect(v2.validate(FormatDto, { price: 'abc' as unknown as number })).toBeNull();
  });
});
