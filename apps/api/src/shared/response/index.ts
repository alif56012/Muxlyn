import type { ApiResponse } from '@muxlyn/shared';

export function success<T>(message: string, data?: T): ApiResponse<T> {
  return { success: true, message, data };
}

export function error(
  message: string,
  code: string,
  details?: Record<string, unknown>,
): ApiResponse<never> {
  return {
    success: false,
    message,
    error: { code, details },
  };
}
