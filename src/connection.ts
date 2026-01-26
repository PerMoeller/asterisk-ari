/**
 * HTTP connection manager using native fetch
 */

import type { ResolvedOptions } from './types/options.js';

/**
 * ARI-specific HTTP error
 */
export class AriHttpError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'AriHttpError';
  }
}

/**
 * Query parameter type
 */
export type QueryParams = Record<string, string | number | boolean | string[] | undefined>;

/**
 * Convert any object to query params
 */
export function toQueryParams(obj?: object): QueryParams | undefined {
  if (!obj) return undefined;
  return obj as QueryParams;
}

/**
 * Request options for HTTP calls
 */
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: QueryParams;
  timeout?: number;
}

/**
 * HTTP connection manager for ARI REST API
 */
export class HttpConnection {
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly defaultTimeout: number;

  constructor(options: ResolvedOptions) {
    // Ensure URL doesn't have trailing slash
    this.baseUrl = options.url.replace(/\/$/, '');
    // Create Basic auth header
    this.authHeader = 'Basic ' + Buffer.from(`${options.username}:${options.password}`).toString('base64');
    this.defaultTimeout = options.requestTimeout;
  }

  /**
   * Make an HTTP request to the ARI API
   */
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, query, timeout = this.defaultTimeout } = options;

    // Build URL with query parameters
    let url = `${this.baseUrl}/ari${path}`;
    if (query) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            // Handle array parameters (e.g., channel=[id1,id2])
            params.append(key, value.join(','));
          } else {
            params.append(key, String(value));
          }
        }
      }
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    // Set up abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle error responses
      if (!response.ok) {
        let errorBody: unknown;
        try {
          errorBody = await response.json();
        } catch {
          errorBody = await response.text();
        }
        throw new AriHttpError(
          `ARI request failed: ${response.status} ${response.statusText}`,
          response.status,
          errorBody
        );
      }

      // Handle empty responses (204 No Content)
      if (response.status === 204) {
        return undefined as T;
      }

      // Parse JSON response
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json() as T;
      }

      // Return text for non-JSON responses
      return await response.text() as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof AriHttpError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new AriHttpError(`Request timeout after ${timeout}ms`, 0);
        }
        throw new AriHttpError(error.message, 0);
      }

      throw new AriHttpError('Unknown error', 0);
    }
  }

  /**
   * GET request
   */
  async get<T>(path: string, query?: RequestOptions['query']): Promise<T> {
    return this.request<T>(path, { method: 'GET', query });
  }

  /**
   * POST request
   */
  async post<T>(path: string, body?: unknown, query?: RequestOptions['query']): Promise<T> {
    return this.request<T>(path, { method: 'POST', body, query });
  }

  /**
   * PUT request
   */
  async put<T>(path: string, body?: unknown, query?: RequestOptions['query']): Promise<T> {
    return this.request<T>(path, { method: 'PUT', body, query });
  }

  /**
   * DELETE request
   */
  async delete<T>(path: string, query?: RequestOptions['query']): Promise<T> {
    return this.request<T>(path, { method: 'DELETE', query });
  }

  /**
   * Get the base URL (for WebSocket connection)
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Get the auth credentials (for WebSocket connection)
   */
  getCredentials(): { username: string; password: string } {
    // Decode from auth header
    const base64 = this.authHeader.replace('Basic ', '');
    const decoded = Buffer.from(base64, 'base64').toString('utf-8');
    const [username, password] = decoded.split(':');
    return { username: username!, password: password! };
  }
}
