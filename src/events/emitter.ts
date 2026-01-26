/**
 * Type-safe event emitter for ARI events
 */

import { EventEmitter } from 'events';
import type { AriEventMap, AriEventType } from './types.js';

type EventListener<T> = (event: T, ...args: unknown[]) => void | Promise<void>;

/**
 * Typed event emitter with support for wildcard listeners
 */
export class TypedEventEmitter<TEventMap extends object> {
  private emitter = new EventEmitter();
  private wildcardListeners: Set<EventListener<unknown>> = new Set();

  constructor() {
    this.emitter.setMaxListeners(100);
  }

  /**
   * Add an event listener
   */
  on<K extends keyof TEventMap>(
    event: K,
    listener: EventListener<TEventMap[K]>
  ): this {
    if (event === '*') {
      this.wildcardListeners.add(listener as EventListener<unknown>);
    } else {
      this.emitter.on(event as string, listener);
    }
    return this;
  }

  /**
   * Add a one-time event listener
   */
  once<K extends keyof TEventMap>(
    event: K,
    listener: EventListener<TEventMap[K]>
  ): this {
    if (event === '*') {
      const wrappedListener: EventListener<unknown> = (ev, ...args) => {
        this.wildcardListeners.delete(wrappedListener);
        (listener as EventListener<unknown>)(ev, ...args);
      };
      this.wildcardListeners.add(wrappedListener);
    } else {
      this.emitter.once(event as string, listener);
    }
    return this;
  }

  /**
   * Remove an event listener
   */
  off<K extends keyof TEventMap>(
    event: K,
    listener: EventListener<TEventMap[K]>
  ): this {
    if (event === '*') {
      this.wildcardListeners.delete(listener as EventListener<unknown>);
    } else {
      this.emitter.off(event as string, listener);
    }
    return this;
  }

  /**
   * Emit an event
   */
  emit<K extends keyof TEventMap>(event: K, data: TEventMap[K], ...args: unknown[]): boolean {
    // Emit to specific listeners
    const hasListeners = this.emitter.emit(event as string, data, ...args);

    // Emit to wildcard listeners
    for (const listener of this.wildcardListeners) {
      try {
        listener(data, ...args);
      } catch (error) {
        console.error('Error in wildcard event listener:', error);
      }
    }

    return hasListeners || this.wildcardListeners.size > 0;
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners<K extends keyof TEventMap>(event?: K): this {
    if (event === undefined) {
      this.emitter.removeAllListeners();
      this.wildcardListeners.clear();
    } else if (event === '*') {
      this.wildcardListeners.clear();
    } else {
      this.emitter.removeAllListeners(event as string);
    }
    return this;
  }

  /**
   * Get listener count for an event
   */
  listenerCount<K extends keyof TEventMap>(event: K): number {
    if (event === '*') {
      return this.wildcardListeners.size;
    }
    return this.emitter.listenerCount(event as string);
  }

  /**
   * Set max listeners
   */
  setMaxListeners(n: number): this {
    this.emitter.setMaxListeners(n);
    return this;
  }
}

/**
 * ARI Event emitter with typed events
 */
export class AriEventEmitter extends TypedEventEmitter<AriEventMap> {
  /**
   * Add a listener for a specific event type
   */
  override on<K extends AriEventType | '*'>(
    event: K,
    listener: EventListener<AriEventMap[K]>
  ): this {
    return super.on(event, listener);
  }

  /**
   * Add a one-time listener for a specific event type
   */
  override once<K extends AriEventType | '*'>(
    event: K,
    listener: EventListener<AriEventMap[K]>
  ): this {
    return super.once(event, listener);
  }

  /**
   * Remove a listener for a specific event type
   */
  override off<K extends AriEventType | '*'>(
    event: K,
    listener: EventListener<AriEventMap[K]>
  ): this {
    return super.off(event, listener);
  }
}

/**
 * Connection event map
 */
export interface ConnectionEventMap {
  connected: void;
  disconnected: { intentional: boolean; error?: Error };
  reconnecting: { attempt: number; delay: number };
  reconnected: void;
  error: Error;
  message: unknown;
}

/**
 * Connection event emitter
 */
export class ConnectionEventEmitter extends TypedEventEmitter<ConnectionEventMap> {}
