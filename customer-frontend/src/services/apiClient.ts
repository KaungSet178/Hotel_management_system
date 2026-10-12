import { AppError, ErrorCodes } from './errors';

/**
 * Minimal typed fetch wrapper for the real backend.
 *
 * The base URL comes from `VITE_API_BASE_URL`. When it is not configured the
 * request fails with a clear, actionable error instead of silently falling
 * back to mock data — so integration problems are obvious.
 */

export interface ApiClientConfig {
  baseUrl: string;
  timeoutMs?: number;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  query?: Record<string, string | number | undefined>;
}

export interface ApiEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.timeoutMs = config.timeoutMs ?? 15000;
  }

  get configured(): boolean {
    return this.baseUrl.length > 0;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    if (!this.configured) {
      throw new AppError(
        'The backend API is not configured. Set VITE_API_BASE_URL (and VITE_SERVICE_MODE=http) to connect the real service.',
        ErrorCodes.NETWORK,
      );
    }

    const url = new URL(`${this.baseUrl}${path}`);
    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    const token = typeof window !== 'undefined' ? window.localStorage.getItem('stayflow.auth.token') : null;
    const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: options.method ?? 'GET',
        headers: {
          Accept: 'application/json',
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...authHeader,
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new AppError('The request timed out. Please try again.', ErrorCodes.NETWORK);
      }
      throw new AppError('Unable to reach the server. Check your connection.', ErrorCodes.NETWORK);
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const payload = await safeJson(response);
      const message =
        (payload && typeof payload === 'object' && 'message' in payload
          ? String((payload as { message: unknown }).message)
          : undefined) ?? `Request failed with status ${response.status}`;
      const code =
        response.status === 404
          ? ErrorCodes.NOT_FOUND
          : response.status >= 500
            ? ErrorCodes.SERVER
            : ErrorCodes.INVALID_INPUT;
      throw new AppError(message, code, response.status);
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }
}

async function safeJson(response: Response): Promise<unknown | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
export const apiClient = new ApiClient({ baseUrl });