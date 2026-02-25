# mikro-api

A minimalist, NestJS-style framework for **Cloudflare Workers** and **Bun**.

`mikro-api` provides a powerful suite of modern decorators for routing, validation, and database schemas (ORM), bringing enterprise-grade architecture patterns (like Controllers, Services, Repositories, and Guards) to ultra-fast edge environments.

## Features

- **🚀 Cloudflare Workers & Bun Ready:** Built with Web Standard `Request` and `Response` objects.
- **🛣️ Decorator-based Routing:** Define endpoints using intuitive decorators like `@Controller`, `@Get`, `@Post`.
- **🛡️ Request Validation:** Built-in validation with `@Required`, `@IsString`, and DTO classes.
- **🔒 Guards & Authorization:** Protect routes securely using `@UseGuards`.
- **🗃️ Lightweight ORM:** Define schemas with `@Table`, `@Column`, and handle relations seamlessly.
- **🔄 Migrations:** Type-safe SQL migration system with runner included.
- **📚 OpenAPI / Swagger:** Auto-generate your API documentation using standard decorators.

---

## Installation

```bash
bun add mikro-api
```

*(Note: If using Cloudflare Workers, check peer dependencies for `@cloudflare/workers-types`)*

---

## Examples

### 1. Basic Routing & Validation

Define a highly readable Controller with built-in validation formatting. `mikro-api` will automatically validate incoming JSON bodies against your DTO class.

```typescript
import { 
  App, MikroRequest, MikroResponse, 
  Controller, Get, Post, Body, 
  RequestDto, Required, IsString, MinLength 
} from 'mikro-api';

// Create a Data Transfer Object (DTO) for validation
class CreateUserDto extends RequestDto {
  @Required()
  @IsString()
  @MinLength(3)
  username!: string;

  @Required()
  @IsString()
  email!: string;
}

// Define the Controller
@Controller('users')
class UserController {
  
  @Get()
  index(_req: MikroRequest) {
    return MikroResponse.json([{ id: 1, username: 'admin' }]);
  }

  @Get(':id')
  show(req: MikroRequest) {
    return MikroResponse.json({ id: req.params['id'] });
  }

  @Post()
  @Body(CreateUserDto)
  create(req: MikroRequest) {
    const dto = req.dto as CreateUserDto;
    // Input is fully validated at this point!
    return MikroResponse.json({ message: 'User created', email: dto.email }, 201);
  }
}

// Initialize application and run
const app = new App();
app.useController(UserController);
app.enableCORS(); // Optional: allow cross-origin requests

// For Bun / Cloudflare Workers:
export default app;
```

### 2. Guards (Authentication / Authorization)

Protect specific routes or full controllers easily using the `BaseGuard`.

```typescript
import { BaseGuard, MikroRequest, MikroResponse, UseGuards, Controller, Get } from 'mikro-api';

class AuthGuard extends BaseGuard {
  canActivate(req: MikroRequest): boolean {
    const token = req.request.headers.get('Authorization');
    return token === 'Bearer my-secret-token';
  }
}

@Controller('admin')
class AdminController {
  
  @Get('dashboard')
  @UseGuards(AuthGuard)
  dashboard(_req: MikroRequest) {
    return MikroResponse.json({ secretData: 'Welcome Admin!' });
  }
}
```

### 3. Database & Schemas (ORM)

`mikro-api` ships with a lightweight Database Driver system supporting **D1**, **Postgres**, and **Sqlite**. Models are defined elegantly via decorators.

```typescript
import { Table, Column, PrimaryKey, SoftDeletes, Timestamps } from 'mikro-api';

@Table('users')
export class User {
  @PrimaryKey()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  username!: string;

  @Column({ type: 'boolean', default: false })
  isActive!: boolean;

  @Timestamps()
  createdAt!: Date;
  updatedAt!: Date;

  @SoftDeletes()
  deletedAt?: Date;
}
```

### 4. Writing Migrations

Generate and run SQL migrations seamlessly. The framework includes a CLI-like `MigrationRunner` API:

```typescript
import { Migration, Table, Column, PrimaryKey, Timestamps, SoftDeletes } from 'mikro-api';

@Table('users')
@Timestamps()
export class CreateUsersTable extends Migration {
  @PrimaryKey()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  username!: string;

  @Column({ type: 'boolean', default: false })
  isActive!: boolean;

  @SoftDeletes()
  deletedAt?: Date;
}
```

---

## Built with `mikro-api`

- Setup intuitive **Swagger/OpenAPI UI** effortlessly using `@ApiDoc()` and `@ApiTag()`.
- Scale painlessly with the built-in **Service** and **Repository** layers.
- Supports **Hot Module Reload** testing via standard `bun:test`.

## License

This project is licensed under the MIT License.
