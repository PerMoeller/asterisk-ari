/**
 * Connection options for ARI client
 */
export interface ConnectOptions {
  /** Base URL of the Asterisk server (e.g., 'http://localhost:8088') */
  url: string;
  /** ARI username */
  username: string;
  /** ARI password */
  password: string;
  /** Stasis application name(s) - can be a single app or comma-separated list */
  app: string;
  /** Subscribe to all Asterisk events (default: false) */
  subscribeAll?: boolean;
  /** Enable automatic WebSocket reconnection (default: true) */
  reconnect?: boolean;
  /** Initial reconnect interval in ms (default: 1000) */
  reconnectInterval?: number;
  /** Maximum reconnect interval in ms (default: 30000) */
  maxReconnectInterval?: number;
  /** Backoff multiplier for reconnection delay (default: 1.5) */
  reconnectBackoffMultiplier?: number;
  /** WebSocket ping interval in ms (default: 30000) */
  pingInterval?: number;
  /** Ping response timeout in ms (default: 5000) */
  pingTimeout?: number;
  /** HTTP request timeout in ms (default: 30000) */
  requestTimeout?: number;
}

/**
 * Internal resolved options with defaults applied
 */
export interface ResolvedOptions {
  url: string;
  username: string;
  password: string;
  app: string;
  subscribeAll: boolean;
  reconnect: boolean;
  reconnectInterval: number;
  maxReconnectInterval: number;
  reconnectBackoffMultiplier: number;
  pingInterval: number;
  pingTimeout: number;
  requestTimeout: number;
}

/**
 * Default connection options
 */
export const DEFAULT_OPTIONS: Omit<ResolvedOptions, 'url' | 'username' | 'password' | 'app'> = {
  subscribeAll: false,
  reconnect: true,
  reconnectInterval: 1000,
  maxReconnectInterval: 30000,
  reconnectBackoffMultiplier: 1.5,
  pingInterval: 30000,
  pingTimeout: 5000,
  requestTimeout: 30000,
};

/**
 * Resolve options with defaults
 */
export function resolveOptions(options: ConnectOptions): ResolvedOptions {
  return {
    ...DEFAULT_OPTIONS,
    ...options,
  };
}

/**
 * Connection pool options
 */
export interface PoolOptions extends ConnectOptions {
  /** Number of connections in the pool (default: 5) */
  poolSize?: number;
}

/**
 * Request queue options
 */
export interface QueueOptions {
  /** Maximum concurrent requests (default: 10) */
  maxConcurrent?: number;
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial retry delay in ms (default: 1000) */
  retryDelay?: number;
  /** Failures before opening circuit breaker (default: 5) */
  circuitBreakerThreshold?: number;
  /** Time before half-open state in ms (default: 30000) */
  circuitBreakerTimeout?: number;
}
