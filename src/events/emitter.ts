/**
 * Type-safe event emitter for ARI events
 *
 * This module provides typed event emitter classes that ensure type safety
 * when listening to and emitting ARI events.
 *
 * @packageDocumentation
 */

import { EventEmitter } from 'events';
import type { AriEventMap, AriEventType } from './types.js';
import type { ChannelInstance } from '../models/channel.js';
import type { BridgeInstance } from '../models/bridge.js';
import type { PlaybackInstance } from '../models/playback.js';
import type { LiveRecordingInstance } from '../models/recording.js';
import type { Endpoint } from '../types/api.js';

/**
 * Maps event types to their convenience instance argument type.
 *
 * This provides the instance types (with methods) for event callbacks,
 * enabling ari-client style usage:
 *
 * @example
 * ```typescript
 * client.on('StasisStart', (event, channel) => {
 *   // channel is ChannelInstance with methods like answer(), play(), etc.
 *   channel.answer();
 * });
 * ```
 */
export type EventInstanceArg<K extends AriEventType> =
  K extends 'StasisStart' | 'StasisEnd' | 'ChannelCreated' | 'ChannelDestroyed' |
           'ChannelStateChange' | 'ChannelDtmfReceived' | 'ChannelHangupRequest' |
           'ChannelHold' | 'ChannelUnhold' | 'ChannelTalkingStarted' |
           'ChannelTalkingFinished' | 'ChannelConnectedLine' | 'ChannelDialplan' |
           'ChannelCallerId' | 'ChannelToneDetected' | 'ChannelEnteredBridge' |
           'ChannelLeftBridge' | 'ChannelTransfer' | 'BridgeBlindTransfer' |
           'ApplicationMoveFailed'
    ? ChannelInstance
    : K extends 'BridgeCreated' | 'BridgeDestroyed' | 'BridgeMerged' | 'BridgeVideoSourceChanged'
    ? BridgeInstance
    : K extends 'PlaybackStarted' | 'PlaybackContinuing' | 'PlaybackFinished'
    ? PlaybackInstance
    : K extends 'RecordingStarted' | 'RecordingFinished' | 'RecordingFailed'
    ? LiveRecordingInstance
    : K extends 'EndpointStateChange' | 'PeerStatusChange' | 'ContactStatusChange'
    ? Endpoint  // Endpoints don't have an instance class yet
    : K extends 'Dial'
    ? ChannelInstance // peer channel
    : K extends 'ChannelVarset'
    ? ChannelInstance | undefined // channel is optional in ChannelVarset
    : K extends 'ChannelUserevent'
    ? ChannelInstance | undefined // channel is optional in ChannelUserevent
    : undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GenericListener = (...args: any[]) => void | Promise<void>;

/**
 * A typed event emitter with support for wildcard listeners.
 *
 * This generic class wraps Node.js EventEmitter to provide type-safe
 * event handling based on an event map type parameter.
 *
 * @typeParam TEventMap - Object type mapping event names to event data types
 *
 * @example
 * ```typescript
 * interface MyEvents {
 *   userJoined: { userId: string; name: string };
 *   userLeft: { userId: string };
 *   '*': { userId: string } | { userId: string; name: string };
 * }
 *
 * const emitter = new TypedEventEmitter<MyEvents>();
 *
 * emitter.on('userJoined', (event) => {
 *   // event is typed as { userId: string; name: string }
 *   console.log(event.name);
 * });
 * ```
 */
export class TypedEventEmitter<TEventMap extends object> {
  private emitter = new EventEmitter();
  private wildcardListeners: Set<GenericListener> = new Set();

  constructor() {
    this.emitter.setMaxListeners(100);
  }

  /**
   * Add an event listener.
   *
   * @param event - Event name to listen for, or '*' for all events
   * @param listener - Callback function to invoke when event occurs
   * @returns This emitter for chaining
   *
   * @example
   * ```typescript
   * emitter.on('userJoined', (event) => {
   *   console.log(`${event.name} joined`);
   * });
   * ```
   */
  on<K extends keyof TEventMap>(
    event: K,
    listener: (event: TEventMap[K], ...args: unknown[]) => void | Promise<void>
  ): this {
    if (event === '*') {
      this.wildcardListeners.add(listener as GenericListener);
    } else {
      this.emitter.on(event as string, listener);
    }
    return this;
  }

