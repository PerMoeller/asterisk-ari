/**
 * ARI Client - Main entry point for Asterisk REST Interface
 *
 * This module provides the main `AriClient` class and `connect()` function
 * for establishing connections to Asterisk ARI.
 *
 * @packageDocumentation
 *
 * @example
 * ```typescript
 * import { connect } from '@per_moeller/asterisk-ari';
 *
 * const client = await connect({
 *   url: 'http://localhost:8088',
 *   username: 'asterisk',
 *   password: 'secret',
 *   app: 'my-app'
 * });
 *
 * client.on('StasisStart', async (event, channel) => {
 *   console.log(`Incoming call from ${channel.caller.number}`);
 *   await channel.answer();
 *   await channel.play({ media: 'sound:hello-world' });
 * });
 * ```
 */

import { HttpConnection } from './connection.js';
import { WebSocketManager } from './websocket.js';
import { fetchAriVersion, VersionCompat } from './version.js';
import { AriEventEmitter } from './events/emitter.js';
import type { AriEvent, AriEventType, AriEventMap } from './events/types.js';
import type { ConnectOptions, ResolvedOptions } from './types/options.js';
import { resolveOptions } from './types/options.js';

// Resources
import { ChannelsResource } from './resources/channels.js';
import { BridgesResource } from './resources/bridges.js';
import { EndpointsResource } from './resources/endpoints.js';
import { ApplicationsResource } from './resources/applications.js';
import { AsteriskResource } from './resources/asterisk.js';
import { PlaybacksResource } from './resources/playbacks.js';
import { RecordingsResource } from './resources/recordings.js';
import { SoundsResource } from './resources/sounds.js';
import { MailboxesResource } from './resources/mailboxes.js';
import { DeviceStatesResource } from './resources/devicestates.js';

// Models
import { ChannelInstance } from './models/channel.js';
import { BridgeInstance } from './models/bridge.js';
import { PlaybackInstance } from './models/playback.js';
import { LiveRecordingInstance, StoredRecordingInstance } from './models/recording.js';

import type { Channel, Bridge, Playback, LiveRecording, CreateBridgeParams } from './types/api.js';

type EventListener<T> = (event: T) => void | Promise<void>;

/**
 * Main ARI Client for interacting with Asterisk.
 *
 * The client provides access to all ARI resources (channels, bridges, etc.)
 * and handles WebSocket events from Asterisk. It extends `AriEventEmitter`
 * for type-safe event handling.
 *
 * @remarks
 * Don't instantiate this class directly. Use the {@link connect} function instead.
 *
 * @example
 * ```typescript
 * const client = await connect({ ... });
 *
 * // Access API resources
 * const channels = await client.channels.list();
 * const bridge = await client.bridges.create({ type: 'mixing' });
 *
 * // Listen to events
 * client.on('StasisStart', (event, channel) => {
 *   // Handle incoming calls
 * });
 *
 * // Create model instances for event-based programming
 * const myChannel = client.Channel('channel-id');
 * myChannel.on('ChannelDtmfReceived', (event) => {
 *   console.log(`DTMF: ${event.digit}`);
 * });
 * ```
 */
export class AriClient extends AriEventEmitter {
  private readonly options: ResolvedOptions;
  private readonly http: HttpConnection;
  private readonly ws: WebSocketManager;
  private readonly versionCompat: VersionCompat;

  // Instance registries for event routing
  private readonly channelInstances: Map<string, ChannelInstance> = new Map();
  private readonly bridgeInstances: Map<string, BridgeInstance> = new Map();
  private readonly playbackInstances: Map<string, PlaybackInstance> = new Map();
  private readonly recordingInstances: Map<string, LiveRecordingInstance> = new Map();

  // ============================================================================
  // API Resources
  // ============================================================================

  /**
   * Channels API for managing calls and channels.
   *
   * @example
   * ```typescript
   * // List all channels
   * const channels = await client.channels.list();
   *
   * // Originate a call
   * const channel = await client.channels.originate({
   *   endpoint: 'PJSIP/1000',
   *   app: 'my-app'
   * });
   *
   * // Answer a channel
   * await client.channels.answer(channelId);
   * ```
   */
  public readonly channels: ChannelsResource;

  /**
   * Bridges API for managing bridges (conferences, etc.).
   *
   * @example
   * ```typescript
   * // Create a mixing bridge
   * const bridge = await client.bridges.create({ type: 'mixing' });
   *
   * // Add channels to bridge
   * await client.bridges.addChannel(bridge.id, { channel: [channel1, channel2] });
   * ```
   */
  public readonly bridges: BridgesResource;

