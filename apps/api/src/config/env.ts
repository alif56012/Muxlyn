function getRequired(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getOptional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

function validateEnv() {
  return {
    DATABASE_URL: getRequired('DATABASE_URL'),
    BETTER_AUTH_SECRET: getRequired('BETTER_AUTH_SECRET'),
    BETTER_AUTH_URL: getOptional('BETTER_AUTH_URL', 'http://localhost:3000'),
    GOOGLE_CLIENT_ID: getRequired('GOOGLE_CLIENT_ID'),
    GOOGLE_CLIENT_SECRET: getRequired('GOOGLE_CLIENT_SECRET'),
    FRONTEND_URL: getOptional('FRONTEND_URL', 'http://localhost:5173'),
    CORS_ORIGIN: getOptional('CORS_ORIGIN', 'http://localhost:5173'),
    LOG_LEVEL: getOptional('LOG_LEVEL', 'info'),
    PORT: Number(getOptional('PORT', '3000')),
    NODE_ENV: getOptional('NODE_ENV', 'development'),
  };
}

export type Env = ReturnType<typeof validateEnv>;

const env = validateEnv();

export function getEnv(): Env {
  return env;
}
