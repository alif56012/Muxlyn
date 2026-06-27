import type { ApiResponse } from '@muxlyn/shared';
import { createAuthClient } from 'better-auth/react';
import i18next from 'i18next';

const BASE_URL = import.meta.env.VITE_API_URL || '';
const SESSION_EVENT_KEY = 'muxlyn:session_event_fired';

export const authClient = createAuthClient({
  baseURL: BASE_URL,
  basePath: '/auth/api',
});

async function request<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${BASE_URL}${url}`, {
      credentials: 'include',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
    });

    clearTimeout(timeoutId);

    const sessionWarning = response.headers.get('X-Session-Warning');
    if (sessionWarning === 'expiring') {
      window.dispatchEvent(
        new CustomEvent('toast:show', {
          detail: { message: i18next.t('session.warning'), variant: 'warning' },
        }),
      );
    }

    const body = await response.json().catch(() => null);

    if (response.status === 401 && body) {
      const errorCode = body?.error?.code;
      if (!sessionStorage.getItem(SESSION_EVENT_KEY)) {
        sessionStorage.setItem(SESSION_EVENT_KEY, '1');
        setTimeout(() => sessionStorage.removeItem(SESSION_EVENT_KEY), 2000);
        if (errorCode === 'SESSION_EXPIRED')
          window.dispatchEvent(new CustomEvent('session:expired'));
        else if (errorCode === 'IP_CHANGED')
          window.dispatchEvent(new CustomEvent('session:ipChanged'));
      }
    }

    return body ?? { success: false, message: '', error: { code: 'NETWORK_ERROR' } };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { success: false, message: '', error: { code: 'TIMEOUT' } };
    }
    return { success: false, message: '', error: { code: 'NETWORK_ERROR' } };
  }
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined }),
};