  /**
   * Endpoints API for managing endpoints.
   *
   * @example
   * ```typescript
   * // List all endpoints
   * const endpoints = await client.endpoints.list();
   *
   * // Get PJSIP endpoints
   * const pjsipEndpoints = await client.endpoints.listByTech('PJSIP');
   * ```
   */
  public readonly endpoints: EndpointsResource;

  /**
   * Applications API for managing Stasis applications.
   *
   * @example
   * ```typescript
   * // Get application details
   * const app = await client.applications.get('my-app');
   *
   * // Subscribe to events
   * await client.applications.subscribe('my-app', { eventSource: 'channel:123' });
   * ```
   */
  public readonly applications: ApplicationsResource;

  /**
   * Asterisk API for system information and management.
   *
   * @example
   * ```typescript
   * // Get Asterisk info
   * const info = await client.asterisk.getInfo();
   * console.log(info.system?.version);
   *
   * // Get a global variable
   * const value = await client.asterisk.getVariable('GLOBALVAR');
   * ```
   */
  public readonly asterisk: AsteriskResource;

  /**
   * Playbacks API for controlling media playback.
   *
   * @example
   * ```typescript
   * // Control a playback
   * await client.playbacks.control(playbackId, 'pause');
   * await client.playbacks.control(playbackId, 'unpause');
   * await client.playbacks.stop(playbackId);
   * ```
   */
  public readonly playbacks: PlaybacksResource;

  /**
   * Recordings API for managing live and stored recordings.
   *
   * @example
   * ```typescript
   * // List stored recordings
   * const recordings = await client.recordings.listStored();
   *
   * // Get a stored recording
   * const recording = await client.recordings.getStored('my-recording');
   * ```
   */
  public readonly recordings: RecordingsResource;

  /**
   * Sounds API for listing available sound files.
   *
   * @example
   * ```typescript
   * // List all sounds
   * const sounds = await client.sounds.list();
   *
   * // Get sounds for a specific language
   * const englishSounds = await client.sounds.list({ lang: 'en' });
   * ```
   */
  public readonly sounds: SoundsResource;

  /**
   * Mailboxes API for managing voicemail mailboxes.
   *
   * @example
   * ```typescript
   * // List mailboxes
   * const mailboxes = await client.mailboxes.list();
   *
   * // Update message counts
   * await client.mailboxes.update('1000@default', {
   *   oldMessages: 5,
   *   newMessages: 2
   * });
   * ```
   */
  public readonly mailboxes: MailboxesResource;

  /**
   * Device States API for managing custom device states.
   *
   * @example
   * ```typescript
   * // Set a device state
   * await client.deviceStates.update('Stasis:mydevice', 'INUSE');
   *
   * // Get a device state
   * const state = await client.deviceStates.get('Stasis:mydevice');
   * ```
   */
  public readonly deviceStates: DeviceStatesResource;

  /**
   * Creates a new ARI client.
   *
   * @internal - Use the {@link connect} function instead of instantiating directly.
   *
   * @param options - Resolved connection options
   * @param http - HTTP connection instance
   * @param ws - WebSocket manager instance
   * @param versionCompat - Version compatibility checker
   */
  constructor(
    options: ResolvedOptions,
    http: HttpConnection,
    ws: WebSocketManager,
    versionCompat: VersionCompat
  ) {
    super();
    this.options = options;
    this.http = http;
    this.ws = ws;
    this.versionCompat = versionCompat;

    // Initialize API resources
    this.channels = new ChannelsResource(this, http, versionCompat);
    this.bridges = new BridgesResource(this, http, versionCompat);
    this.endpoints = new EndpointsResource(this, http, versionCompat);
    this.applications = new ApplicationsResource(this, http, versionCompat);
    this.asterisk = new AsteriskResource(this, http, versionCompat);
    this.playbacks = new PlaybacksResource(this, http, versionCompat);
    this.recordings = new RecordingsResource(this, http, versionCompat);
    this.sounds = new SoundsResource(this, http, versionCompat);
    this.mailboxes = new MailboxesResource(this, http, versionCompat);
    this.deviceStates = new DeviceStatesResource(this, http, versionCompat);

    // Set up WebSocket event handling
    this.setupWebSocketEvents();
  }

