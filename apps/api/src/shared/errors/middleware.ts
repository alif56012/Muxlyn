import { Elysia } from 'elysia';
import { logger } from '../logger';
import { AppError, InternalError } from './index';

export const errorMiddleware = new Elysia()
  .onError(({ error, set }) => {
    if (error instanceof AppError) {
      set.status = error.statusCode;
      return {
        success: false,
        message: error.message,
        error: {
          code: error.code,
          details: error.details,
        },
      };
    }

    logger.error({ err: error }, 'Unhandled error');
    const internal = new InternalError();
    set.status = 500;
    return {
      success: false,
      message: internal.message,
      error: {
        code: internal.code,
      },
    };
  })
  .onRequest(({ request }) => {
    logger.info({ method: request.method, url: request.url }, 'Request');
  });
