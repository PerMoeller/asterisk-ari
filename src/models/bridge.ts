/**
 * Bridge model and instance class
 */

import type { AriClient } from '../client.js';
import type {
  Bridge,
  BridgeType,
  CreateBridgeParams,
  AddChannelParams,
  RemoveChannelParams,
  PlayBridgeParams,
  RecordBridgeParams,
} from '../types/api.js';
import type {
  AriEventMap,
  BridgeEventType,
  BridgeCreatedEvent,
  BridgeDestroyedEvent,
  BridgeMergedEvent,
  BridgeVideoSourceChangedEvent,
  ChannelEnteredBridgeEvent,
  ChannelLeftBridgeEvent,
} from '../events/types.js';
import type { PlaybackInstance } from './playback.js';
import type { LiveRecordingInstance } from './recording.js';

/**
 * Type for bridge event listener functions.
 * The listener receives the event data and the bridge instance.
 * @template E - The event type
 */
export type BridgeEventListener<E> = (event: E, bridge: BridgeInstance) => void | Promise<void>;

/**
 * Interface defining all bridge event listeners with their typed signatures.
 * Use this to type your listener functions when working with bridge events.
 *
 * @example
 * ```typescript
 * import type { BridgeEventListeners } from '@per_moeller/asterisk-ari';
 *
 * const enteredHandler: BridgeEventListeners['ChannelEnteredBridge'] = (event, bridge) => {
 *   console.log(`Channel ${event.channel.id} entered bridge ${bridge.id}`);
 * };
 * ```
 */
export interface BridgeEventListeners {
  /** Fired when a bridge is created */
  BridgeCreated: BridgeEventListener<BridgeCreatedEvent>;
  /** Fired when a bridge is destroyed */
  BridgeDestroyed: BridgeEventListener<BridgeDestroyedEvent>;
  /** Fired when two bridges are merged */
  BridgeMerged: BridgeEventListener<BridgeMergedEvent>;
  /** Fired when the video source for a bridge changes */
  BridgeVideoSourceChanged: BridgeEventListener<BridgeVideoSourceChangedEvent>;
  /** Fired when a channel enters the bridge */
  ChannelEnteredBridge: BridgeEventListener<ChannelEnteredBridgeEvent>;
  /** Fired when a channel leaves the bridge */
  ChannelLeftBridge: BridgeEventListener<ChannelLeftBridgeEvent>;
}

/**
 * Bridge instance with bound operations and event handling
 */
export class BridgeInstance implements Bridge {
  // Bridge properties
  id: string;
  technology: string = '';
  bridge_type: BridgeType = 'mixing';
  bridge_class: string = 'base';
  creator: string = '';
  name: string = '';
  channels: string[] = [];
  video_mode?: 'none' | 'talker' | 'single';
  video_source_id?: string;
  creationtime: string = '';

  private readonly client: AriClient;
  private readonly listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  constructor(client: AriClient, id?: string, data?: Partial<Bridge>) {
    this.client = client;
    this.id = id || crypto.randomUUID();

    if (data) {
      this.updateData(data);
    }

    // Register this instance for events
    this.client._registerBridgeInstance(this.id, this);
  }

  /**
   * Update bridge data from an event or API response
   */
  updateData(data: Partial<Bridge>): void {
    if (data.id !== undefined) this.id = data.id;
    if (data.technology !== undefined) this.technology = data.technology;
    if (data.bridge_type !== undefined) this.bridge_type = data.bridge_type;
    if (data.bridge_class !== undefined) this.bridge_class = data.bridge_class;
    if (data.creator !== undefined) this.creator = data.creator;
    if (data.name !== undefined) this.name = data.name;
    if (data.channels !== undefined) this.channels = data.channels;
    if (data.video_mode !== undefined) this.video_mode = data.video_mode;
    if (data.video_source_id !== undefined) this.video_source_id = data.video_source_id;
    if (data.creationtime !== undefined) this.creationtime = data.creationtime;
  }

