/**
 * Channels API resource
 */

import { BaseResource } from './base.js';
import type { HttpConnection } from '../connection.js';
import { toQueryParams } from '../connection.js';
import type { VersionCompat } from '../version.js';
import type {
  Channel,
  OriginateParams,
  CreateChannelParams,
  HangupParams,
  ContinueParams,
  MoveParams,
  DTMFParams,
  PlayParams,
  RecordParams,
  SnoopParams,
  DialParams,
  ExternalMediaParams,
  Playback,
  LiveRecording,
  RTPstat,
  Variable,
} from '../types/api.js';

/**
 * Channels API - Manage calls and channels
 */
export class ChannelsResource extends BaseResource {
  constructor(http: HttpConnection, version: VersionCompat) {
    super(http, version);
  }

  /**
   * List all active channels
   */
  async list(): Promise<Channel[]> {
    return this.http.get<Channel[]>('/channels');
  }

  /**
   * Get a channel's details
   */
  async get(channelId: string): Promise<Channel> {
    return this.http.get<Channel>(`/channels/${encodeURIComponent(channelId)}`);
  }

  /**
   * Create a new channel (dial out)
   */
  async originate(params: OriginateParams): Promise<Channel> {
    const { variables, ...rest } = params;
    const query: Record<string, string | number | undefined> = { ...rest };

    // Handle variables as JSON
    if (variables) {
      query['variables'] = JSON.stringify(variables);
    }

    return this.http.post<Channel>('/channels', undefined, query);
  }

  /**
   * Create a new channel with a specific ID
   */
  async originateWithId(channelId: string, params: OriginateParams): Promise<Channel> {
    const { variables, ...rest } = params;
    const query: Record<string, string | number | undefined> = { ...rest };

    if (variables) {
      query['variables'] = JSON.stringify(variables);
    }

    return this.http.post<Channel>(`/channels/${encodeURIComponent(channelId)}`, undefined, query);
  }

  /**
   * Create a channel (without dialing)
   */
  async create(params: CreateChannelParams): Promise<Channel> {
    const { variables, ...rest } = params;
    const query: Record<string, string | number | undefined> = { ...rest };

    if (variables) {
      query['variables'] = JSON.stringify(variables);
    }

    return this.http.post<Channel>('/channels/create', undefined, query);
  }

  /**
   * Hangup a channel
   */
  async hangup(channelId: string, params?: HangupParams): Promise<void> {
    return this.http.delete<void>(`/channels/${encodeURIComponent(channelId)}`, toQueryParams(params));
  }

  /**
   * Continue the channel in the dialplan
   */
  async continueInDialplan(channelId: string, params?: ContinueParams): Promise<void> {
    return this.http.post<void>(
      `/channels/${encodeURIComponent(channelId)}/continue`,
      undefined,
      toQueryParams(params)
    );
  }

  /**
   * Move the channel to a different Stasis application
   */
  async move(channelId: string, params: MoveParams): Promise<void> {
    this.validateVersion('move');
    return this.http.post<void>(
      `/channels/${encodeURIComponent(channelId)}/move`,
      undefined,
      toQueryParams(params)
    );
  }

  /**
   * Redirect the channel to a different location
   */
  async redirect(channelId: string, endpoint: string): Promise<void> {
    return this.http.post<void>(
      `/channels/${encodeURIComponent(channelId)}/redirect`,
      undefined,
      { endpoint }
    );
  }

  /**
   * Answer a channel
   */
  async answer(channelId: string): Promise<void> {
    return this.http.post<void>(`/channels/${encodeURIComponent(channelId)}/answer`);
  }

  /**
   * Indicate ringing to a channel
   */
  async ring(channelId: string): Promise<void> {
    return this.http.post<void>(`/channels/${encodeURIComponent(channelId)}/ring`);
  }

  /**
   * Stop indicating ringing to a channel
   */
  async ringStop(channelId: string): Promise<void> {
    return this.http.delete<void>(`/channels/${encodeURIComponent(channelId)}/ring`);
  }

  /**
   * Send DTMF to a channel
   */
  async sendDTMF(channelId: string, params: DTMFParams): Promise<void> {
    return this.http.post<void>(
      `/channels/${encodeURIComponent(channelId)}/dtmf`,
      undefined,
      toQueryParams(params)
    );
  }

  /**
   * Mute a channel
   */
  async mute(channelId: string, direction: 'both' | 'in' | 'out' = 'both'): Promise<void> {
    return this.http.post<void>(
      `/channels/${encodeURIComponent(channelId)}/mute`,
      undefined,
      { direction }
    );
  }

