import { app } from './app';
import { getEnv } from './config/env';
import { logger } from './shared/logger';

const env = getEnv();

app.listen({ port: env.PORT, hostname: '0.0.0.0' }, ({ hostname, port }) => {
  logger.info(`Muxlyn API running at http://${hostname}:${port}`);
});