  /**
   * Add an event listener
   */
  on<K extends keyof BridgeEventListeners>(
    event: K,
    listener: BridgeEventListeners[K]
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
  once<K extends keyof BridgeEventListeners>(
    event: K,
    listener: BridgeEventListeners[K]
  ): this {
    const wrappedListener = ((...args: unknown[]) => {
      this.off(event, wrappedListener as BridgeEventListeners[K]);
      (listener as (...args: unknown[]) => void)(...args);
    }) as BridgeEventListeners[K];

    return this.on(event, wrappedListener);
  }

  /**
   * Remove an event listener
   */
  off<K extends keyof BridgeEventListeners>(
    event: K,
    listener: BridgeEventListeners[K]
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
  _emit<K extends BridgeEventType>(event: K, data: AriEventMap[K]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      for (const listener of eventListeners) {
        try {
          listener(data, this);
        } catch (error) {
          console.error(`Error in bridge event listener for ${event}:`, error);
        }
      }
    }
  }

  /**
   * Remove all event listeners and unregister from client
   */
  removeAllListeners(): this {
    this.listeners.clear();
    this.client._unregisterBridgeInstance(this.id);
    return this;
  }

  // ============================================================================
  // Bound Bridge Operations
  // ============================================================================

  /**
   * Create this bridge
   * @throws {AriHttpError} If the ARI request fails
   */
  async create(params?: Omit<CreateBridgeParams, 'bridgeId'>): Promise<void> {
    const result = await this.client.bridges.createOrUpdate(this.id, params);
    this.updateData(result);
  }

  /**
   * Destroy this bridge
   * @throws {AriHttpError} If the ARI request fails
   */
  async destroy(): Promise<void> {
    return this.client.bridges.destroy(this.id);
  }

  /**
   * Add channel(s) to this bridge
   * @throws {AriHttpError} If the ARI request fails
   */
  async addChannel(params: AddChannelParams): Promise<void> {
    return this.client.bridges.addChannel(this.id, params);
  }

  /**
   * Remove channel(s) from this bridge
   * @throws {AriHttpError} If the ARI request fails
   */
  async removeChannel(params: RemoveChannelParams): Promise<void> {
    return this.client.bridges.removeChannel(this.id, params);
  }

  /**
   * Set the video source for this bridge
   * @throws {AriHttpError} If the ARI request fails
   */
  async setVideoSource(channelId: string): Promise<void> {
    return this.client.bridges.setVideoSource(this.id, channelId);
  }

  /**
   * Clear the video source for this bridge
   * @throws {AriHttpError} If the ARI request fails
   */
  async clearVideoSource(): Promise<void> {
    return this.client.bridges.clearVideoSource(this.id);
  }

  /**
   * Start music on hold for this bridge
   * @throws {AriHttpError} If the ARI request fails
   */
  async startMoh(mohClass?: string): Promise<void> {
    return this.client.bridges.startMoh(this.id, mohClass);
  }

  /**
   * Stop music on hold for this bridge
   * @throws {AriHttpError} If the ARI request fails
   */
  async stopMoh(): Promise<void> {
    return this.client.bridges.stopMoh(this.id);
  }

  /**
   * Play media to this bridge
   * @throws {AriHttpError} If the ARI request fails
   */
  async play(params: PlayBridgeParams): Promise<PlaybackInstance> {
    // Create playback instance first to register for events
    const playback = this.client.Playback(params.playbackId);
    await this.client.bridges.play(this.id, {
      ...params,
      playbackId: playback.id,
    });
    return playback;
  }

  /**
   * Record audio from this bridge
   * @throws {AriHttpError} If the ARI request fails
   */
  async record(params: RecordBridgeParams): Promise<LiveRecordingInstance> {
    // Create recording instance first to register for events
    const recording = this.client.LiveRecording(params.name);
    await this.client.bridges.record(this.id, params);
    return recording;
  }
}