  /**
   * Add a one-time event listener.
   *
   * The listener is automatically removed after being invoked once.
   *
   * @param event - Event name to listen for, or '*' for all events
   * @param listener - Callback function to invoke when event occurs
   * @returns This emitter for chaining
   */
  once<K extends keyof TEventMap>(
    event: K,
    listener: (event: TEventMap[K], ...args: unknown[]) => void | Promise<void>
  ): this {
    if (event === '*') {
      const wrappedListener: GenericListener = (...args) => {
        this.wildcardListeners.delete(wrappedListener);
        (listener as GenericListener)(...args);
      };
      this.wildcardListeners.add(wrappedListener);
    } else {
      this.emitter.once(event as string, listener);
    }
    return this;
  }

  /**
   * Remove an event listener.
   *
   * @param event - Event name the listener was registered for
   * @param listener - The listener function to remove
   * @returns This emitter for chaining
   */
  off<K extends keyof TEventMap>(
    event: K,
    listener: (event: TEventMap[K], ...args: unknown[]) => void | Promise<void>
  ): this {
    if (event === '*') {
      this.wildcardListeners.delete(listener as GenericListener);
    } else {
      this.emitter.off(event as string, listener);
    }
    return this;
  }

  /**
   * Emit an event to all registered listeners.
   *
   * @param event - Event name to emit
   * @param data - Event data to pass to listeners
   * @param convenienceArg - Optional second argument for listeners
   * @returns `true` if any listeners were invoked
   *
   * @internal
   */
  emit<K extends keyof TEventMap>(event: K, data: TEventMap[K], convenienceArg?: unknown): boolean {
    // Emit to specific listeners
    const hasListeners = convenienceArg !== undefined
      ? this.emitter.emit(event as string, data, convenienceArg)
      : this.emitter.emit(event as string, data);

    // Emit to wildcard listeners
    for (const listener of this.wildcardListeners) {
      try {
        listener(data);
      } catch (error) {
        console.error('Error in wildcard event listener:', error);
      }
    }

    return hasListeners || this.wildcardListeners.size > 0;
  }

  /**
   * Remove all listeners for a specific event or all events.
   *
   * @param event - Event name to remove listeners for, or undefined for all
   * @returns This emitter for chaining
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
   * Get the number of listeners for an event.
   *
   * @param event - Event name to count listeners for
   * @returns Number of registered listeners
   */
  listenerCount<K extends keyof TEventMap>(event: K): number {
    if (event === '*') {
      return this.wildcardListeners.size;
    }
    return this.emitter.listenerCount(event as string);
  }

  /**
   * Set the maximum number of listeners before a warning is issued.
   *
   * @param n - Maximum number of listeners
   * @returns This emitter for chaining
   */
  setMaxListeners(n: number): this {
    this.emitter.setMaxListeners(n);
    return this;
  }
}

/**
 * Listener function type for ARI events with typed instance argument.
 *
 * This type provides proper typing for the second "convenience" argument
 * that is passed to listeners for ari-client compatibility. The argument
 * is an instance type (e.g., `ChannelInstance`) with methods, not just data.
 *
 * @typeParam K - The event type string
 *
 * @example
 * ```typescript
 * // For StasisStart, the listener receives (event, channel)
 * const listener: AriEventListener<'StasisStart'> = (event, channel) => {
 *   // event is StasisStartEvent
 *   // channel is ChannelInstance with methods like answer(), play(), etc.
 *   channel.answer();
 * };
 * ```
 */
export type AriEventListener<K extends AriEventType | '*'> = K extends '*'
  ? (event: AriEventMap['*']) => void | Promise<void>
  : K extends AriEventType
  ? EventInstanceArg<K> extends undefined
    ? (event: AriEventMap[K]) => void | Promise<void>
    : (event: AriEventMap[K], arg: EventInstanceArg<K>) => void | Promise<void>
  : never;

/**
 * ARI Event emitter with typed events and convenience arguments.
 *
 * This class is the base for `AriClient` and provides type-safe event
 * handling for all ARI events. It supports the ari-client style of
 * passing convenience arguments (channel, bridge, etc.) as a second
 * parameter to listeners.
 *
 * @example
 * ```typescript
 * const emitter = new AriEventEmitter();
 *
 * // The channel parameter is automatically typed
 * emitter.on('StasisStart', (event, channel) => {
 *   console.log(`Call from ${channel.caller.number}`);
 * });
 *
 * // Wildcard listener receives all events
 * emitter.on('*', (event) => {
 *   console.log(`Event: ${event.type}`);
 * });
 * ```
 */
export class AriEventEmitter {
  private emitter = new EventEmitter();
  private wildcardListeners: Set<GenericListener> = new Set();

  constructor() {
    this.emitter.setMaxListeners(100);
  }

