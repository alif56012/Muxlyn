import { Pool } from 'pg';
import { getEnv } from '../config/env';

const env = getEnv();

async function migrate() {
  const pool = new Pool({ connectionString: env.DATABASE_URL });

  try {
    console.log('Running Better-Auth migrations...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL UNIQUE,
        "image" TEXT,
        "emailVerified" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "session" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "token" TEXT NOT NULL UNIQUE,
        "expiresAt" TIMESTAMP NOT NULL,
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "account" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "accountId" TEXT NOT NULL,
        "providerId" TEXT NOT NULL,
        "accessToken" TEXT,
        "refreshToken" TEXT,
        "accessTokenExpiresAt" TIMESTAMP,
        "refreshTokenExpiresAt" TIMESTAMP,
        "scope" TEXT,
        "idToken" TEXT,
        "password" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "verification" (
        "id" TEXT PRIMARY KEY,
        "identifier" TEXT NOT NULL,
        "value" TEXT NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session"("userId");
      CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account"("userId");
      CREATE INDEX IF NOT EXISTS "account_providerId_idx" ON "account"("providerId");
    `);

    console.log('Running session extension migrations...');

    await pool.query(`
      ALTER TABLE "session"
        ADD COLUMN IF NOT EXISTS "remember_me" BOOLEAN NOT NULL DEFAULT false;

      ALTER TABLE "session"
        ADD COLUMN IF NOT EXISTS "remembered_ip" TEXT;
    `);

    console.log('Running jira_connections migration...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "jira_connections" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "jira_url" TEXT NOT NULL,
        "jira_account_id" TEXT NOT NULL,
        "display_name" TEXT,
        "email" TEXT,
        "avatar_url" TEXT,
        "api_token_encrypted" TEXT NOT NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT false,
        "status" TEXT NOT NULL DEFAULT 'connected',
        "last_validated_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS "idx_jira_connections_user_account"
        ON "jira_connections" ("user_id", "jira_account_id");
      CREATE INDEX IF NOT EXISTS "idx_jira_connections_user_id"
        ON "jira_connections" ("user_id");
      CREATE INDEX IF NOT EXISTS "idx_jira_connections_active"
        ON "jira_connections" ("user_id", "is_active") WHERE "is_active" = true;
    `);

    console.log('Running service_connections migration...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "service_connections" (
        "id" TEXT PRIMARY KEY,
        "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "service_type" TEXT NOT NULL,
        "display_name" TEXT NOT NULL,
        "url" TEXT,
        "encrypted_token" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'active',
        "metadata" JSONB NOT NULL DEFAULT '{}',
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS "idx_service_connections_user_service_url"
        ON "service_connections" ("user_id", "service_type", COALESCE("url", ''));
      CREATE INDEX IF NOT EXISTS "idx_service_connections_user_type"
        ON "service_connections" ("user_id", "service_type");
      CREATE INDEX IF NOT EXISTS "idx_service_connections_user_active"
        ON "service_connections" ("user_id", "is_active");
    `);

    console.log('Migrations complete.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
