// src/validation/Validator.ts

import { MetadataStore, type ValidationRule } from '../core/MetadataStore';
import type { RequestDto } from './RequestDto';

/**
 * Two-pass validator:
 *   Pass 1 – collect all errors without mutating the DTO.
 *   Pass 2 – assign values only if there are no errors.
 */
export class Validator {
  private errors: Record<string, string[]> = {};

  validate<T extends RequestDto>(
    DtoClass: new () => T,
    data: Record<string, unknown>,
  ): T | null {
    this.errors = {};

    const dto = new DtoClass();
    const rules = MetadataStore.getValidationRules(DtoClass);
    const optional = MetadataStore.getOptionalFields(DtoClass);

    // ── Pass 1: collect errors ──────────────────────────────────────
    for (const [field, fieldRules] of rules) {
      const isOptional = optional.has(field);
      const isPresent = Object.prototype.hasOwnProperty.call(data, field);
      const value = data[field] ?? null;

      if (isOptional && !isPresent) continue;

      for (const rule of fieldRules) {
        const error = this.applyRule(field, value, rule);
        if (error !== null) {
          if (!this.errors[field]) this.errors[field] = [];
          this.errors[field].push(error);
        }
      }
    }

    if (this.hasErrors()) return null;

    // ── Pass 2: assign values ───────────────────────────────────────
    for (const [field] of rules) {
      const isOptional = optional.has(field);
      const isPresent = Object.prototype.hasOwnProperty.call(data, field);

      if (isOptional && !isPresent) continue;
      if (isPresent) {
        (dto as Record<string, unknown>)[field] = data[field];
      }
    }

    return dto;
  }

  hasErrors(): boolean {
    return Object.keys(this.errors).length > 0;
  }

  getErrors(): Record<string, string[]> {
    return this.errors;
  }

  /* ------------------------------------------------------------------ */
  /*  Rule engine                                                         */
  /* ------------------------------------------------------------------ */

  private applyRule(field: string, value: unknown, rule: ValidationRule): string | null {
    const msg = (template: string, replacements: Record<string, string> = {}): string => {
      let out = template.replace(':field', field);
      for (const [k, v] of Object.entries(replacements)) {
        out = out.replace(`:${k}`, v);
      }
      return out;
    };

    switch (rule.type) {
      // ── Presence ──────────────────────────────────────────────────
      case 'required':
        return value === null || value === '' ? msg(rule.message) : null;

      // ── Types ─────────────────────────────────────────────────────
      case 'isString':
        return value !== null && typeof value !== 'string' ? msg(rule.message) : null;

      case 'isInt':
        return value !== null && !Number.isInteger(Number(value)) ? msg(rule.message) : null;

      case 'isFloat':
        return value !== null && isNaN(Number(value)) ? msg(rule.message) : null;

      case 'isBool': {
        const boolValues = [true, false, 1, 0, '1', '0', 'true', 'false'];
        return value !== null && !boolValues.includes(value as boolean) ? msg(rule.message) : null;
      }

      case 'isArray':
        return value !== null && !Array.isArray(value) ? msg(rule.message) : null;

      // ── Format ────────────────────────────────────────────────────
      case 'isEmail': {
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return value !== null && !emailRe.test(String(value)) ? msg(rule.message) : null;
      }

      case 'isUrl': {
        try {
          if (value !== null) new URL(String(value));
          return null;
        } catch {
          return msg(rule.message);
        }
      }

      case 'matches': {
        const re = new RegExp(rule.pattern as string, (rule.flags as string) ?? '');
        return value !== null && !re.test(String(value)) ? msg(rule.message) : null;
      }

      case 'isIn': {
        const values = rule.values as unknown[];
        return value !== null && !values.includes(value)
          ? msg(rule.message, { values: values.join(', ') })
          : null;
      }

      // ── Length ────────────────────────────────────────────────────
      case 'minLength': {
        const len = String(value ?? '').length;
        return value !== null && len < (rule.min as number)
          ? msg(rule.message, { min: String(rule.min) })
          : null;
      }

      case 'maxLength': {
        const len = String(value ?? '').length;
        return value !== null && len > (rule.max as number)
          ? msg(rule.message, { max: String(rule.max) })
          : null;
      }

      case 'length': {
        const len = String(value ?? '').length;
        return value !== null && (len < (rule.min as number) || len > (rule.max as number))
          ? msg(rule.message, { min: String(rule.min), max: String(rule.max) })
          : null;
      }

      // ── Numeric range ─────────────────────────────────────────────
      case 'min':
        return value !== null && Number(value) < (rule.min as number)
          ? msg(rule.message, { min: String(rule.min) })
          : null;

      case 'max':
        return value !== null && Number(value) > (rule.max as number)
          ? msg(rule.message, { max: String(rule.max) })
          : null;

      // ── Arrays ────────────────────────────────────────────────────
      case 'arrayUnique': {
        if (value !== null && Array.isArray(value)) {
          return value.length !== new Set(value).size ? msg(rule.message) : null;
        }
        return null;
      }

      case 'arrayOf': {
        if (value !== null && Array.isArray(value)) {
          const itemType = rule.itemType as string;
          const valid = value.every((item) => this.checkItemType(item, itemType));
          return !valid ? msg(rule.message, { type: itemType }) : null;
        }
        return null;
      }

      default:
        return null;
    }
  }

  private checkItemType(item: unknown, type: string): boolean {
    switch (type) {
      case 'string': return typeof item === 'string';
      case 'int':    return Number.isInteger(Number(item));
      case 'float':  return !isNaN(Number(item));
      case 'bool':   return typeof item === 'boolean';
      default:       return true;
    }
  }
}