  /**
   * Add a listener for a specific event type.
   *
   * The listener receives the event object and an optional convenience
   * argument (channel, bridge, playback, etc.) depending on the event type.
   *
   * @param event - Event type to listen for, or '*' for all events
   * @param listener - Callback function with typed parameters
   * @returns This emitter for chaining
   *
   * @example
   * ```typescript
   * // Channel events pass the channel as second argument
   * client.on('StasisStart', (event, channel) => {
   *   channel.answer();
   * });
   *
   * // Bridge events pass the bridge
   * client.on('BridgeCreated', (event, bridge) => {
   *   console.log(`Bridge ${bridge.id} created`);
   * });
   *
   * // Listen to all events
   * client.on('*', (event) => {
   *   console.log(event.type);
   * });
   * ```
   */
  on<K extends AriEventType | '*'>(
    event: K,
    listener: AriEventListener<K>
  ): this {
    if (event === '*') {
      this.wildcardListeners.add(listener as GenericListener);
    } else {
      this.emitter.on(event as string, listener);
    }
    return this;
  }

  /**
   * Add a one-time listener for a specific event type.
   *
   * The listener is automatically removed after being invoked once.
   *
   * @param event - Event type to listen for, or '*' for all events
   * @param listener - Callback function with typed parameters
   * @returns This emitter for chaining
   *
   * @example
   * ```typescript
   * // Wait for a single event
   * client.once('StasisStart', (event, channel) => {
   *   console.log('First call received!');
   * });
   * ```
   */
  once<K extends AriEventType | '*'>(
    event: K,
    listener: AriEventListener<K>
  ): this {
    if (event === '*') {
      const wrappedListener: GenericListener = (...args) => {
        this.wildcardListeners.delete(wrappedListener);
        (listener as GenericListener)(...args);
      };
      this.wildcardListeners.add(wrappedListener);
    } else {
      this.emitter.once(event as string, listener);
    }
    return this;
  }

  /**
   * Remove a listener for a specific event type.
   *
   * @param event - Event type the listener was registered for
   * @param listener - The listener function to remove
   * @returns This emitter for chaining
   */
  off<K extends AriEventType | '*'>(
    event: K,
    listener: AriEventListener<K>
  ): this {
    if (event === '*') {
      this.wildcardListeners.delete(listener as GenericListener);
    } else {
      this.emitter.off(event as string, listener);
    }
    return this;
  }

  /**
   * Emit an event to all registered listeners.
   *
   * @param event - Event type to emit
   * @param data - Event data to pass to listeners
   * @param convenienceArg - Optional convenience argument (channel, bridge, etc.)
   * @returns `true` if any listeners were invoked
   *
   * @internal
   */
  emit<K extends AriEventType>(event: K, data: AriEventMap[K], convenienceArg?: unknown): boolean {
    // Emit to specific listeners
    const hasListeners = convenienceArg !== undefined
      ? this.emitter.emit(event as string, data, convenienceArg)
      : this.emitter.emit(event as string, data);

    // Emit to wildcard listeners
    for (const listener of this.wildcardListeners) {
      try {
        listener(data);
      } catch (error) {
        console.error('Error in wildcard event listener:', error);
      }
    }

    return hasListeners || this.wildcardListeners.size > 0;
  }

  /**
   * Remove all listeners for a specific event or all events.
   *
   * @param event - Event type to remove listeners for, or undefined for all
   * @returns This emitter for chaining
   */
  removeAllListeners<K extends AriEventType | '*'>(event?: K): this {
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
   * Get the number of listeners for an event type.
   *
   * @param event - Event type to count listeners for
   * @returns Number of registered listeners
   */
  listenerCount<K extends AriEventType | '*'>(event: K): number {
    if (event === '*') {
      return this.wildcardListeners.size;
    }
    return this.emitter.listenerCount(event as string);
  }

  /**
   * Set the maximum number of listeners before a warning is issued.
   *
   * @param n - Maximum number of listeners (default: 100)
   * @returns This emitter for chaining
   */
  setMaxListeners(n: number): this {
    this.emitter.setMaxListeners(n);
    return this;
  }
}

/**
 * Event map for WebSocket connection events.
 *
 * Used internally by `ConnectionEventEmitter` to type connection-related events.
 */
export interface ConnectionEventMap {
  /** Emitted when the connection is established */
  connected: void;
  /** Emitted when the connection is closed */
  disconnected: { intentional: boolean; error?: Error };
  /** Emitted when attempting to reconnect */
  reconnecting: { attempt: number; delay: number };
  /** Emitted when reconnection succeeds */
  reconnected: void;
  /** Emitted when an error occurs */
  error: Error;
  /** Emitted when a message is received */
  message: unknown;
}

/**
 * Event emitter for WebSocket connection events.
 *
 * Used internally by the WebSocket manager to emit connection state events.
 *
 * @internal
 */
export class ConnectionEventEmitter extends TypedEventEmitter<ConnectionEventMap> {}
