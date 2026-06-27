import { sql } from 'drizzle-orm';
import { Elysia } from 'elysia';
import { db } from '../../data/postgres';
import { t as i18n } from '../../shared/i18n';
import { success } from '../../shared/response';

export const healthModule = new Elysia({ prefix: '/health' })
  .get('/', () => success(i18n('health.ok')))
  .get('/live', () => success(i18n('health.live')))
  .get('/ready', async ({ set }) => {
    try {
      await db.execute(sql`SELECT 1`);
      return success(i18n('health.ready'));
    } catch {
      set.status = 503;
      return success(i18n('error.service_unavailable'));
    }
  });
