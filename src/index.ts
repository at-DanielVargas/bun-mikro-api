// src/index.ts – Public API barrel

// ── Core ──────────────────────────────────────────────────────────────
export { App }              from './core/App';
export type { CORSOptions, SwaggerOptions } from './core/App';
export { MikroRequest }     from './core/MikroRequest';
export { MikroResponse }    from './core/MikroResponse';
export { Router }           from './core/Router';
export { ServiceException, ValidationException } from './core/errors';
export { MetadataStore }    from './core/MetadataStore';
export type {
  ControllerMeta,
  RouteMeta,
  ValidationRule,
  ApiDocMeta,
  ApiTagMeta,
  TableMeta,
  ColumnMeta,
  RelationMeta,
  GuardCtor,
} from './core/MetadataStore';

// ── Routing decorators ─────────────────────────────────────────────────
export { Controller }  from './decorators/routing/Controller';
export { Route }       from './decorators/routing/Route';
export { Get, Post, Put, Patch, Delete } from './decorators/routing/methods';
export { Body }        from './decorators/routing/Body';
export { UseGuards }   from './decorators/routing/UseGuards';
export { ApiDoc }      from './decorators/routing/ApiDoc';
export { ApiTag }      from './decorators/routing/ApiTag';

// ── Validation decorators ──────────────────────────────────────────────
export { Required }     from './decorators/validation/Required';
export { Optional }     from './decorators/validation/Optional';
export { IsString }     from './decorators/validation/IsString';
export { IsInt }        from './decorators/validation/IsInt';
export { IsFloat }      from './decorators/validation/IsFloat';
export { IsBool }       from './decorators/validation/IsBool';
export { IsArray }      from './decorators/validation/IsArray';
export { IsEmail }      from './decorators/validation/IsEmail';
export { IsUrl }        from './decorators/validation/IsUrl';
export { IsIn }         from './decorators/validation/IsIn';
export { Matches }      from './decorators/validation/Matches';
export { MinLength }    from './decorators/validation/MinLength';
export { MaxLength }    from './decorators/validation/MaxLength';
export { Length }       from './decorators/validation/Length';
export { Min }          from './decorators/validation/Min';
export { Max }          from './decorators/validation/Max';
export { ArrayUnique }  from './decorators/validation/ArrayUnique';
export { ArrayOf }      from './decorators/validation/ArrayOf';

// ── Schema decorators ─────────────────────────────────────────────────
export { Table }        from './decorators/schema/Table';
export { Column }       from './decorators/schema/Column';
export type { ColumnOptions } from './decorators/schema/Column';
export { PrimaryKey }   from './decorators/schema/PrimaryKey';
export { ForeignKey }   from './decorators/schema/ForeignKey';
export { Index }        from './decorators/schema/IndexColumn';
export { Unique }       from './decorators/schema/Unique';
export { Timestamps }   from './decorators/schema/Timestamps';
export { SoftDeletes }  from './decorators/schema/SoftDeletes';

// ── Relation decorators ────────────────────────────────────────────────
export { HasMany }      from './decorators/schema/HasMany';
export type { HasManyOptions }    from './decorators/schema/HasMany';
export { HasOne }       from './decorators/schema/HasOne';
export type { HasOneOptions }     from './decorators/schema/HasOne';
export { BelongsTo }    from './decorators/schema/BelongsTo';
export type { BelongsToOptions }  from './decorators/schema/BelongsTo';
export { BelongsToMany } from './decorators/schema/BelongsToMany';
export type { BelongsToManyOptions } from './decorators/schema/BelongsToMany';

// ── Validation ────────────────────────────────────────────────────────
export { RequestDto }  from './validation/RequestDto';
export { Validator }   from './validation/Validator';

// ── Guards ────────────────────────────────────────────────────────────
export { BaseGuard }   from './guards/BaseGuard';
export type { GuardInterface } from './guards/GuardInterface';

// ── Database ──────────────────────────────────────────────────────────
export type { DatabaseDriver, ExecuteResult } from './database/DatabaseDriver';
export { D1Driver }        from './database/D1Driver';
export { PostgresDriver }  from './database/PostgresDriver';
export type { PostgresClient } from './database/PostgresDriver';
export { SqliteDriver }    from './database/SqliteDriver';
export type { BunSqliteDatabase } from './database/SqliteDriver';

// ── Repository ────────────────────────────────────────────────────────
export { BaseRepository }  from './repository/BaseRepository';
export { QueryBuilder }    from './repository/QueryBuilder';
export { RelationLoader }  from './repository/RelationLoader';

// ── Service ───────────────────────────────────────────────────────────
export { BaseService }     from './service/BaseService';

// ── Schema ────────────────────────────────────────────────────────────
export { SchemaBuilder }   from './schema/SchemaBuilder';
export { Migration }       from './schema/Migration';

// ── Swagger ───────────────────────────────────────────────────────────
export { SwaggerGenerator } from './swagger/SwaggerGenerator';
export type { SwaggerConfig } from './swagger/SwaggerGenerator';
export { SwaggerUI }        from './swagger/SwaggerUI';
export { DtoSchemaBuilder } from './swagger/DtoSchemaBuilder';
export type { OpenApiSchema } from './swagger/DtoSchemaBuilder';
