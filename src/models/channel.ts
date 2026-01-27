/**
 * Channel model and instance class
 *
 * This module provides the `ChannelInstance` class which wraps channel data
 * and provides event handling and convenience methods for channel operations.
 *
 * @packageDocumentation
 */

import type { AriClient } from '../client.js';
import type {
  Channel,
  ChannelState,
  CallerId,
  DialplanCEP,
  OriginateParams,
  HangupParams,
  ContinueParams,
  MoveParams,
  DTMFParams,
  PlayParams,
  RecordParams,
  SnoopParams,
  DialParams,
  RTPstat,
} from '../types/api.js';
import type {
  AriEventMap,
  ChannelEventType,
  StasisStartEvent,
  StasisEndEvent,
  ChannelDtmfReceivedEvent,
  ChannelStateChangeEvent,
  ChannelHangupRequestEvent,
  ChannelVarsetEvent,
  ChannelHoldEvent,
  ChannelUnholdEvent,
  ChannelTalkingStartedEvent,
  ChannelTalkingFinishedEvent,
  ChannelEnteredBridgeEvent,
  ChannelLeftBridgeEvent,
  DialEvent,
} from '../events/types.js';
import type { PlaybackInstance } from './playback.js';
import type { LiveRecordingInstance } from './recording.js';

/**
 * Event listener type for channel events.
 * @internal
 */
type ChannelEventListener<E> = (event: E, channel: ChannelInstance) => void | Promise<void>;

/**
 * Map of channel event types to their listener signatures.
 * @internal
 */
interface ChannelEventListeners {
  StasisStart: ChannelEventListener<StasisStartEvent>;
  StasisEnd: ChannelEventListener<StasisEndEvent>;
  ChannelStateChange: ChannelEventListener<ChannelStateChangeEvent>;
  ChannelDtmfReceived: ChannelEventListener<ChannelDtmfReceivedEvent>;
  ChannelHangupRequest: ChannelEventListener<ChannelHangupRequestEvent>;
  ChannelVarset: ChannelEventListener<ChannelVarsetEvent>;
  ChannelHold: ChannelEventListener<ChannelHoldEvent>;
  ChannelUnhold: ChannelEventListener<ChannelUnholdEvent>;
  ChannelTalkingStarted: ChannelEventListener<ChannelTalkingStartedEvent>;
  ChannelTalkingFinished: ChannelEventListener<ChannelTalkingFinishedEvent>;
  ChannelEnteredBridge: ChannelEventListener<ChannelEnteredBridgeEvent>;
  ChannelLeftBridge: ChannelEventListener<ChannelLeftBridgeEvent>;
  Dial: ChannelEventListener<DialEvent>;
}

/**
 * Channel instance with bound operations and event handling.
 *
 * A `ChannelInstance` wraps a channel and provides:
 * - Event listeners scoped to this specific channel
 * - Convenience methods that automatically use this channel's ID
 * - Automatic data updates when events are received
 *
 * The instance implements the `Channel` interface, so you can access
 * all channel properties directly.
 *
 * @remarks
 * Create instances using `client.Channel()` rather than instantiating directly.
 * This ensures proper registration for event routing.
 *
 * @example
 * ```typescript
 * // Create from an event
 * client.on('StasisStart', (event, channelData) => {
 *   const channel = client.Channel(channelData.id, channelData);
 *
 *   // Listen for events on this specific channel
 *   channel.on('ChannelDtmfReceived', (event) => {
 *     console.log(`Received: ${event.digit}`);
 *   });
 *
 *   channel.on('StasisEnd', () => {
 *     console.log('Call ended');
 *     channel.removeAllListeners();
 *   });
 *
 *   // Perform operations
 *   await channel.answer();
 *   await channel.play({ media: 'sound:hello-world' });
 * });
 * ```
 */
export class ChannelInstance implements Channel {
  // ============================================================================
  // Channel Properties (from Channel interface)
  // ============================================================================

  /** Unique identifier for this channel */
  id: string;
  /** Channel name in Asterisk format (e.g., "PJSIP/endpoint-00000001") */
  name: string = '';
  /** Current state of the channel */
  state: ChannelState = 'Down';
  /** Caller ID information for the calling party */
  caller: CallerId = { name: '', number: '' };
  /** Caller ID information for the connected party */
  connected: CallerId = { name: '', number: '' };
  /** Account code for billing purposes */
  accountcode: string = '';
  /** Current position in the dialplan */
  dialplan: DialplanCEP = { context: '', exten: '', priority: 1 };
  /** ISO 8601 timestamp when the channel was created */
  creationtime: string = '';
  /** Language code for the channel */
  language: string = 'en';
  /** Channel variables set on this channel */
  channelvars?: Record<string, string>;
  /** Protocol-specific identifier (Asterisk 20+) */
  protocol_id?: string;

