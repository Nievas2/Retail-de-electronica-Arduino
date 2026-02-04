import { HttpStatus } from '@nestjs/common';
import { ErrorCode, ERROR_CODES } from '../constants/error-codes';

export type DomainErrorDetails = Record<string, unknown> | string[] | null;

export class DomainError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly details: DomainErrorDetails;

  constructor(params: {
    message: string;
    code?: ErrorCode;
    status?: number;
    details?: DomainErrorDetails;
  }) {
    super(params.message);
    this.name = 'DomainError';
    this.code = params.code ?? ERROR_CODES.BAD_REQUEST;
    this.status = params.status ?? HttpStatus.BAD_REQUEST;
    this.details = params.details ?? null;
  }
}

export function notFound(message: string, details: DomainErrorDetails = null) {
  return new DomainError({
    message,
    code: ERROR_CODES.NOT_FOUND,
    status: HttpStatus.NOT_FOUND,
    details,
  });
}

export function conflict(message: string, details: DomainErrorDetails = null) {
  return new DomainError({
    message,
    code: ERROR_CODES.CONFLICT,
    status: HttpStatus.CONFLICT,
    details,
  });
}

export function validation(message: string, details: DomainErrorDetails = null) {
  return new DomainError({
    message,
    code: ERROR_CODES.VALIDATION_ERROR,
    status: HttpStatus.BAD_REQUEST,
    details,
  });
}