  /**
   * Unmute a channel
   */
  async unmute(channelId: string, direction: 'both' | 'in' | 'out' = 'both'): Promise<void> {
    return this.http.delete<void>(
      `/channels/${encodeURIComponent(channelId)}/mute`,
      { direction }
    );
  }

  /**
   * Put a channel on hold
   */
  async hold(channelId: string): Promise<void> {
    return this.http.post<void>(`/channels/${encodeURIComponent(channelId)}/hold`);
  }

  /**
   * Remove a channel from hold
   */
  async unhold(channelId: string): Promise<void> {
    return this.http.delete<void>(`/channels/${encodeURIComponent(channelId)}/hold`);
  }

  /**
   * Start music on hold for a channel
   */
  async startMoh(channelId: string, mohClass?: string): Promise<void> {
    return this.http.post<void>(
      `/channels/${encodeURIComponent(channelId)}/moh`,
      undefined,
      mohClass ? { mohClass } : undefined
    );
  }

  /**
   * Stop music on hold for a channel
   */
  async stopMoh(channelId: string): Promise<void> {
    return this.http.delete<void>(`/channels/${encodeURIComponent(channelId)}/moh`);
  }

  /**
   * Start silence on a channel
   */
  async startSilence(channelId: string): Promise<void> {
    return this.http.post<void>(`/channels/${encodeURIComponent(channelId)}/silence`);
  }

  /**
   * Stop silence on a channel
   */
  async stopSilence(channelId: string): Promise<void> {
    return this.http.delete<void>(`/channels/${encodeURIComponent(channelId)}/silence`);
  }

  /**
   * Play media to a channel
   */
  async play(channelId: string, params: PlayParams): Promise<Playback> {
    const { media, playbackId, ...rest } = params;
    const mediaArray = Array.isArray(media) ? media : [media];

    const query: Record<string, string | number | string[] | undefined> = {
      ...rest,
      media: mediaArray,
    };

    if (playbackId) {
      return this.http.post<Playback>(
        `/channels/${encodeURIComponent(channelId)}/play/${encodeURIComponent(playbackId)}`,
        undefined,
        query
      );
    }

    return this.http.post<Playback>(
      `/channels/${encodeURIComponent(channelId)}/play`,
      undefined,
      query
    );
  }

  /**
   * Record audio from a channel
   */
  async record(channelId: string, params: RecordParams): Promise<LiveRecording> {
    return this.http.post<LiveRecording>(
      `/channels/${encodeURIComponent(channelId)}/record`,
      undefined,
      toQueryParams(params)
    );
  }

  /**
   * Get a channel variable
   */
  async getVariable(channelId: string, variable: string): Promise<string> {
    const result = await this.http.get<Variable>(
      `/channels/${encodeURIComponent(channelId)}/variable`,
      { variable }
    );
    return result.value;
  }

  /**
   * Set a channel variable
   */
  async setVariable(channelId: string, variable: string, value?: string): Promise<void> {
    return this.http.post<void>(
      `/channels/${encodeURIComponent(channelId)}/variable`,
      undefined,
      { variable, value }
    );
  }

  /**
   * Start snooping on a channel
   */
  async snoop(channelId: string, params: SnoopParams): Promise<Channel> {
    const { snoopId, ...rest } = params;

    if (snoopId) {
      return this.http.post<Channel>(
        `/channels/${encodeURIComponent(channelId)}/snoop/${encodeURIComponent(snoopId)}`,
        undefined,
        toQueryParams(rest)
      );
    }

    return this.http.post<Channel>(
      `/channels/${encodeURIComponent(channelId)}/snoop`,
      undefined,
      toQueryParams(rest)
    );
  }

  /**
   * Dial a created channel
   */
  async dial(channelId: string, params?: DialParams): Promise<void> {
    return this.http.post<void>(
      `/channels/${encodeURIComponent(channelId)}/dial`,
      undefined,
      toQueryParams(params)
    );
  }

  /**
   * Get RTP statistics for a channel
   */
  async getRtpStatistics(channelId: string): Promise<RTPstat> {
    return this.http.get<RTPstat>(`/channels/${encodeURIComponent(channelId)}/rtp_statistics`);
  }

  /**
   * Create an external media channel
   */
  async externalMedia(params: ExternalMediaParams): Promise<Channel> {
    this.validateVersion('externalMedia');
    const { channelId, variables, ...rest } = params;
    const query: Record<string, string | number | undefined> = { ...rest };

    if (variables) {
      query['variables'] = JSON.stringify(variables);
    }

    if (channelId) {
      return this.http.post<Channel>(
        `/channels/externalMedia/${encodeURIComponent(channelId)}`,
        undefined,
        query
      );
    }

    return this.http.post<Channel>('/channels/externalMedia', undefined, query);
  }
}