  private readonly client: AriClient;
  private readonly listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  /**
   * Create a new channel instance.
   *
   * @param client - The ARI client this instance belongs to
   * @param id - Channel ID (auto-generated UUID if not provided)
   * @param data - Initial channel data from an event or API response
   *
   * @internal - Use `client.Channel()` instead
   */
  constructor(client: AriClient, id?: string, data?: Partial<Channel>) {
    this.client = client;
    this.id = id || crypto.randomUUID();

    if (data) {
      this.updateData(data);
    }

    // Register this instance for events
    this.client._registerChannelInstance(this.id, this);
  }

  /**
   * Update channel data from an event or API response.
   *
   * This is called automatically when channel events are received.
   * You can also call it manually to update the instance with fresh data.
   *
   * @param data - Partial channel data to merge
   *
   * @example
   * ```typescript
   * // Manually refresh channel data
   * const freshData = await client.channels.get(channel.id);
   * channel.updateData(freshData);
   * ```
   */
  updateData(data: Partial<Channel>): void {
    if (data.id !== undefined) this.id = data.id;
    if (data.name !== undefined) this.name = data.name;
    if (data.state !== undefined) this.state = data.state;
    if (data.caller !== undefined) this.caller = data.caller;
    if (data.connected !== undefined) this.connected = data.connected;
    if (data.accountcode !== undefined) this.accountcode = data.accountcode;
    if (data.dialplan !== undefined) this.dialplan = data.dialplan;
    if (data.creationtime !== undefined) this.creationtime = data.creationtime;
    if (data.language !== undefined) this.language = data.language;
    if (data.channelvars !== undefined) this.channelvars = data.channelvars;
    if (data.protocol_id !== undefined) this.protocol_id = data.protocol_id;
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  /**
   * Add an event listener for this channel.
   *
   * Only events for this specific channel will trigger the listener.
   * The listener receives the event and this channel instance.
   *
   * @param event - Event type to listen for
   * @param listener - Callback function
   * @returns This instance for chaining
   *
   * @example
   * ```typescript
   * channel.on('ChannelDtmfReceived', (event, channel) => {
   *   console.log(`DTMF ${event.digit} on ${channel.name}`);
   * });
   *
   * channel.on('ChannelStateChange', (event, channel) => {
   *   console.log(`State changed to ${channel.state}`);
   * });
   * ```
   */
  on<K extends keyof ChannelEventListeners>(
    event: K,
    listener: ChannelEventListeners[K]
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
   * Add a one-time event listener for this channel.
   *
   * The listener is automatically removed after being invoked once.
   *
   * @param event - Event type to listen for
   * @param listener - Callback function
   * @returns This instance for chaining
   *
   * @example
   * ```typescript
   * channel.once('ChannelDtmfReceived', (event) => {
   *   console.log(`First DTMF: ${event.digit}`);
   * });
   * ```
   */
  once<K extends keyof ChannelEventListeners>(
    event: K,
    listener: ChannelEventListeners[K]
  ): this {
    const wrappedListener = ((...args: unknown[]) => {
      this.off(event, wrappedListener as ChannelEventListeners[K]);
      (listener as (...args: unknown[]) => void)(...args);
    }) as ChannelEventListeners[K];

    return this.on(event, wrappedListener);
  }

  /**
   * Remove an event listener.
   *
   * @param event - Event type the listener was registered for
   * @param listener - The listener function to remove
   * @returns This instance for chaining
   */
  off<K extends keyof ChannelEventListeners>(
    event: K,
    listener: ChannelEventListeners[K]
  ): this {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener as (...args: unknown[]) => void);
    }
    return this;
  }