  /**
   * Set up WebSocket event handlers
   * @internal
   */
  private setupWebSocketEvents(): void {
    this.ws.on('message', (data) => {
      const event = data as AriEvent;
      this.handleEvent(event);
    });

    this.ws.on('reconnecting', (info) => {
      console.log(`ARI reconnecting (attempt ${info.attempt}, delay ${info.delay}ms)`);
    });

    this.ws.on('reconnected', () => {
      console.log('ARI reconnected');
    });

    this.ws.on('error', (error) => {
      console.error('ARI WebSocket error:', error);
    });
  }

  /**
   * Handle an incoming ARI event
   * @internal
   */
  private handleEvent(event: AriEvent): void {
    // Emit to global listeners with convenience argument (ari-client compatibility)
    const convenienceArg = this.getConvenienceArg(event);
    this.emit(event.type as AriEventType, event as AriEventMap[AriEventType], convenienceArg);

    // Route to specific instances based on event type
    this.routeEventToInstances(event);
  }

  /**
   * Extract convenience instance argument from event for ari-client style callbacks.
   * Returns instance types (ChannelInstance, BridgeInstance, etc.) with methods.
   * @internal
   */
  private getConvenienceArg(event: AriEvent): unknown {
    if ('channel' in event && event.channel) {
      // Return a ChannelInstance with the channel data
      return this.Channel(event.channel.id, event.channel);
    }
    if ('bridge' in event && event.bridge) {
      // Return a BridgeInstance with the bridge data
      return this._getBridgeInstance(event.bridge.id, event.bridge);
    }
    if ('playback' in event && event.playback) {
      // Return a PlaybackInstance with the playback data
      return this.Playback(event.playback.id, event.playback);
    }
    if ('recording' in event && event.recording) {
      // Return a LiveRecordingInstance with the recording data
      return this.LiveRecording(event.recording.name, event.recording);
    }
    if ('endpoint' in event && event.endpoint) {
      // Endpoints don't have an instance class yet, return raw data
      return event.endpoint;
    }
    // Special case for Dial event - return peer channel as instance
    if (event.type === 'Dial' && 'peer' in event) {
      return this.Channel(event.peer.id, event.peer);
    }
    return undefined;
  }

  /**
   * Route event to appropriate instance listeners
   * @internal
   */
  private routeEventToInstances(event: AriEvent): void {
    // Channel events
    if ('channel' in event && event.channel) {
      const channelId = event.channel.id;
      const instance = this.channelInstances.get(channelId);
      if (instance) {
        instance.updateData(event.channel);
        instance._emit(event.type as Parameters<typeof instance._emit>[0], event as never);
      }
    }

    // Bridge events
    if ('bridge' in event && event.bridge) {
      const bridgeId = event.bridge.id;
      const instance = this.bridgeInstances.get(bridgeId);
      if (instance) {
        instance.updateData(event.bridge);
        instance._emit(event.type as Parameters<typeof instance._emit>[0], event as never);
      }
    }

    // Playback events
    if ('playback' in event && event.playback) {
      const playbackId = event.playback.id;
      const instance = this.playbackInstances.get(playbackId);
      if (instance) {
        instance.updateData(event.playback);
        instance._emit(event.type as Parameters<typeof instance._emit>[0], event as never);
      }
    }

    // Recording events
    if ('recording' in event && event.recording) {
      const recordingName = event.recording.name;
      const instance = this.recordingInstances.get(recordingName);
      if (instance) {
        instance.updateData(event.recording);
        instance._emit(event.type as Parameters<typeof instance._emit>[0], event as never);
      }
    }
  }

  // ============================================================================
  // Instance Factory Methods
  // ============================================================================

  /**
   * Create a new Channel instance for originating calls.
   *
   * Use this to create a new channel that will be originated. For loading
   * an existing channel from Asterisk, use `client.channels.get(id)` instead.
   *
   * @param id - Channel ID (auto-generated if not provided)
   * @param data - Initial channel data (typically from events)
   * @returns Channel instance for event handling and operations
   *
   * @example
   * ```typescript
   * // Create a new channel for originating
   * const channel = client.Channel();
   * channel.on('StasisStart', async () => {
   *   await channel.answer();
   * });
   * await channel.originate({ endpoint: 'PJSIP/1000', app: 'my-app' });
   *
   * // Load an existing channel (use channels.get instead)
   * const existing = await client.channels.get('channel-id');
   * ```
   */
  Channel(id?: string, data?: Partial<Channel>): ChannelInstance {
    const existingId = id || data?.id;
    if (existingId) {
      const existing = this.channelInstances.get(existingId);
      if (existing) {
        if (data) existing.updateData(data);
        return existing;
      }
    }
    return new ChannelInstance(this, id, data);
  }

