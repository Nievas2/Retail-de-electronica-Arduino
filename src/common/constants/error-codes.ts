/**
 * Códigos de error estandarizados del backend.
 * Úsalos en DomainError o en respuestas de error consistentes.
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  BAD_REQUEST: 'BAD_REQUEST',

  PRISMA_UNIQUE: 'PRISMA_UNIQUE',
  PRISMA_FK: 'PRISMA_FK',

  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
