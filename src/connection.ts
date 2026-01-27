/**
 * HTTP connection manager using native fetch
 *
 * This module provides the HTTP layer for communicating with the Asterisk
 * ARI REST API endpoints.
 *
 * @packageDocumentation
 */

import type { ResolvedOptions } from './types/options.js';

/**
 * Error thrown when an ARI HTTP request fails.
 *
 * Contains the HTTP status code and the response body (if available)
 * for debugging purposes.
 *
 * @example
 * ```typescript
 * try {
 *   await client.channels.get('non-existent-id');
 * } catch (error) {
 *   if (error instanceof AriHttpError) {
 *     console.log(`Status: ${error.statusCode}`);
 *     console.log(`Response: ${JSON.stringify(error.response)}`);
 *   }
 * }
 * ```
 */
export class AriHttpError extends Error {
  /**
   * Creates a new ARI HTTP error.
   *
   * @param message - Error message describing what went wrong
   * @param statusCode - HTTP status code (0 for network errors)
   * @param response - Response body from the server (if available)
   */
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
 * Query parameters for HTTP requests.
 *
 * Supports string, number, boolean, and string array values.
 * Undefined values are automatically filtered out.
 */
export type QueryParams = Record<string, string | number | boolean | string[] | undefined>;

/**
 * Convert an object to query parameters.
 *
 * This is a simple type assertion helper for converting typed objects
 * to the generic QueryParams type.
 *
 * @param obj - Object to convert
 * @returns Query parameters object or undefined
 *
 * @internal
 */
export function toQueryParams(obj?: object): QueryParams | undefined {
  if (!obj) return undefined;
  return obj as QueryParams;
}

/**
 * Options for making HTTP requests.
 *
 * @internal
 */
export interface RequestOptions {
  /** HTTP method (default: 'GET') */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Request body (will be JSON-serialized) */
  body?: unknown;
  /** Query parameters to append to the URL */
  query?: QueryParams;
  /** Request timeout in milliseconds (overrides default) */
  timeout?: number;
}

/**
 * HTTP connection manager for ARI REST API.
 *
 * Handles all HTTP communication with Asterisk, including authentication,
 * request timeouts, and error handling.
 *
 * @remarks
 * This class is used internally by the ARI client. You typically don't
 * need to use it directly unless building custom functionality.
 *
 * @example
 * ```typescript
 * const http = new HttpConnection(options);
 *
 * // Make requests
 * const channels = await http.get<Channel[]>('/channels');
 * const channel = await http.post<Channel>('/channels', undefined, {
 *   endpoint: 'PJSIP/1000',
 *   app: 'my-app'
 * });
 * ```
 */
export class HttpConnection {
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly defaultTimeout: number;

  /**
   * Creates a new HTTP connection.
   *
   * @param options - Resolved connection options with credentials and URL
   */
  constructor(options: ResolvedOptions) {
    // Ensure URL doesn't have trailing slash
    this.baseUrl = options.url.replace(/\/$/, '');
    // Create Basic auth header
    this.authHeader = 'Basic ' + Buffer.from(`${options.username}:${options.password}`).toString('base64');
    this.defaultTimeout = options.requestTimeout;
  }

  /**
   * Make an HTTP request to the ARI API.
   *
   * @typeParam T - Expected response type
   * @param path - API path (e.g., '/channels')
   * @param options - Request options
   * @returns Promise resolving to the response data
   * @throws {AriHttpError} If the request fails or returns an error status
   *
   * @example
   * ```typescript
   * // GET request
   * const channels = await http.request<Channel[]>('/channels');
   *
   * // POST with query params
   * const channel = await http.request<Channel>('/channels', {
   *   method: 'POST',
   *   query: { endpoint: 'PJSIP/1000', app: 'my-app' }
   * });
   * ```
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
   * Make a GET request.
   *
   * @typeParam T - Expected response type
   * @param path - API path
   * @param query - Optional query parameters
   * @returns Promise resolving to the response data
   */
  async get<T>(path: string, query?: RequestOptions['query']): Promise<T> {
    return this.request<T>(path, { method: 'GET', query });
  }

  /**
   * Make a POST request.
   *
   * @typeParam T - Expected response type
   * @param path - API path
   * @param body - Request body (will be JSON-serialized)
   * @param query - Optional query parameters
   * @returns Promise resolving to the response data
   */
  async post<T>(path: string, body?: unknown, query?: RequestOptions['query']): Promise<T> {
    return this.request<T>(path, { method: 'POST', body, query });
  }

  /**
   * Make a PUT request.
   *
   * @typeParam T - Expected response type
   * @param path - API path
   * @param body - Request body (will be JSON-serialized)
   * @param query - Optional query parameters
   * @returns Promise resolving to the response data
   */
  async put<T>(path: string, body?: unknown, query?: RequestOptions['query']): Promise<T> {
    return this.request<T>(path, { method: 'PUT', body, query });
  }

  /**
   * Make a DELETE request.
   *
   * @typeParam T - Expected response type
   * @param path - API path
   * @param query - Optional query parameters
   * @returns Promise resolving to the response data
   */
  async delete<T>(path: string, query?: RequestOptions['query']): Promise<T> {
    return this.request<T>(path, { method: 'DELETE', query });
  }

  /**
   * Get the base URL of the Asterisk server.
   *
   * Used internally for WebSocket connection URL construction.
   *
   * @returns Base URL (e.g., 'http://localhost:8088')
   *
   * @internal
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Get the authentication credentials.
   *
   * Used internally for WebSocket authentication.
   *
   * @returns Object with username and password
   *
   * @internal
   */
  getCredentials(): { username: string; password: string } {
    // Decode from auth header
    const base64 = this.authHeader.replace('Basic ', '');
    const decoded = Buffer.from(base64, 'base64').toString('utf-8');
    const [username, password] = decoded.split(':');
    return { username: username!, password: password! };
  }
}
