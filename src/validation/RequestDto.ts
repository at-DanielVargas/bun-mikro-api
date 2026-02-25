// src/validation/RequestDto.ts

/**
 * Base class for all DTO (Data Transfer Object) classes.
 * Extend this in your request DTOs and decorate properties with validation decorators.
 *
 * @example
 * class CreateUserDto extends RequestDto {
 *   @Required()
 *   @IsString()
 *   name!: string;
 *
 *   @Required()
 *   @IsEmail()
 *   email!: string;
 * }
 */
export abstract class RequestDto {
  /**
   * Returns a plain object representation of this DTO.
   */
  toObject(): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(this).filter(([, v]) => v !== undefined),
    );
  }
}
