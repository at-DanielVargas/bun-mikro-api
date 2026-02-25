// src/swagger/DtoSchemaBuilder.ts
// Converts a DTO class (decorated with validation rules) into an OpenAPI 3.0 JSON Schema.

import { MetadataStore } from '../core/MetadataStore';
import type { ValidationRule } from '../core/MetadataStore';

export interface OpenApiSchema {
  type: string;
  properties: Record<string, Record<string, unknown>>;
  required?: string[];
}

/**
 * Reads the validation rules stored in MetadataStore for a DTO class and
 * produces an OpenAPI-compatible JSON Schema object.
 *
 * Mapping:
 *   @IsString   → { type: 'string' }
 *   @IsInt      → { type: 'integer' }
 *   @IsFloat    → { type: 'number' }
 *   @IsBool     → { type: 'boolean' }
 *   @IsArray    → { type: 'array' }
 *   @IsEmail    → { type: 'string', format: 'email' }
 *   @IsUrl      → { type: 'string', format: 'uri' }
 *   @Matches    → { pattern: '...' }
 *   @IsIn       → { enum: [...] }
 *   @MinLength  → { minLength: N }
 *   @MaxLength  → { maxLength: N }
 *   @Length     → { minLength: N, maxLength: N }
 *   @Min        → { minimum: N }
 *   @Max        → { maximum: N }
 */
export class DtoSchemaBuilder {
  build(DtoClass: new () => unknown): OpenApiSchema {
    const rules    = MetadataStore.getValidationRules(DtoClass);
    const optional = MetadataStore.getOptionalFields(DtoClass);
    const required: string[] = [];
    const properties: Record<string, Record<string, unknown>> = {};

    for (const [field, fieldRules] of rules) {
      const propSchema: Record<string, unknown> = {};
      let isRequired = false;

      for (const rule of fieldRules) {
        this.applyRule(propSchema, rule);
        if (rule.type === 'required') isRequired = true;
      }

      // Fallback type if no type rule was found
      if (!propSchema['type']) propSchema['type'] = 'string';

      properties[field] = propSchema;

      if (isRequired && !optional.has(field)) {
        required.push(field);
      }
    }

    const schema: OpenApiSchema = { type: 'object', properties };
    if (required.length > 0) schema.required = required;
    return schema;
  }

  private applyRule(schema: Record<string, unknown>, rule: ValidationRule): void {
    switch (rule.type) {
      // Types
      case 'isString':  schema['type'] = 'string';   break;
      case 'isInt':     schema['type'] = 'integer';  break;
      case 'isFloat':   schema['type'] = 'number';   break;
      case 'isBool':    schema['type'] = 'boolean';  break;
      case 'isArray':   schema['type'] = 'array';    break;

      // Formats
      case 'isEmail':
        schema['type']   = 'string';
        schema['format'] = 'email';
        break;
      case 'isUrl':
        schema['type']   = 'string';
        schema['format'] = 'uri';
        break;
      case 'matches':
        schema['pattern'] = rule['pattern'];
        break;
      case 'isIn':
        schema['enum'] = rule['values'];
        break;

      // Length
      case 'minLength':  schema['minLength'] = rule['min'];  break;
      case 'maxLength':  schema['maxLength'] = rule['max'];  break;
      case 'length':
        schema['minLength'] = rule['min'];
        schema['maxLength'] = rule['max'];
        break;

      // Numeric range
      case 'min':  schema['minimum'] = rule['min'];  break;
      case 'max':  schema['maximum'] = rule['max'];  break;

      // arrayOf → items type hint
      case 'arrayOf':
        schema['type']  = 'array';
        schema['items'] = { type: this.mapItemType(rule['itemType'] as string) };
        break;
    }
  }

  private mapItemType(t: string): string {
    switch (t) {
      case 'int':   return 'integer';
      case 'float': return 'number';
      case 'bool':  return 'boolean';
      default:      return t; // 'string'
    }
  }
}
