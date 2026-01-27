/**
 * Request queue with retry and circuit breaker
 *
 * This module provides a request queue that handles automatic retries
 * and implements the circuit breaker pattern for fault tolerance.
 *
 * @packageDocumentation
 */

import type { QueueOptions } from './types/options.js';

interface QueuedRequest<T> {
  request: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  retries: number;
}

/**
 * Circuit breaker state.
 *
 * - `closed` - Normal operation, requests are processed
 * - `open` - Too many failures, requests are rejected immediately
 * - `half-open` - Testing if the system has recovered
 */
type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Error thrown when the circuit breaker is open.
 *
 * This error is thrown immediately when attempting to enqueue a request
 * while the circuit breaker is in the open state, without attempting
 * the actual request.
 *
 * @example
 * ```typescript
 * try {
 *   await queue.enqueue(() => client.channels.list());
 * } catch (error) {
 *   if (error instanceof CircuitBreakerOpenError) {
 *     console.log('Service temporarily unavailable');
 *   }
 * }
 * ```
 */
export class CircuitBreakerOpenError extends Error {
  constructor() {
    super('Circuit breaker is open - requests are being rejected');
    this.name = 'CircuitBreakerOpenError';
  }
}

/**
 * Request queue with automatic retry and circuit breaker pattern.
 *
 * Provides controlled request execution with:
 * - Concurrent request limiting
 * - Automatic retry with exponential backoff
 * - Circuit breaker to prevent cascading failures
 *
 * @remarks
 * The circuit breaker pattern helps prevent overwhelming a failing service.
 * After a threshold of failures, the circuit "opens" and rejects requests
 * immediately. After a timeout, it enters "half-open" state to test if the
 * service has recovered.
 *
 * @example
 * ```typescript
 * import { RequestQueue } from '@per_moeller/asterisk-ari';
 *
 * const queue = new RequestQueue({
 *   maxConcurrent: 10,
 *   maxRetries: 3,
 *   retryDelay: 1000,
 *   circuitBreakerThreshold: 5,
 *   circuitBreakerTimeout: 30000
 * });
 *
 * // Enqueue requests
 * const result = await queue.enqueue(async () => {
 *   return fetch('https://api.example.com/data');
 * });
 *
 * // Check circuit breaker state
 * if (queue.state === 'open') {
 *   console.log('Circuit breaker is open, requests will fail fast');
 * }
 *
 * // Reset if needed
 * queue.reset();
 * ```
 */
export class RequestQueue {
  private queue: QueuedRequest<unknown>[] = [];
  private activeCount = 0;
  private failureCount = 0;
  private circuitState: CircuitState = 'closed';
  private circuitOpenTime = 0;

  private readonly maxConcurrent: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly circuitBreakerThreshold: number;
  private readonly circuitBreakerTimeout: number;

  /**
   * Create a new request queue.
   *
   * @param options - Queue configuration options
   */
  constructor(options: QueueOptions = {}) {
    this.maxConcurrent = options.maxConcurrent ?? 10;
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelay = options.retryDelay ?? 1000;
    this.circuitBreakerThreshold = options.circuitBreakerThreshold ?? 5;
    this.circuitBreakerTimeout = options.circuitBreakerTimeout ?? 30000;
  }

