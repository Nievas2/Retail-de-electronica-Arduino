import { Injectable, Logger } from '@nestjs/common';

type LogMeta = Record<string, any> | undefined;

@Injectable()
export class AppLoggerService {
  private readonly logger = new Logger('App');

  info(message: string, meta?: LogMeta) {
    if (meta) {
      this.logger.log(`${message} | meta=${JSON.stringify(meta)}`);
      return;
    }
    this.logger.log(message);
  }

  warn(message: string, meta?: LogMeta) {
    if (meta) {
      this.logger.warn(`${message} | meta=${JSON.stringify(meta)}`);
      return;
    }
    this.logger.warn(message);
  }

  error(message: string, error?: unknown, meta?: LogMeta) {
    const errMeta: Record<string, any> = { ...(meta ?? {}) };

    if (error instanceof Error) {
      errMeta.errorName = error.name;
      errMeta.errorMessage = error.message;
      errMeta.stack = error.stack;
    } else if (error !== undefined) {
      errMeta.error = error;
    }

    if (Object.keys(errMeta).length > 0) {
      this.logger.error(`${message} | meta=${JSON.stringify(errMeta)}`);
      return;
    }

    this.logger.error(message);
  }

  debug(message: string, meta?: LogMeta) {
    if (meta) {
      this.logger.debug(`${message} | meta=${JSON.stringify(meta)}`);
      return;
    }
    this.logger.debug(message);
  }

  verbose(message: string, meta?: LogMeta) {
    if (meta) {
      this.logger.verbose(`${message} | meta=${JSON.stringify(meta)}`);
      return;
    }
    this.logger.verbose(message);
  }
}
