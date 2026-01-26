/**
 * Channel model and instance class
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

type ChannelEventListener<E> = (event: E, channel: ChannelInstance) => void | Promise<void>;

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
 * Channel instance with bound operations and event handling
 */
export class ChannelInstance implements Channel {
  // Channel properties
  id: string;
  name: string = '';
  state: ChannelState = 'Down';
  caller: CallerId = { name: '', number: '' };
  connected: CallerId = { name: '', number: '' };
  accountcode: string = '';
  dialplan: DialplanCEP = { context: '', exten: '', priority: 1 };
  creationtime: string = '';
  language: string = 'en';
  channelvars?: Record<string, string>;
  protocol_id?: string;

  private readonly client: AriClient;
  private readonly listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

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
   * Update channel data from an event or API response
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

  /**
   * Add an event listener
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
   * Add a one-time event listener
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
   * Remove an event listener
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
   * Emit an event to listeners
   * @internal
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
   * Remove all event listeners and unregister from client
   */
  removeAllListeners(): this {
    this.listeners.clear();
    this.client._unregisterChannelInstance(this.id);
    return this;
  }

  // ============================================================================
  // Bound Channel Operations
  // ============================================================================

  /**
   * Originate a call to this channel
   */
  async originate(params: Omit<OriginateParams, 'channelId'>): Promise<void> {
    const result = await this.client.channels.originateWithId(this.id, params);
    this.updateData(result);
  }

  /**
   * Answer this channel
   */
  async answer(): Promise<void> {
    return this.client.channels.answer(this.id);
  }

  /**
   * Hangup this channel
   */
  async hangup(params?: HangupParams): Promise<void> {
    return this.client.channels.hangup(this.id, params);
  }

  /**
   * Continue this channel in the dialplan
   */
  async continueInDialplan(params?: ContinueParams): Promise<void> {
    return this.client.channels.continueInDialplan(this.id, params);
  }

  /**
   * Move this channel to a different Stasis application
   */
  async move(params: MoveParams): Promise<void> {
    return this.client.channels.move(this.id, params);
  }

  /**
   * Redirect this channel to a different location
   */
  async redirect(endpoint: string): Promise<void> {
    return this.client.channels.redirect(this.id, endpoint);
  }

  /**
   * Indicate ringing to this channel
   */
  async ring(): Promise<void> {
    return this.client.channels.ring(this.id);
  }

  /**
   * Stop indicating ringing to this channel
   */
  async ringStop(): Promise<void> {
    return this.client.channels.ringStop(this.id);
  }

  /**
   * Send DTMF to this channel
   */
  async sendDTMF(params: DTMFParams): Promise<void> {
    return this.client.channels.sendDTMF(this.id, params);
  }

  /**
   * Mute this channel
   */
  async mute(direction: 'both' | 'in' | 'out' = 'both'): Promise<void> {
    return this.client.channels.mute(this.id, direction);
  }

  /**
   * Unmute this channel
   */
  async unmute(direction: 'both' | 'in' | 'out' = 'both'): Promise<void> {
    return this.client.channels.unmute(this.id, direction);
  }

  /**
   * Put this channel on hold
   */
  async hold(): Promise<void> {
    return this.client.channels.hold(this.id);
  }

  /**
   * Remove this channel from hold
   */
  async unhold(): Promise<void> {
    return this.client.channels.unhold(this.id);
  }

  /**
   * Start music on hold for this channel
   */
  async startMoh(mohClass?: string): Promise<void> {
    return this.client.channels.startMoh(this.id, mohClass);
  }

  /**
   * Stop music on hold for this channel
   */
  async stopMoh(): Promise<void> {
    return this.client.channels.stopMoh(this.id);
  }

  /**
   * Start silence on this channel
   */
  async startSilence(): Promise<void> {
    return this.client.channels.startSilence(this.id);
  }

  /**
   * Stop silence on this channel
   */
  async stopSilence(): Promise<void> {
    return this.client.channels.stopSilence(this.id);
  }

  /**
   * Play media to this channel
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
   * Record audio from this channel
   */
  async record(params: RecordParams): Promise<LiveRecordingInstance> {
    // Create recording instance first to register for events
    const recording = this.client.LiveRecording(params.name);
    await this.client.channels.record(this.id, params);
    return recording;
  }

  /**
   * Get a channel variable
   */
  async getVariable(variable: string): Promise<string> {
    return this.client.channels.getVariable(this.id, variable);
  }

  /**
   * Set a channel variable
   */
  async setVariable(variable: string, value?: string): Promise<void> {
    return this.client.channels.setVariable(this.id, variable, value);
  }

  /**
   * Start snooping on this channel
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
   * Dial this channel
   */
  async dial(params?: DialParams): Promise<void> {
    return this.client.channels.dial(this.id, params);
  }

  /**
   * Get RTP statistics for this channel
   */
  async getRtpStatistics(): Promise<RTPstat> {
    return this.client.channels.getRtpStatistics(this.id);
  }
}
