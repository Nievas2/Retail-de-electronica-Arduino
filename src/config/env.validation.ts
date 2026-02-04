function mustBeNonEmpty(value: unknown, key: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`[ENV] Missing or empty required variable: ${key}`);
  }
  return value.trim();
}

function asInt(value: unknown, key: string, fallback: number) {
  if (value === undefined || value === null || value === '') return fallback;

  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    throw new Error(`[ENV] Invalid integer for ${key}: ${value}`);
  }
  return n;
}

/**
 * Se usa en ConfigModule.forRoot({ validate })
 * Nest le pasa un objeto con las variables del .env
 */
export function validateEnv(config: Record<string, any>) {
  const NODE_ENV = config.NODE_ENV || 'development';
  const PORT = asInt(config.PORT, 'PORT', 3000);

  const API_PREFIX = (config.API_PREFIX || '/api/v1').toString();

  const JWT_SECRET = mustBeNonEmpty(config.JWT_SECRET, 'JWT_SECRET');
  const JWT_EXPIRES_IN = mustBeNonEmpty(config.JWT_EXPIRES_IN, 'JWT_EXPIRES_IN');

  const DATABASE_URL = mustBeNonEmpty(config.DATABASE_URL, 'DATABASE_URL');

  return {
    ...config,
    NODE_ENV,
    PORT,
    API_PREFIX,
    JWT_SECRET,
    JWT_EXPIRES_IN,
    DATABASE_URL,
  };
}
