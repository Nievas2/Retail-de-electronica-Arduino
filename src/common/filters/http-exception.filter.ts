import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { DomainError } from '../errors/domain-errors';
import { ERROR_CODES } from '../constants/error-codes';

type ErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: unknown;
    path?: string;
    timestamp: string;
  };
};

function extractHttpMessage(exception: HttpException): unknown {
  try {
    return exception.getResponse();
  } catch {
    return null;
  }
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const path = req?.originalUrl || req?.url || '';

    // ✅ DomainError (nuestro)
    if (exception instanceof DomainError) {
      const payload: ErrorResponse = {
        error: {
          code: exception.code,
          message: exception.message,
          details: exception.details ?? undefined,
          path,
          timestamp: new Date().toISOString(),
        },
      };

      res.status(exception.status).json(payload);
      return;
    }

    // ✅ HttpException (Nest)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = extractHttpMessage(exception);

      let message = 'Error';
      let details: unknown = undefined;

      // Nest a veces entrega string o {message: ...}
      if (typeof raw === 'string') {
        message = raw;
      } else if (raw && typeof raw === 'object') {
        const obj = raw as Record<string, unknown>;
        if (typeof obj.message === 'string') message = obj.message;
        else if (Array.isArray(obj.message)) {
          message = 'Validation error';
          details = obj.message;
        } else {
          message = exception.message || 'Error';
          details = obj;
        }
      } else {
        message = exception.message || 'Error';
      }

      const payload: ErrorResponse = {
        error: {
          code: `HTTP_${status}`,
          message,
          details,
          path,
          timestamp: new Date().toISOString(),
        },
      };

      res.status(status).json(payload);
      return;
    }

    // ✅ Prisma errors (útil para DB)
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = this.mapPrismaError(exception);

      const payload: ErrorResponse = {
        error: {
          code: mapped.code,
          message: mapped.message,
          details: mapped.details,
          path,
          timestamp: new Date().toISOString(),
        },
      };

      res.status(mapped.status).json(payload);
      return;
    }

    // ✅ Fallback (500)
    const payload: ErrorResponse = {
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Internal server error',
        path,
        timestamp: new Date().toISOString(),
      },
    };

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(payload);
  }

  private mapPrismaError(e: Prisma.PrismaClientKnownRequestError): {
    status: number;
    code: string;
    message: string;
    details?: unknown;
  } {
    // P2002: Unique constraint violation
    if (e.code === 'P2002') {
      return {
        status: HttpStatus.CONFLICT,
        code: ERROR_CODES.PRISMA_UNIQUE,
        message: 'Unique constraint violation',
        details: e.meta ?? undefined,
      };
    }

    // P2003: Foreign key constraint failed
    if (e.code === 'P2003') {
      return {
        status: HttpStatus.BAD_REQUEST,
        code: ERROR_CODES.PRISMA_FK,
        message: 'Foreign key constraint violation',
        details: e.meta ?? undefined,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ERROR_CODES.INTERNAL_ERROR,
      message: 'Database error',
      details: { prismaCode: e.code, meta: e.meta ?? null },
    };
  }
}
