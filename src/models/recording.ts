/**
 * Recording model and instance classes
 */

import type { AriClient } from '../client.js';
import type { LiveRecording, RecordingState, StoredRecording } from '../types/api.js';
import type {
  AriEventMap,
  RecordingEventType,
  RecordingStartedEvent,
  RecordingFinishedEvent,
  RecordingFailedEvent,
} from '../events/types.js';

type RecordingEventListener<E> = (event: E, recording: LiveRecordingInstance) => void | Promise<void>;

interface RecordingEventListeners {
  RecordingStarted: RecordingEventListener<RecordingStartedEvent>;
  RecordingFinished: RecordingEventListener<RecordingFinishedEvent>;
  RecordingFailed: RecordingEventListener<RecordingFailedEvent>;
}

/**
 * Live recording instance with bound operations and event handling
 */
export class LiveRecordingInstance implements LiveRecording {
  // Recording properties
  name: string;
  format: string = '';
  state: RecordingState = 'queued';
  target_uri: string = '';
  duration?: number;
  talking_duration?: number;
  silence_duration?: number;
  cause?: string;

  private readonly client: AriClient;
  private readonly listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  constructor(client: AriClient, name: string, data?: Partial<LiveRecording>) {
    this.client = client;
    this.name = name;

    if (data) {
      this.updateData(data);
    }

    // Register this instance for events
    this.client._registerRecordingInstance(this.name, this);
  }

  /**
   * Update recording data from an event or API response
   */
  updateData(data: Partial<LiveRecording>): void {
    if (data.name !== undefined) this.name = data.name;
    if (data.format !== undefined) this.format = data.format;
    if (data.state !== undefined) this.state = data.state;
    if (data.target_uri !== undefined) this.target_uri = data.target_uri;
    if (data.duration !== undefined) this.duration = data.duration;
    if (data.talking_duration !== undefined) this.talking_duration = data.talking_duration;
    if (data.silence_duration !== undefined) this.silence_duration = data.silence_duration;
    if (data.cause !== undefined) this.cause = data.cause;
  }

  /**
   * Add an event listener
   */
  on<K extends keyof RecordingEventListeners>(
    event: K,
    listener: RecordingEventListeners[K]
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
  once<K extends keyof RecordingEventListeners>(
    event: K,
    listener: RecordingEventListeners[K]
  ): this {
    const wrappedListener = ((...args: unknown[]) => {
      this.off(event, wrappedListener as RecordingEventListeners[K]);
      (listener as (...args: unknown[]) => void)(...args);
    }) as RecordingEventListeners[K];

    return this.on(event, wrappedListener);
  }

  /**
   * Remove an event listener
   */
  off<K extends keyof RecordingEventListeners>(
    event: K,
    listener: RecordingEventListeners[K]
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
  _emit<K extends RecordingEventType>(event: K, data: AriEventMap[K]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      for (const listener of eventListeners) {
        try {
          listener(data, this);
        } catch (error) {
          console.error(`Error in recording event listener for ${event}:`, error);
        }
      }
    }
  }

  /**
   * Remove all event listeners and unregister from client
   */
  removeAllListeners(): this {
    this.listeners.clear();
    this.client._unregisterRecordingInstance(this.name);
    return this;
  }

  // ============================================================================
  // Bound Recording Operations
  // ============================================================================

  /**
   * Stop and store this recording
   */
  async stop(): Promise<void> {
    return this.client.recordings.live.stop(this.name);
  }

  /**
   * Pause this recording
   */
  async pause(): Promise<void> {
    return this.client.recordings.live.pause(this.name);
  }

  /**
   * Unpause this recording
   */
  async unpause(): Promise<void> {
    return this.client.recordings.live.unpause(this.name);
  }

  /**
   * Mute this recording
   */
  async mute(): Promise<void> {
    return this.client.recordings.live.mute(this.name);
  }

  /**
   * Unmute this recording
   */
  async unmute(): Promise<void> {
    return this.client.recordings.live.unmute(this.name);
  }

  /**
   * Cancel and discard this recording
   */
  async cancel(): Promise<void> {
    return this.client.recordings.live.cancel(this.name);
  }
}

/**
 * Stored recording instance with bound operations
 */
export class StoredRecordingInstance implements StoredRecording {
  name: string;
  format: string = '';

  private readonly client: AriClient;

  constructor(client: AriClient, name: string, data?: Partial<StoredRecording>) {
    this.client = client;
    this.name = name;

    if (data) {
      this.updateData(data);
    }
  }

  /**
   * Update recording data
   */
  updateData(data: Partial<StoredRecording>): void {
    if (data.name !== undefined) this.name = data.name;
    if (data.format !== undefined) this.format = data.format;
  }

  /**
   * Get the file for this recording
   */
  async getFile(): Promise<ArrayBuffer> {
    return this.client.recordings.stored.getFile(this.name);
  }

  /**
   * Copy this recording
   */
  async copy(destinationRecordingName: string): Promise<StoredRecordingInstance> {
    const result = await this.client.recordings.stored.copy(this.name, {
      destinationRecordingName,
    });
    return new StoredRecordingInstance(this.client, result.name, result);
  }

  /**
   * Delete this recording
   */
  async delete(): Promise<void> {
    return this.client.recordings.stored.delete(this.name);
  }
}
