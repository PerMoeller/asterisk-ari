/**
 * Connection pool for high-throughput scenarios
 *
 * This module provides a connection pool that maintains multiple ARI connections
 * for distributing load in high-volume call processing scenarios.
 *
 * @packageDocumentation
 */

import { connect, AriClient } from './client.js';
import type { PoolOptions } from './types/options.js';

/**
 * Connection pool for distributing load across multiple ARI connections.
 *
 * In high-throughput scenarios, a single ARI connection may become a bottleneck.
 * The connection pool maintains multiple connections and distributes requests
 * across them using round-robin selection.
 *
 * @remarks
 * All connections in the pool connect to the same Asterisk server and share
 * the same application name. Events will be received on all connections,
 * so you typically only need to set up event listeners on one client.
 *
 * @example
 * ```typescript
 * import { createPool } from '@per_moeller/asterisk-ari';
 *
 * // Create a pool with 5 connections
 * const pool = await createPool({
 *   url: 'http://localhost:8088',
 *   username: 'asterisk',
 *   password: 'secret',
 *   app: 'my-app',
 *   poolSize: 5
 * });
 *
 * // Get a connection for making requests
 * const client = pool.getConnection();
 * const channels = await client.channels.list();
 *
 * // Use withConnection for automatic selection
 * const result = await pool.withConnection(async (client) => {
 *   return client.channels.originate({ ... });
 * });
 *
 * // Clean up
 * await pool.stop();
 * ```
 */
export class ConnectionPool {
  private connections: AriClient[] = [];
  private currentIndex = 0;
  private readonly options: PoolOptions;
  private readonly poolSize: number;
  private initialized = false;

  /**
   * Create a new connection pool.
   *
   * @param options - Pool options including connection settings and pool size
   *
   * @remarks
   * The pool is not immediately connected. Call {@link initialize} or use
   * the {@link createPool} helper function to create an initialized pool.
   */
  constructor(options: PoolOptions) {
    this.options = options;
    this.poolSize = options.poolSize ?? 5;
  }

  /**
   * Initialize the connection pool by creating all connections.
   *
   * Creates `poolSize` number of connections in parallel and waits for
   * all of them to be established.
   *
   * @returns Promise that resolves when all connections are established
   * @throws {AriHttpError} If any connection fails
   *
   * @example
   * ```typescript
   * const pool = new ConnectionPool(options);
   * await pool.initialize();
   * ```
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
   * Get a connection from the pool using round-robin selection.
   *
   * Each call returns the next connection in the pool, cycling back
   * to the first after reaching the last.
   *
   * @returns An ARI client from the pool
   * @throws {Error} If the pool is not initialized
   *
   * @example
   * ```typescript
   * const client = pool.getConnection();
   * await client.channels.list();
   * ```
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
   * Get a connection that is currently connected.
   *
   * Searches through the pool using round-robin to find a connected client.
   * Returns undefined if no connections are available.
   *
   * @returns A connected ARI client, or undefined if none are connected
   *
   * @example
   * ```typescript
   * const client = pool.getConnectedConnection();
   * if (client) {
   *   await client.channels.list();
   * } else {
   *   console.log('No connections available');
   * }
   * ```
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
   * Get all connections in the pool.
   *
   * @returns Read-only array of all ARI clients in the pool
   */
  getConnections(): readonly AriClient[] {
    return this.connections;
  }

  /**
   * Get the total number of connections in the pool.
   */
  get size(): number {
    return this.connections.length;
  }

  /**
   * Get the number of currently connected clients.
   */
  get connectedCount(): number {
    return this.connections.filter(c => c.isConnected()).length;
  }

  /**
   * Stop all connections in the pool.
   *
   * Disconnects all clients and resets the pool state. The pool can be
   * re-initialized after calling stop.
   *
   * @returns Promise that resolves when all connections are stopped
   *
   * @example
   * ```typescript
   * // Graceful shutdown
   * await pool.stop();
   * ```
   */
  async stop(): Promise<void> {
    const stopPromises = this.connections.map(c => c.stop());
    await Promise.all(stopPromises);
    this.connections = [];
    this.currentIndex = 0;
    this.initialized = false;
  }

  /**
   * Check if the pool is initialized.
   *
   * @returns `true` if initialize() has been called successfully
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Execute a function with a pooled connection.
   *
   * Automatically selects a connection from the pool and passes it to
   * the provided function. Useful for one-off operations.
   *
   * @typeParam T - Return type of the function
   * @param fn - Function to execute with the connection
   * @returns Promise resolving to the function's return value
   *
   * @example
   * ```typescript
   * const channels = await pool.withConnection(async (client) => {
   *   return client.channels.list();
   * });
   *
   * const bridge = await pool.withConnection(async (client) => {
   *   return client.bridges.create({ type: 'mixing' });
   * });
   * ```
   */
  async withConnection<T>(fn: (client: AriClient) => Promise<T>): Promise<T> {
    const client = this.getConnection();
    return fn(client);
  }
}

/**
 * Create and initialize a connection pool.
 *
 * This is a convenience function that creates a pool and initializes it
 * in one step.
 *
 * @param options - Pool options including connection settings and pool size
 * @returns Promise resolving to an initialized connection pool
 * @throws {AriHttpError} If any connection fails
 *
 * @example
 * ```typescript
 * const pool = await createPool({
 *   url: 'http://localhost:8088',
 *   username: 'asterisk',
 *   password: 'secret',
 *   app: 'my-app',
 *   poolSize: 10
 * });
 *
 * console.log(`Pool has ${pool.size} connections`);
 * ```
 */
export async function createPool(options: PoolOptions): Promise<ConnectionPool> {
  const pool = new ConnectionPool(options);
  await pool.initialize();
  return pool;
}
