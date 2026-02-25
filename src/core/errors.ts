// src/core/errors.ts

export class ServiceException extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'ServiceException';
  }
}

export class ValidationException extends Error {
  constructor(readonly errors: Record<string, string[]>) {
    super('Validation failed');
    this.name = 'ValidationException';
  }
}
