# Migrations & Relations — mikro-api (TypeScript)

Guía completa del sistema de migraciones y relaciones del paquete TypeScript de `mikro-api`.

---

## Tabla de contenidos

1. [Comandos CLI](#comandos-cli)
2. [Anatomía de una migración](#anatomía-de-una-migración)
3. [Decoradores disponibles](#decoradores-disponibles)
4. [Relaciones](#relaciones)
   - [Uno a Uno (HasOne / BelongsTo)](#uno-a-uno-hasone--belongsto)
   - [Uno a Muchos (HasMany / BelongsTo)](#uno-a-muchos-hasmany--belongsto)
   - [Muchos a Muchos (BelongsToMany)](#muchos-a-muchos-belongstomany)
5. [Carga de relaciones en repositorios](#carga-de-relaciones-en-repositorios)
6. [Relaciones anidadas](#relaciones-anidadas)
7. [Cuándo usar SQL puro](#cuándo-usar-sql-puro)
8. [Orden de ejecución y dependencias](#orden-de-ejecución-y-dependencias)

---

## Comandos CLI

```bash
# Crear nueva migración (genera el archivo con timestamp)
bun run migrate make create_users_table

# Ejecutar todas las migraciones pendientes
bun run migrate migrate

# Revertir la última migración ejecutada
bun run migrate rollback

# Revertir todas las migraciones
bun run migrate reset

# Ver el estado de cada migración (ejecutada / pendiente)
bun run migrate status
```

### Opciones de base de datos

```bash
# SQLite local (por defecto)
bun run migrate migrate

# Cloudflare D1 local (wrangler dev)
bun run migrate migrate --d1=my-db --local

# Cloudflare D1 remota (producción)
bun run migrate migrate --d1=my-db --remote

# PostgreSQL
bun run migrate migrate --db=postgres://user:pass@localhost/mydb

# Directorio de migraciones personalizado
bun run migrate status --migrations=src/db/migrations
```

---

## Anatomía de una migración

Cada migración extiende la clase `Migration` y declara su esquema usando decoradores sobre las propiedades de la clase. El runner genera automáticamente el SQL de `CREATE TABLE` o `ALTER TABLE` al leer esos metadatos.

```typescript
// database/migrations/2024_01_01_000001_create_users_table.ts
import { Migration, Table, Column, PrimaryKey, Timestamps, SoftDeletes } from 'mikro-api';

@Table('users')
@Timestamps()
@SoftDeletes()
export class CreateUsersTable extends Migration {
  @PrimaryKey()
  id!: number;

  @Column({ type: 'TEXT', nullable: false })
  name!: string;

  @Column({ type: 'TEXT', nullable: false, unique: true })
  email!: string;

  @Column({ type: 'TEXT', nullable: false, default: 'user' })
  role!: string;
}
```

El SQL generado (SQLite) será equivalente a:

```sql
CREATE TABLE IF NOT EXISTS `users` (
  `id`         INTEGER PRIMARY KEY AUTOINCREMENT,
  `name`       TEXT NOT NULL,
  `email`      TEXT NOT NULL UNIQUE,
  `role`       TEXT NOT NULL DEFAULT 'user',
  `created_at` TEXT DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TEXT DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` TEXT
)
```

> Para PostgreSQL el runner ajusta automáticamente `SERIAL PRIMARY KEY`, `TIMESTAMPTZ DEFAULT NOW()` y comillas dobles en identificadores.

---

## Decoradores disponibles

| Decorador | Aplica en | Descripción |
|---|---|---|
| `@Table('name')` | clase | Nombre de la tabla en la base de datos |
| `@Timestamps()` | clase | Agrega `created_at` y `updated_at` |
| `@SoftDeletes()` | clase | Agrega `deleted_at` para borrado lógico |
| `@PrimaryKey()` | propiedad | Columna `INTEGER PRIMARY KEY AUTOINCREMENT` / `SERIAL` |
| `@Column(options)` | propiedad | Define una columna con tipo, nullable, unique, default |
| `@ForeignKey(table, col, onDelete)` | propiedad | Agrega constraint `FOREIGN KEY ... REFERENCES` |
| `@Unique()` | propiedad | Agrega `UNIQUE` a la columna |

---

## Relaciones

### Uno a Uno — HasOne / BelongsTo

**Caso:** Un usuario tiene un perfil. El perfil pertenece a un único usuario.

```
users          profiles
──────         ──────────────────────
id  ◄──────── user_id (FK, UNIQUE)
name           avatar
               bio
```

#### Migración de `users`

```typescript
// database/migrations/2024_01_01_000001_create_users_table.ts
import { Migration, Table, Column, PrimaryKey, Timestamps } from 'mikro-api';

@Table('users')
@Timestamps()
export class CreateUsersTable extends Migration {
  @PrimaryKey()
  id!: number;

  @Column({ type: 'TEXT', nullable: false })
  name!: string;

  @Column({ type: 'TEXT', nullable: false, unique: true })
  email!: string;
}
```

#### Migración de `profiles`

```typescript
// database/migrations/2024_01_01_000002_create_profiles_table.ts
import { Migration, Table, Column, PrimaryKey, ForeignKey, Timestamps } from 'mikro-api';

@Table('profiles')
@Timestamps()
export class CreateProfilesTable extends Migration {
  @PrimaryKey()
  id!: number;

  // UNIQUE garantiza la relación 1:1 (un perfil por usuario)
  @Column({ type: 'INTEGER', nullable: false, unique: true })
  @ForeignKey('users', 'id', 'CASCADE')
  user_id!: number;

  @Column({ type: 'TEXT' })
  avatar!: string;

  @Column({ type: 'TEXT' })
  bio!: string;
}
```

#### Repositorios

```typescript
import { BaseRepository, HasOne, BelongsTo } from 'mikro-api';

class UserRepository extends BaseRepository {
  protected table = 'users';
  protected fillable = ['name', 'email'];

  @HasOne(() => ProfileRepository, { foreignKey: 'user_id' })
  profile!: unknown;
}

class ProfileRepository extends BaseRepository {
  protected table = 'profiles';
  protected fillable = ['user_id', 'avatar', 'bio'];

  @BelongsTo(() => UserRepository, { foreignKey: 'user_id' })
  user!: unknown;
}
```

---

### Uno a Muchos — HasMany / BelongsTo

**Caso:** Un usuario tiene muchos posts. Cada post pertenece a un usuario.

```
users          posts
──────         ────────────────
id  ◄──────── user_id (FK)
name           title
               body
```

#### Migración de `posts`

```typescript
// database/migrations/2024_01_02_000003_create_posts_table.ts
import { Migration, Table, Column, PrimaryKey, ForeignKey, Timestamps, SoftDeletes } from 'mikro-api';

@Table('posts')
@Timestamps()
@SoftDeletes()
export class CreatePostsTable extends Migration {
  @PrimaryKey()
  id!: number;

  @Column({ type: 'INTEGER', nullable: false })
  @ForeignKey('users', 'id', 'CASCADE')
  user_id!: number;

  @Column({ type: 'TEXT', nullable: false })
  title!: string;

  @Column({ type: 'TEXT', nullable: false })
  body!: string;
}
```

#### Repositorios

```typescript
import { BaseRepository, HasMany, BelongsTo } from 'mikro-api';

class UserRepository extends BaseRepository {
  protected table = 'users';
  protected fillable = ['name', 'email'];

  // Un usuario tiene muchos posts
  @HasMany(() => PostRepository, { foreignKey: 'user_id' })
  posts!: unknown[];
}

class PostRepository extends BaseRepository {
  protected table = 'posts';
  protected fillable = ['user_id', 'title', 'body'];

  // Un post pertenece a un usuario
  @BelongsTo(() => UserRepository, { foreignKey: 'user_id' })
  user!: unknown;
}
```

---

### Muchos a Muchos — BelongsToMany

**Caso:** Un usuario puede tener muchos roles. Un rol puede asignarse a muchos usuarios.
Se necesita una tabla pivot (`user_roles`).

```
users          user_roles         roles
──────         ───────────────    ──────
id  ◄──────── user_id (FK)       id
name           role_id (FK) ────► name
               assigned_at        description
```

#### Migración de `roles`

```typescript
// database/migrations/2024_01_03_000004_create_roles_table.ts
import { Migration, Table, Column, PrimaryKey } from 'mikro-api';

@Table('roles')
export class CreateRolesTable extends Migration {
  @PrimaryKey()
  id!: number;

  @Column({ type: 'TEXT', nullable: false, unique: true })
  name!: string;

  @Column({ type: 'TEXT' })
  description!: string;
}
```

#### Migración de la tabla pivot `user_roles`

La tabla pivot tiene una **clave primaria compuesta** (`user_id, role_id`), por lo que es necesario sobreescribir `up()` y `down()` con SQL:

```typescript
// database/migrations/2024_01_03_000005_create_user_roles_table.ts
import type { DatabaseDriver } from 'mikro-api';
import { Migration } from 'mikro-api';

export class CreateUserRolesTable extends Migration {
  async up(db: DatabaseDriver): Promise<void> {
    const pg = db.getDialect() === 'postgres';
    const q  = (id: string) => pg ? `"${id}"` : `\`${id}\``;

    await db.execute(`
      CREATE TABLE IF NOT EXISTS ${q('user_roles')} (
        ${q('user_id')}     INTEGER NOT NULL REFERENCES ${q('users')}(${q('id')}) ON DELETE CASCADE,
        ${q('role_id')}     INTEGER NOT NULL REFERENCES ${q('roles')}(${q('id')}) ON DELETE CASCADE,
        ${q('assigned_at')} ${pg ? 'TIMESTAMPTZ DEFAULT NOW()' : 'TEXT DEFAULT CURRENT_TIMESTAMP'},
        PRIMARY KEY (${q('user_id')}, ${q('role_id')})
      )
    `);
  }

  async down(db: DatabaseDriver): Promise<void> {
    const q = (id: string) => db.getDialect() === 'postgres' ? `"${id}"` : `\`${id}\``;
    await db.execute(`DROP TABLE IF EXISTS ${q('user_roles')}`);
  }
}
```

> La tabla pivot usa SQL puro porque su clave primaria es compuesta — `@PrimaryKey()` solo soporta una columna auto-increment.

#### Repositorios

```typescript
import { BaseRepository, BelongsToMany } from 'mikro-api';

class UserRepository extends BaseRepository {
  protected table = 'users';
  protected fillable = ['name', 'email'];

  @BelongsToMany(() => RoleRepository, {
    pivotTable: 'user_roles',
    foreignKey: 'user_id',  // columna en pivot que apunta a users.id
    relatedKey: 'role_id',  // columna en pivot que apunta a roles.id
  })
  roles!: unknown[];
}

class RoleRepository extends BaseRepository {
  protected table = 'roles';
  protected fillable = ['name', 'description'];

  @BelongsToMany(() => UserRepository, {
    pivotTable: 'user_roles',
    foreignKey: 'role_id',
    relatedKey: 'user_id',
  })
  users!: unknown[];
}
```

#### Acceder a columnas extra del pivot

Si necesitas leer `assigned_at` u otras columnas de la tabla pivot:

```typescript
@BelongsToMany(() => RoleRepository, {
  pivotTable:   'user_roles',
  foreignKey:   'user_id',
  relatedKey:   'role_id',
  pivotColumns: ['assigned_at'],  // aparece como `pivot_assigned_at` en cada registro
})
roles!: unknown[];
```

---

## Carga de relaciones en repositorios

Usa `.with()` para cargar relaciones de forma eager (sin N+1 queries).

```typescript
const userRepo = new UserRepository(db);

// 1:1 — usuario con su perfil
const user = await userRepo.with('profile').findById(1);
// { id: 1, name: 'Alice', profile: { id: 1, avatar: '...', bio: '...' } }

// 1:N — todos los usuarios con sus posts
const users = await userRepo.with('posts').findAll();
// [{ id: 1, name: 'Alice', posts: [...] }, ...]

// N:M — usuario con sus roles
const user = await userRepo.with('roles').findById(1);
// { id: 1, name: 'Alice', roles: [{ id: 2, name: 'admin' }] }

// Múltiples relaciones en una sola consulta
const user = await userRepo.with('profile', 'posts', 'roles').findById(1);
```

---

## Relaciones anidadas

Carga relaciones dentro de relaciones usando notación de punto:

```typescript
// posts con el usuario que los escribió
const posts = await postRepo.with('user').findAll();

// usuarios con sus posts, y cada post con su autor
const users = await userRepo.with('posts.user').findAll();

// usuarios con sus roles, y cada rol con todos sus usuarios asignados
const users = await userRepo.with('roles.users').findAll();
```

La carga anidada usa `IN (...)` en lugar de queries por registro, por lo que no genera N+1.

---

## Cuándo usar SQL puro

Los decoradores cubren la mayoría de los casos. Usa `up()` / `down()` con SQL directo para:

| Caso | Ejemplo |
|---|---|
| Tabla pivot con PK compuesta | `PRIMARY KEY (user_id, role_id)` |
| Crear índices | `CREATE INDEX idx_posts_user_id ON posts (user_id)` |
| Insertar datos iniciales (seeds) | `INSERT INTO roles (name) VALUES (...)` |
| Borrar o renombrar columnas | SQLite no soporta `DROP COLUMN` — requiere recrear la tabla |

```typescript
// database/migrations/2024_01_10_000010_seed_roles.ts
import type { DatabaseDriver } from 'mikro-api';
import { Migration } from 'mikro-api';

export class SeedRoles extends Migration {
  async up(db: DatabaseDriver): Promise<void> {
    const pg = db.getDialect() === 'postgres';
    const q  = (id: string) => pg ? `"${id}"` : `\`${id}\``;

    await db.execute(`
      INSERT INTO ${q('roles')} (${q('name')}, ${q('description')}) VALUES
        ('admin',  'Acceso total al sistema'),
        ('editor', 'Puede crear y editar contenido'),
        ('viewer', 'Solo lectura')
    `);
  }

  async down(db: DatabaseDriver): Promise<void> {
    const q = (id: string) => db.getDialect() === 'postgres' ? `"${id}"` : `\`${id}\``;
    await db.execute(`DELETE FROM ${q('roles')} WHERE ${q('name')} IN ('admin', 'editor', 'viewer')`);
  }
}
```

---

## Orden de ejecución y dependencias

Las migraciones se ejecutan en orden alfabético por nombre de archivo. El prefijo de timestamp garantiza el orden correcto. Siempre crea primero las tablas padre antes que las tablas hijo que referencian llaves foráneas.

```
2024_01_01_000001_create_users_table.ts       ← sin dependencias
2024_01_01_000002_create_roles_table.ts       ← sin dependencias
2024_01_02_000003_create_posts_table.ts       ← depende de users
2024_01_02_000004_create_profiles_table.ts    ← depende de users
2024_01_03_000005_create_user_roles_table.ts  ← depende de users y roles
2024_01_03_000006_create_comments_table.ts    ← depende de posts y users
2024_01_10_000007_seed_roles.ts               ← datos iniciales (siempre al final)
```
