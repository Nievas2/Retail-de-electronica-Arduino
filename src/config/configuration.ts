export default () => ({
  env: process.env.NODE_ENV || 'development',

  port: Number(process.env.PORT || 3000),

  apiPrefix: process.env.API_PREFIX || '/api/v1',

  jwt: {
    secret: process.env.JWT_SECRET || 'CHANGE_ME_SUPER_SECRET',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },

  database: {
    url: process.env.DATABASE_URL || '',
  },
});
