export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Not authenticated') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class SessionExpiredError extends AppError {
  constructor(message = 'Session expired') {
    super(message, 401, 'SESSION_EXPIRED');
  }
}

export class OAuthError extends AppError {
  constructor(message = 'Google authentication failed') {
    super(message, 502, 'OAUTH_ERROR');
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION', details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Route not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Database unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

export class InternalError extends AppError {
  constructor(message = 'Unexpected error') {
    super(message, 500, 'INTERNAL_ERROR');
  }
}
