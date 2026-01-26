/**
 * ARI Client - Main entry point for Asterisk REST Interface
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

import type { Channel, Bridge, Playback, LiveRecording } from './types/api.js';

type EventListener<T> = (event: T) => void | Promise<void>;

/**
 * ARI Client for interacting with Asterisk
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

  // API Resources
  public readonly channels: ChannelsResource;
  public readonly bridges: BridgesResource;
  public readonly endpoints: EndpointsResource;
  public readonly applications: ApplicationsResource;
  public readonly asterisk: AsteriskResource;
  public readonly playbacks: PlaybacksResource;
  public readonly recordings: RecordingsResource;
  public readonly sounds: SoundsResource;
  public readonly mailboxes: MailboxesResource;
  public readonly deviceStates: DeviceStatesResource;

  /**
   * @internal - Use connect() function instead
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
    this.channels = new ChannelsResource(http, versionCompat);
    this.bridges = new BridgesResource(http, versionCompat);
    this.endpoints = new EndpointsResource(http, versionCompat);
    this.applications = new ApplicationsResource(http, versionCompat);
    this.asterisk = new AsteriskResource(http, versionCompat);
    this.playbacks = new PlaybacksResource(http, versionCompat);
    this.recordings = new RecordingsResource(http, versionCompat);
    this.sounds = new SoundsResource(http, versionCompat);
    this.mailboxes = new MailboxesResource(http, versionCompat);
    this.deviceStates = new DeviceStatesResource(http, versionCompat);

    // Set up WebSocket event handling
    this.setupWebSocketEvents();
  }

  /**
   * Set up WebSocket event handlers
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
   */
  private handleEvent(event: AriEvent): void {
    // Emit to global listeners
    this.emit(event.type as AriEventType, event as AriEventMap[AriEventType]);

    // Route to specific instances based on event type
    this.routeEventToInstances(event);
  }

  /**
   * Route event to appropriate instance listeners
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
  // Instance Factory Methods (like ari-client)
  // ============================================================================

  /**
   * Create a Channel instance
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
   * Create a Bridge instance
   */
  Bridge(id?: string, data?: Partial<Bridge>): BridgeInstance {
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
   * Create a Playback instance
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
   * Create a LiveRecording instance
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
   * Create a StoredRecording instance (no events, just convenience methods)
   */
  StoredRecording(name: string): StoredRecordingInstance {
    return new StoredRecordingInstance(this, name);
  }

  // ============================================================================
  // Instance Registration (internal use by model instances)
  // ============================================================================

  /** @internal */
  _registerChannelInstance(id: string, instance: ChannelInstance): void {
    this.channelInstances.set(id, instance);
  }

  /** @internal */
  _unregisterChannelInstance(id: string): void {
    this.channelInstances.delete(id);
  }

  /** @internal */
  _registerBridgeInstance(id: string, instance: BridgeInstance): void {
    this.bridgeInstances.set(id, instance);
  }

  /** @internal */
  _unregisterBridgeInstance(id: string): void {
    this.bridgeInstances.delete(id);
  }

  /** @internal */
  _registerPlaybackInstance(id: string, instance: PlaybackInstance): void {
    this.playbackInstances.set(id, instance);
  }

  /** @internal */
  _unregisterPlaybackInstance(id: string): void {
    this.playbackInstances.delete(id);
  }

  /** @internal */
  _registerRecordingInstance(name: string, instance: LiveRecordingInstance): void {
    this.recordingInstances.set(name, instance);
  }

  /** @internal */
  _unregisterRecordingInstance(name: string): void {
    this.recordingInstances.delete(name);
  }

  // ============================================================================
  // Connection State
  // ============================================================================

  /**
   * Get the detected ARI/Asterisk version
   */
  get version(): VersionCompat {
    return this.versionCompat;
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws.isConnected();
  }

  /**
   * Stop the client and disconnect
   */
  stop(): void {
    this.ws.disconnect();
    this.channelInstances.clear();
    this.bridgeInstances.clear();
    this.playbackInstances.clear();
    this.recordingInstances.clear();
  }

  /**
   * Reconnect the WebSocket
   */
  async reconnect(): Promise<void> {
    this.ws.disconnect();
    await this.ws.connect();
  }

  /**
   * Get the application name
   */
  get app(): string {
    return this.options.app;
  }
}

/**
 * Connect to Asterisk ARI
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