  /**
   * Emit an event to listeners.
   *
   * @param event - Event type to emit
   * @param data - Event data
   *
   * @internal - Called by the client when routing events
   */
  _emit<K extends ChannelEventType>(event: K, data: AriEventMap[K]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      for (const listener of eventListeners) {
        try {
          listener(data, this);
        } catch (error) {
          console.error(`Error in channel event listener for ${event}:`, error);
        }
      }
    }
  }

  /**
   * Remove all event listeners and unregister from the client.
   *
   * Call this when you're done with the channel to clean up resources.
   *
   * @returns This instance for chaining
   *
   * @example
   * ```typescript
   * channel.on('StasisEnd', () => {
   *   channel.removeAllListeners();
   * });
   * ```
   */
  removeAllListeners(): this {
    this.listeners.clear();
    this.client._unregisterChannelInstance(this.id);
    return this;
  }

  // ============================================================================
  // Channel Operations
  // ============================================================================

  /**
   * Originate a call to this channel.
   *
   * @param params - Originate parameters (channelId is automatically set)
   *
   * @example
   * ```typescript
   * const channel = client.Channel();
   * await channel.originate({
   *   endpoint: 'PJSIP/1000',
   *   app: 'my-app'
   * });
   * ```
   */
  async originate(params: Omit<OriginateParams, 'channelId'>): Promise<void> {
    const result = await this.client.channels.originateWithId(this.id, params);
    this.updateData(result);
  }

  /**
   * Answer this channel.
   *
   * @example
   * ```typescript
   * client.on('StasisStart', async (event, channel) => {
   *   await channel.answer();
   * });
   * ```
   */
  async answer(): Promise<void> {
    return this.client.channels.answer(this.id);
  }

  /**
   * Hang up this channel.
   *
   * @param params - Optional hangup parameters with reason code
   *
   * @example
   * ```typescript
   * // Normal hangup
   * await channel.hangup();
   *
   * // Hangup with reason
   * await channel.hangup({ reason: 'busy' });
   * ```
   */
  async hangup(params?: HangupParams): Promise<void> {
    return this.client.channels.hangup(this.id, params);
  }

  /**
   * Continue this channel in the dialplan.
   *
   * @param params - Optional dialplan location
   *
   * @example
   * ```typescript
   * await channel.continueInDialplan({
   *   context: 'default',
   *   extension: '200',
   *   priority: 1
   * });
   * ```
   */
  async continueInDialplan(params?: ContinueParams): Promise<void> {
    return this.client.channels.continueInDialplan(this.id, params);
  }

  /**
   * Move this channel to a different Stasis application.
   *
   * @param params - Target application and arguments
   *
   * @example
   * ```typescript
   * await channel.move({
   *   app: 'other-app',
   *   appArgs: 'some,args'
   * });
   * ```
   */
  async move(params: MoveParams): Promise<void> {
    return this.client.channels.move(this.id, params);
  }

  /**
   * Redirect this channel to a different endpoint.
   *
   * @param endpoint - Target endpoint
   *
   * @example
   * ```typescript
   * await channel.redirect('PJSIP/2000');
   * ```
   */
  async redirect(endpoint: string): Promise<void> {
    return this.client.channels.redirect(this.id, endpoint);
  }

  /**
   * Indicate ringing to this channel.
   *
   * @example
   * ```typescript
   * await channel.ring();
   * // ... do something ...
   * await channel.ringStop();
   * await channel.answer();
   * ```
   */
  async ring(): Promise<void> {
    return this.client.channels.ring(this.id);
  }

  /**
   * Stop indicating ringing to this channel.
   */
  async ringStop(): Promise<void> {
    return this.client.channels.ringStop(this.id);
  }

  /**
   * Send DTMF tones to this channel.
   *
   * @param params - DTMF digits and timing parameters
   *
   * @example
   * ```typescript
   * await channel.sendDTMF({
   *   dtmf: '1234#',
   *   between: 100
   * });
   * ```
   */
  async sendDTMF(params: DTMFParams): Promise<void> {
    return this.client.channels.sendDTMF(this.id, params);
  }

  /**
   * Mute this channel.
   *
   * @param direction - Direction to mute ('both', 'in', or 'out')
   *
   * @example
   * ```typescript
   * await channel.mute('both');
   * // ... later ...
   * await channel.unmute('both');
   * ```
   */
  async mute(direction: 'both' | 'in' | 'out' = 'both'): Promise<void> {
    return this.client.channels.mute(this.id, direction);
  }

  /**
   * Unmute this channel.
   *
   * @param direction - Direction to unmute ('both', 'in', or 'out')
   */
  async unmute(direction: 'both' | 'in' | 'out' = 'both'): Promise<void> {
    return this.client.channels.unmute(this.id, direction);
  }

  /**
   * Put this channel on hold.
   *
   * @example
   * ```typescript
   * await channel.hold();
   * // ... later ...
   * await channel.unhold();
   * ```
   */
  async hold(): Promise<void> {
    return this.client.channels.hold(this.id);
  }

  /**
   * Remove this channel from hold.
   */
  async unhold(): Promise<void> {
    return this.client.channels.unhold(this.id);
  }

  /**
   * Start music on hold for this channel.
   *
   * @param mohClass - Optional music on hold class
   *
   * @example
   * ```typescript
   * await channel.startMoh('jazz');
   * // ... later ...
   * await channel.stopMoh();
   * ```
   */
  async startMoh(mohClass?: string): Promise<void> {
    return this.client.channels.startMoh(this.id, mohClass);
  }

  /**
   * Stop music on hold for this channel.
   */
  async stopMoh(): Promise<void> {
    return this.client.channels.stopMoh(this.id);
  }

  /**
   * Start silence on this channel.
   */
  async startSilence(): Promise<void> {
    return this.client.channels.startSilence(this.id);
  }

  /**
   * Stop silence on this channel.
   */
  async stopSilence(): Promise<void> {
    return this.client.channels.stopSilence(this.id);
  }

  /**
   * Play media to this channel.
   *
   * Returns a PlaybackInstance for controlling and monitoring the playback.
   *
   * @param params - Play parameters (media URI, language, etc.)
   * @returns Playback instance
   *
   * @example
   * ```typescript
   * const playback = await channel.play({
   *   media: 'sound:hello-world'
   * });
   *
   * playback.on('PlaybackFinished', () => {
   *   console.log('Playback complete');
   * });
   * ```
   */
  async play(params: PlayParams): Promise<PlaybackInstance> {
    // Create playback instance first to register for events
    const playback = this.client.Playback(params.playbackId);
    await this.client.channels.play(this.id, {
      ...params,
      playbackId: playback.id,
    });
    return playback;
  }

  /**
   * Record audio from this channel.
   *
   * Returns a LiveRecordingInstance for controlling and monitoring the recording.
   *
   * @param params - Record parameters (name, format, etc.)
   * @returns LiveRecording instance
   *
   * @example
   * ```typescript
   * const recording = await channel.record({
   *   name: 'voicemail-123',
   *   format: 'wav',
   *   beep: true,
   *   terminateOn: '#'
   * });
   *
   * recording.on('RecordingFinished', () => {
   *   console.log('Recording saved');
   * });
   * ```
   */
  async record(params: RecordParams): Promise<LiveRecordingInstance> {
    // Create recording instance first to register for events
    const recording = this.client.LiveRecording(params.name);
    await this.client.channels.record(this.id, params);
    return recording;
  }

  /**
   * Get a channel variable.
   *
   * @param variable - Variable name to get
   * @returns Variable value
   *
   * @example
   * ```typescript
   * const value = await channel.getVariable('CALLERID(num)');
   * console.log(`Caller: ${value}`);
   * ```
   */
  async getVariable(variable: string): Promise<string> {
    return this.client.channels.getVariable(this.id, variable);
  }

  /**
   * Set a channel variable.
   *
   * @param variable - Variable name to set
   * @param value - Variable value (undefined to unset)
   *
   * @example
   * ```typescript
   * await channel.setVariable('MY_VAR', 'some value');
   * ```
   */
  async setVariable(variable: string, value?: string): Promise<void> {
    return this.client.channels.setVariable(this.id, variable, value);
  }

  /**
   * Start snooping (spying/whispering) on this channel.
   *
   * @param params - Snoop parameters (spy/whisper direction, app, etc.)
   * @returns Channel instance for the snoop channel
   *
   * @example
   * ```typescript
   * const snoopChannel = await channel.snoop({
   *   spy: 'both',
   *   whisper: 'none',
   *   app: 'supervisor'
   * });
   * ```
   */
  async snoop(params: SnoopParams): Promise<ChannelInstance> {
    const snoopChannel = this.client.Channel(params.snoopId);
    await this.client.channels.snoop(this.id, {
      ...params,
      snoopId: snoopChannel.id,
    });
    return snoopChannel;
  }

  /**
   * Dial this channel (for channels created with create() instead of originate).
   *
   * @param params - Optional dial parameters
   *
   * @example
   * ```typescript
   * const channel = await client.channels.create({
   *   endpoint: 'PJSIP/1000',
   *   app: 'my-app'
   * });
   *
   * const instance = client.Channel(channel.id, channel);
   * await instance.dial({ timeout: 30 });
   * ```
   */
  async dial(params?: DialParams): Promise<void> {
    return this.client.channels.dial(this.id, params);
  }

  /**
   * Get RTP statistics for this channel.
   *
   * @returns RTP statistics including jitter, packet loss, RTT
   *
   * @example
   * ```typescript
   * const stats = await channel.getRtpStatistics();
   * console.log(`Jitter: ${stats.rxjitter}ms`);
   * console.log(`Packet loss: ${stats.rxploss}`);
   * ```
   */
  async getRtpStatistics(): Promise<RTPstat> {
    return this.client.channels.getRtpStatistics(this.id);
  }
}