  /**
   * Create a new bridge on Asterisk.
   *
   * This creates a bridge on Asterisk and returns an instance with methods
   * and event handling. For loading an existing bridge, use `client.bridges.get(id)`.
   *
   * @param params - Bridge creation parameters (type, name, bridgeId)
   * @returns Bridge instance for event handling and operations
   *
   * @example
   * ```typescript
   * // Create a mixing bridge
   * const bridge = await client.Bridge({ type: 'mixing' });
   * bridge.on('ChannelEnteredBridge', (event) => {
   *   console.log(`${event.channel.name} joined`);
   * });
   *
   * // Create with specific ID and name
   * const namedBridge = await client.Bridge({
   *   bridgeId: 'my-bridge',
   *   type: 'holding',
   *   name: 'Hold Music Bridge'
   * });
   *
   * // Load an existing bridge (use bridges.get instead)
   * const existing = await client.bridges.get('bridge-id');
   * ```
   */
  async Bridge(params?: CreateBridgeParams): Promise<BridgeInstance> {
    const id = params?.bridgeId || crypto.randomUUID();
    const instance = this._getBridgeInstance(id);
    const result = await this.bridges.createOrUpdate(id, params);
    instance.updateData(result);
    return instance;
  }

  /**
   * Get or create a BridgeInstance for internal use (event routing, API responses).
   * @internal
   */
  _getBridgeInstance(id?: string, data?: Partial<Bridge>): BridgeInstance {
    const existingId = id || data?.id;
    if (existingId) {
      const existing = this.bridgeInstances.get(existingId);
      if (existing) {
        if (data) existing.updateData(data);
        return existing;
      }
    }
    return new BridgeInstance(this, id, data);
  }

  /**
   * Create a new Playback instance.
   *
   * Use this to create a playback instance before starting playback.
   * For loading an existing playback from Asterisk, use `client.playbacks.get(id)` instead.
   *
   * @param id - Playback ID (auto-generated if not provided)
   * @param data - Initial playback data (typically from events)
   * @returns Playback instance for event handling and operations
   *
   * @example
   * ```typescript
   * // Create a new playback
   * const playback = client.Playback();
   * playback.on('PlaybackFinished', () => console.log('Done'));
   * await channel.play({ media: 'sound:hello', playbackId: playback.id });
   *
   * // Load an existing playback (use playbacks.get instead)
   * const existing = await client.playbacks.get('playback-id');
   * ```
   */
  Playback(id?: string, data?: Partial<Playback>): PlaybackInstance {
    const existingId = id || data?.id;
    if (existingId) {
      const existing = this.playbackInstances.get(existingId);
      if (existing) {
        if (data) existing.updateData(data);
        return existing;
      }
    }
    return new PlaybackInstance(this, id, data);
  }

  /**
   * Create or retrieve a LiveRecording instance.
   *
   * LiveRecording instances provide event-based programming for active recordings.
   *
   * @param name - Recording name
   * @param data - Initial recording data
   * @returns LiveRecording instance for event handling and operations
   *
   * @example
   * ```typescript
   * const recording = client.LiveRecording('my-recording');
   *
   * recording.on('RecordingFinished', (event) => {
   *   console.log(`Recording saved: ${event.recording.name}`);
   * });
   *
   * await channel.record({ name: 'my-recording', format: 'wav' });
   * ```
   */
  LiveRecording(name: string, data?: Partial<LiveRecording>): LiveRecordingInstance {
    const existing = this.recordingInstances.get(name);
    if (existing) {
      if (data) existing.updateData(data);
      return existing;
    }
    return new LiveRecordingInstance(this, name, data);
  }

  /**
   * Create a StoredRecording instance.
   *
   * StoredRecording instances provide convenience methods for working with
   * recordings that are already saved to disk. Unlike LiveRecording, these
   * don't receive events.
   *
   * @param name - Recording name
   * @returns StoredRecording instance for operations
   *
   * @example
   * ```typescript
   * const stored = client.StoredRecording('my-recording');
   *
   * // Copy the recording
   * await stored.copy('my-recording-backup');
   *
   * // Delete the recording
   * await stored.delete();
   * ```
   */
  StoredRecording(name: string): StoredRecordingInstance {
    return new StoredRecordingInstance(this, name);
  }

