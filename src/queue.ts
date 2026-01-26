/**
 * Request queue with retry and circuit breaker
 */

import type { QueueOptions } from './types/options.js';

interface QueuedRequest<T> {
  request: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  retries: number;
}

type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Error thrown when circuit breaker is open
 */
export class CircuitBreakerOpenError extends Error {
  constructor() {
    super('Circuit breaker is open - requests are being rejected');
    this.name = 'CircuitBreakerOpenError';
  }
}

/**
 * Request queue with automatic retry and circuit breaker pattern
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

  constructor(options: QueueOptions = {}) {
    this.maxConcurrent = options.maxConcurrent ?? 10;
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelay = options.retryDelay ?? 1000;
    this.circuitBreakerThreshold = options.circuitBreakerThreshold ?? 5;
    this.circuitBreakerTimeout = options.circuitBreakerTimeout ?? 30000;
  }

  /**
   * Enqueue a request
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
   * Process the queue
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
   * Execute a single request with retry logic
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
   * Check if an error is retryable
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
   * Called on successful request
   */
  private onSuccess(): void {
    this.failureCount = 0;
    if (this.circuitState === 'half-open') {
      this.circuitState = 'closed';
    }
  }

  /**
   * Called on failed request
   */
  private onFailure(): void {
    this.failureCount++;
    if (this.failureCount >= this.circuitBreakerThreshold) {
      this.circuitState = 'open';
      this.circuitOpenTime = Date.now();
    }
  }

  /**
   * Update circuit breaker state based on timeout
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
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current queue length
   */
  get length(): number {
    return this.queue.length;
  }

  /**
   * Get current active request count
   */
  get active(): number {
    return this.activeCount;
  }

  /**
   * Get current circuit breaker state
   */
  get state(): CircuitState {
    this.updateCircuitState();
    return this.circuitState;
  }

  /**
   * Get failure count
   */
  get failures(): number {
    return this.failureCount;
  }

  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.failureCount = 0;
    this.circuitState = 'closed';
    this.circuitOpenTime = 0;
  }

  /**
   * Clear the queue (reject all pending requests)
   */
  clear(): void {
    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      item.reject(new Error('Queue cleared'));
    }
  }
}
