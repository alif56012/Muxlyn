export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    details?: Record<string, unknown>;
  };
}

export type Locale = 'en' | 'th';

export interface User {
  id: string;
  email: string;
  name: string;
  image?: string | null;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
}
