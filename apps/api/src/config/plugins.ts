import { cors } from '@elysiajs/cors';
import { Elysia } from 'elysia';
import { getEnv } from './env';

const env = getEnv();

export const plugins = new Elysia().use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);