  /**
   * Enqueue a request for execution.
   *
   * The request will be executed when a slot is available (based on
   * maxConcurrent). If the request fails, it will be automatically
   * retried up to maxRetries times with exponential backoff.
   *
   * @typeParam T - Return type of the request
   * @param request - Async function that performs the request
   * @returns Promise resolving to the request result
   * @throws {CircuitBreakerOpenError} If the circuit breaker is open
   * @throws {Error} If the request fails after all retries
   *
   * @example
   * ```typescript
   * const channels = await queue.enqueue(async () => {
   *   return client.channels.list();
   * });
   * ```
   */
  async enqueue<T>(request: () => Promise<T>): Promise<T> {
    // Check circuit breaker state
    this.updateCircuitState();

    if (this.circuitState === 'open') {
      throw new CircuitBreakerOpenError();
    }

    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        request: request as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
        retries: 0,
      });
      this.processQueue();
    });
  }

  /**
   * Process the queue by executing pending requests.
   * @internal
   */
  private async processQueue(): Promise<void> {
    while (this.queue.length > 0 && this.activeCount < this.maxConcurrent) {
      // Check circuit state before processing
      this.updateCircuitState();
      if (this.circuitState === 'open') {
        // Reject all pending requests
        while (this.queue.length > 0) {
          const item = this.queue.shift()!;
          item.reject(new CircuitBreakerOpenError());
        }
        return;
      }

      const item = this.queue.shift()!;
      this.activeCount++;

      this.executeRequest(item).finally(() => {
        this.activeCount--;
        this.processQueue();
      });
    }
  }

  /**
   * Execute a single request with retry logic.
   * @internal
   */
  private async executeRequest(item: QueuedRequest<unknown>): Promise<void> {
    try {
      const result = await item.request();
      this.onSuccess();
      item.resolve(result);
    } catch (error) {
      if (item.retries < this.maxRetries && this.isRetryable(error)) {
        item.retries++;
        await this.delay(this.retryDelay * item.retries);

        // Re-check circuit state before retry
        this.updateCircuitState();
        if (this.circuitState === 'open') {
          item.reject(new CircuitBreakerOpenError());
          return;
        }

        // Re-queue for retry
        this.queue.unshift(item);
      } else {
        this.onFailure();
        item.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  /**
   * Check if an error is retryable.
   * @internal
   */
  private isRetryable(error: unknown): boolean {
    if (error instanceof Error) {
      // Retry on network errors and 5xx server errors
      const message = error.message.toLowerCase();
      if (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('econnrefused') ||
        message.includes('econnreset') ||
        message.includes('socket')
      ) {
        return true;
      }

      // Check for HTTP status codes
      const statusMatch = message.match(/(\d{3})/);
      if (statusMatch) {
        const status = parseInt(statusMatch[1]!, 10);
        // Retry on 5xx errors and 429 (rate limited)
        return status >= 500 || status === 429;
      }
    }
    return false;
  }

  /**
   * Called on successful request to reset failure count.
   * @internal
   */
  private onSuccess(): void {
    this.failureCount = 0;
    if (this.circuitState === 'half-open') {
      this.circuitState = 'closed';
    }
  }

  /**
   * Called on failed request to track failures.
   * @internal
   */
  private onFailure(): void {
    this.failureCount++;
    if (this.failureCount >= this.circuitBreakerThreshold) {
      this.circuitState = 'open';
      this.circuitOpenTime = Date.now();
    }
  }

  /**
   * Update circuit breaker state based on timeout.
   * @internal
   */
  private updateCircuitState(): void {
    if (this.circuitState === 'open') {
      const elapsed = Date.now() - this.circuitOpenTime;
      if (elapsed >= this.circuitBreakerTimeout) {
        this.circuitState = 'half-open';
        this.failureCount = 0;
      }
    }
  }

  /**
   * Delay helper for retry backoff.
   * @internal
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get the current queue length (pending requests).
   */
  get length(): number {
    return this.queue.length;
  }

  /**
   * Get the current number of active (executing) requests.
   */
  get active(): number {
    return this.activeCount;
  }

  /**
   * Get the current circuit breaker state.
   *
   * @returns Current state: 'closed', 'open', or 'half-open'
   */
  get state(): CircuitState {
    this.updateCircuitState();
    return this.circuitState;
  }

  /**
   * Get the current consecutive failure count.
   */
  get failures(): number {
    return this.failureCount;
  }

  /**
   * Reset the circuit breaker to closed state.
   *
   * This clears the failure count and allows requests to proceed normally.
   * Use this after fixing the underlying issue that caused failures.
   *
   * @example
   * ```typescript
   * // After fixing the issue
   * queue.reset();
   * console.log(queue.state); // 'closed'
   * ```
   */
  reset(): void {
    this.failureCount = 0;
    this.circuitState = 'closed';
    this.circuitOpenTime = 0;
  }

  /**
   * Clear the queue and reject all pending requests.
   *
   * Active requests will continue to execute, but pending requests
   * in the queue will be rejected with an error.
   *
   * @example
   * ```typescript
   * // Cancel all pending requests
   * queue.clear();
   * ```
   */
  clear(): void {
    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      item.reject(new Error('Queue cleared'));
    }
  }
}