  // ============================================================================
  // Instance Registration (internal use by model instances)
  // ============================================================================

  /** @internal Register a channel instance for event routing */
  _registerChannelInstance(id: string, instance: ChannelInstance): void {
    this.channelInstances.set(id, instance);
  }

  /** @internal Unregister a channel instance */
  _unregisterChannelInstance(id: string): void {
    this.channelInstances.delete(id);
  }

  /** @internal Register a bridge instance for event routing */
  _registerBridgeInstance(id: string, instance: BridgeInstance): void {
    this.bridgeInstances.set(id, instance);
  }

  /** @internal Unregister a bridge instance */
  _unregisterBridgeInstance(id: string): void {
    this.bridgeInstances.delete(id);
  }

  /** @internal Register a playback instance for event routing */
  _registerPlaybackInstance(id: string, instance: PlaybackInstance): void {
    this.playbackInstances.set(id, instance);
  }

  /** @internal Unregister a playback instance */
  _unregisterPlaybackInstance(id: string): void {
    this.playbackInstances.delete(id);
  }

  /** @internal Register a recording instance for event routing */
  _registerRecordingInstance(name: string, instance: LiveRecordingInstance): void {
    this.recordingInstances.set(name, instance);
  }

  /** @internal Unregister a recording instance */
  _unregisterRecordingInstance(name: string): void {
    this.recordingInstances.delete(name);
  }

  // ============================================================================
  // Connection State
  // ============================================================================

  /**
   * Get the detected ARI/Asterisk version compatibility checker.
   *
   * @returns Version compatibility object with feature flags
   *
   * @example
   * ```typescript
   * console.log(client.version.toString());
   * // "Asterisk 20 (ARI 8.0.0)"
   *
   * if (client.version.hasExternalMedia) {
   *   // Use external media feature
   * }
   * ```
   */
  get version(): VersionCompat {
    return this.versionCompat;
  }

  /**
   * Check if the WebSocket connection is active.
   *
   * @returns `true` if connected, `false` otherwise
   */
  isConnected(): boolean {
    return this.ws.isConnected();
  }

  /**
   * Stop the client and disconnect from Asterisk.
   *
   * This closes the WebSocket connection and clears all instance registries.
   * The client cannot be reused after calling stop().
   *
   * @example
   * ```typescript
   * // Graceful shutdown
   * process.on('SIGTERM', () => {
   *   client.stop();
   *   process.exit(0);
   * });
   * ```
   */
  stop(): void {
    this.ws.disconnect();
    this.channelInstances.clear();
    this.bridgeInstances.clear();
    this.playbackInstances.clear();
    this.recordingInstances.clear();
  }

  /**
   * Reconnect the WebSocket connection.
   *
   * Disconnects and then reconnects to Asterisk. Instance registries
   * are preserved, so events will continue routing correctly.
   *
   * @returns Promise that resolves when reconnected
   */
  async reconnect(): Promise<void> {
    this.ws.disconnect();
    await this.ws.connect();
  }

  /**
   * Get the Stasis application name.
   *
   * @returns Application name used for this connection
   */
  get app(): string {
    return this.options.app;
  }
}

/**
 * Connect to Asterisk ARI and create a client.
 *
 * This is the main entry point for establishing an ARI connection.
 * It performs version detection and sets up the WebSocket connection.
 *
 * @param options - Connection options
 * @returns Promise that resolves to an ARI client
 * @throws {AriHttpError} If connection fails or authentication is invalid
 *
 * @example
 * ```typescript
 * import { connect } from '@per_moeller/asterisk-ari';
 *
 * const client = await connect({
 *   url: 'http://localhost:8088',
 *   username: 'asterisk',
 *   password: 'secret',
 *   app: 'my-app'
 * });
 *
 * console.log(`Connected to ${client.version}`);
 *
 * client.on('StasisStart', async (event, channel) => {
 *   await channel.answer();
 * });
 * ```
 */
export async function connect(options: ConnectOptions): Promise<AriClient> {
  const resolved = resolveOptions(options);

  // Create HTTP connection
  const http = new HttpConnection(resolved);

  // Fetch and parse ARI version
  const ariVersion = await fetchAriVersion(http);
  const versionCompat = new VersionCompat(ariVersion);

  console.log(`Connecting to ${versionCompat}`);

  // Create and connect WebSocket
  const ws = new WebSocketManager(resolved);
  await ws.connect();

  // Create and return client
  return new AriClient(resolved, http, ws, versionCompat);
}
