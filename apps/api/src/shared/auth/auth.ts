import { betterAuth } from 'better-auth';
import { PostgresDialect } from 'kysely';
import { pgPool } from '../../data/postgres';
import { getEnv } from '../../config/env';

const env = getEnv();

export const auth = betterAuth({
  database: {
    dialect: new PostgresDialect({ pool: pgPool }),
    type: 'postgres',
  },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.FRONTEND_URL],
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  session: {
    expiresIn: 30 * 24 * 60 * 60,
    updateAge: 7 * 24 * 60 * 60,
  },
});
