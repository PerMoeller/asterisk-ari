/**
 * Connection pool for high-throughput scenarios
 */

import { connect, AriClient } from './client.js';
import type { PoolOptions } from './types/options.js';

/**
 * Connection pool for distributing load across multiple ARI connections
 */
export class ConnectionPool {
  private connections: AriClient[] = [];
  private currentIndex = 0;
  private readonly options: PoolOptions;
  private readonly poolSize: number;
  private initialized = false;

  constructor(options: PoolOptions) {
    this.options = options;
    this.poolSize = options.poolSize ?? 5;
  }

  /**
   * Initialize the connection pool
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const connectionPromises: Promise<AriClient>[] = [];

    for (let i = 0; i < this.poolSize; i++) {
      connectionPromises.push(connect(this.options));
    }

    this.connections = await Promise.all(connectionPromises);
    this.initialized = true;
  }

  /**
   * Get a connection from the pool (round-robin)
   */
  getConnection(): AriClient {
    if (!this.initialized || this.connections.length === 0) {
      throw new Error('Connection pool not initialized. Call initialize() first.');
    }

    const client = this.connections[this.currentIndex]!;
    this.currentIndex = (this.currentIndex + 1) % this.connections.length;
    return client;
  }

  /**
   * Get a connection that is currently connected
   */
  getConnectedConnection(): AriClient | undefined {
    if (!this.initialized) {
      return undefined;
    }

    // Try round-robin first
    const startIndex = this.currentIndex;
    do {
      const client = this.connections[this.currentIndex]!;
      this.currentIndex = (this.currentIndex + 1) % this.connections.length;

      if (client.isConnected()) {
        return client;
      }
    } while (this.currentIndex !== startIndex);

    return undefined;
  }

  /**
   * Get all connections in the pool
   */
  getConnections(): readonly AriClient[] {
    return this.connections;
  }

  /**
   * Get the number of connections in the pool
   */
  get size(): number {
    return this.connections.length;
  }

  /**
   * Get the number of connected clients
   */
  get connectedCount(): number {
    return this.connections.filter(c => c.isConnected()).length;
  }

  /**
   * Stop all connections in the pool
   */
  async stop(): Promise<void> {
    const stopPromises = this.connections.map(c => c.stop());
    await Promise.all(stopPromises);
    this.connections = [];
    this.currentIndex = 0;
    this.initialized = false;
  }

  /**
   * Check if the pool is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Execute a function with a pooled connection
   */
  async withConnection<T>(fn: (client: AriClient) => Promise<T>): Promise<T> {
    const client = this.getConnection();
    return fn(client);
  }
}

/**
 * Create and initialize a connection pool
 */
export async function createPool(options: PoolOptions): Promise<ConnectionPool> {
  const pool = new ConnectionPool(options);
  await pool.initialize();
  return pool;
}
