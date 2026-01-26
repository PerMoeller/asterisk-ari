/**
 * Playback model and instance class
 */

import type { AriClient } from '../client.js';
import type { Playback, PlaybackState } from '../types/api.js';
import type { PlaybackOperation } from '../resources/playbacks.js';
import type {
  AriEventMap,
  PlaybackEventType,
  PlaybackStartedEvent,
  PlaybackContinuingEvent,
  PlaybackFinishedEvent,
} from '../events/types.js';

type PlaybackEventListener<E> = (event: E, playback: PlaybackInstance) => void | Promise<void>;

interface PlaybackEventListeners {
  PlaybackStarted: PlaybackEventListener<PlaybackStartedEvent>;
  PlaybackContinuing: PlaybackEventListener<PlaybackContinuingEvent>;
  PlaybackFinished: PlaybackEventListener<PlaybackFinishedEvent>;
}

/**
 * Playback instance with bound operations and event handling
 */
export class PlaybackInstance implements Playback {
  // Playback properties
  id: string;
  media_uri: string = '';
  next_media_uri?: string;
  target_uri: string = '';
  language: string = 'en';
  state: PlaybackState = 'queued';

  private readonly client: AriClient;
  private readonly listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  constructor(client: AriClient, id?: string, data?: Partial<Playback>) {
    this.client = client;
    this.id = id || crypto.randomUUID();

    if (data) {
      this.updateData(data);
    }

    // Register this instance for events
    this.client._registerPlaybackInstance(this.id, this);
  }

  /**
   * Update playback data from an event or API response
   */
  updateData(data: Partial<Playback>): void {
    if (data.id !== undefined) this.id = data.id;
    if (data.media_uri !== undefined) this.media_uri = data.media_uri;
    if (data.next_media_uri !== undefined) this.next_media_uri = data.next_media_uri;
    if (data.target_uri !== undefined) this.target_uri = data.target_uri;
    if (data.language !== undefined) this.language = data.language;
    if (data.state !== undefined) this.state = data.state;
  }

  /**
   * Add an event listener
   */
  on<K extends keyof PlaybackEventListeners>(
    event: K,
    listener: PlaybackEventListeners[K]
  ): this {
    let eventListeners = this.listeners.get(event);
    if (!eventListeners) {
      eventListeners = new Set();
      this.listeners.set(event, eventListeners);
    }
    eventListeners.add(listener as (...args: unknown[]) => void);
    return this;
  }

  /**
   * Add a one-time event listener
   */
  once<K extends keyof PlaybackEventListeners>(
    event: K,
    listener: PlaybackEventListeners[K]
  ): this {
    const wrappedListener = ((...args: unknown[]) => {
      this.off(event, wrappedListener as PlaybackEventListeners[K]);
      (listener as (...args: unknown[]) => void)(...args);
    }) as PlaybackEventListeners[K];

    return this.on(event, wrappedListener);
  }

  /**
   * Remove an event listener
   */
  off<K extends keyof PlaybackEventListeners>(
    event: K,
    listener: PlaybackEventListeners[K]
  ): this {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener as (...args: unknown[]) => void);
    }
    return this;
  }

  /**
   * Emit an event to listeners
   * @internal
   */
  _emit<K extends PlaybackEventType>(event: K, data: AriEventMap[K]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      for (const listener of eventListeners) {
        try {
          listener(data, this);
        } catch (error) {
          console.error(`Error in playback event listener for ${event}:`, error);
        }
      }
    }
  }

  /**
   * Remove all event listeners and unregister from client
   */
  removeAllListeners(): this {
    this.listeners.clear();
    this.client._unregisterPlaybackInstance(this.id);
    return this;
  }

  // ============================================================================
  // Bound Playback Operations
  // ============================================================================

  /**
   * Stop this playback
   */
  async stop(): Promise<void> {
    return this.client.playbacks.stop(this.id);
  }

  /**
   * Control this playback
   */
  async control(operation: PlaybackOperation): Promise<void> {
    return this.client.playbacks.control(this.id, operation);
  }

  /**
   * Pause this playback
   */
  async pause(): Promise<void> {
    return this.control('pause');
  }

  /**
   * Unpause this playback
   */
  async unpause(): Promise<void> {
    return this.control('unpause');
  }

  /**
   * Restart this playback
   */
  async restart(): Promise<void> {
    return this.control('restart');
  }

  /**
   * Skip forward in this playback
   */
  async forward(): Promise<void> {
    return this.control('forward');
  }

  /**
   * Skip backward in this playback
   */
  async reverse(): Promise<void> {
    return this.control('reverse');
  }
}
