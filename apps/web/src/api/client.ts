import type { ApiResponse } from '@muxlyn/shared';

const BASE_URL = import.meta.env.VITE_API_URL || '';

async function request<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(`${BASE_URL}${url}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  return response.json();
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  getSession: () => request('/api/auth/me'),
  signInGoogle: () => {
    window.location.href = `${BASE_URL}/auth/api/sign-in/social`;
  },
  signOut: () => request('/auth/api/sign-out', { method: 'POST' }),
};
