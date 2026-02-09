/**
 * Channels API resource
 */

import { BaseResource } from './base.js';
import type { HttpConnection } from '../connection.js';
import { toQueryParams } from '../connection.js';
import type { VersionCompat } from '../version.js';
import type { AriClient } from '../client.js';
import type { ChannelInstance } from '../models/channel.js';
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
  constructor(client: AriClient, http: HttpConnection, version: VersionCompat) {
    super(client, http, version);
  }

  /**
   * List all active channels
   * @throws {AriHttpError} If the ARI request fails
   */
  async list(): Promise<Channel[]> {
    return this.http.get<Channel[]>('/channels');
  }

  /**
   * Get a channel by ID.
   *
   * Returns a ChannelInstance with methods and event handling.
   * Throws AriHttpError with status 404 if the channel does not exist.
   *
   * @param channelId - The channel ID
   * @returns ChannelInstance with current data from Asterisk
   * @throws {AriHttpError} If the channel doesn't exist (404) or other API error
   *
   * @example
   * ```typescript
   * // Load an existing channel
   * const channel = await client.channels.get('channel-id');
   * channel.on('ChannelDtmfReceived', (event) => { ... });
   *
   * // Check if channel exists
   * try {
   *   const channel = await client.channels.get('unknown-id');
   * } catch (e) {
   *   if (e instanceof AriHttpError && e.status === 404) {
   *     console.log('Channel not found');
   *   }
   * }
   * ```
   */
  async get(channelId: string): Promise<ChannelInstance> {
    const data = await this.http.get<Channel>(`/channels/${encodeURIComponent(channelId)}`);
    return this.client.Channel(data.id, data);
  }

  /**
   * Create a new channel (dial out)
   * @throws {AriHttpError} If the ARI request fails
   */
  async originate(params: OriginateParams): Promise<ChannelInstance> {
    const { variables, ...rest } = params;
    const query: Record<string, string | number | undefined> = { ...rest };

    // Handle variables as JSON
    if (variables) {
      query['variables'] = JSON.stringify(variables);
    }

    const data = await this.http.post<Channel>('/channels', undefined, query);
    return this.client.Channel(data.id, data);
  }

  /**
   * Create a new channel with a specific ID
   * @throws {AriHttpError} If the ARI request fails
   */
  async originateWithId(channelId: string, params: OriginateParams): Promise<ChannelInstance> {
    const { variables, ...rest } = params;
    const query: Record<string, string | number | undefined> = { ...rest };

    if (variables) {
      query['variables'] = JSON.stringify(variables);
    }

    const data = await this.http.post<Channel>(`/channels/${encodeURIComponent(channelId)}`, undefined, query);
    return this.client.Channel(data.id, data);
  }

  /**
   * Create a channel (without dialing)
   * @throws {AriHttpError} If the ARI request fails
   */
  async create(params: CreateChannelParams): Promise<ChannelInstance> {
    const { variables, ...rest } = params;
    const query: Record<string, string | number | undefined> = { ...rest };

    if (variables) {
      query['variables'] = JSON.stringify(variables);
    }

    const data = await this.http.post<Channel>('/channels/create', undefined, query);
    return this.client.Channel(data.id, data);
  }

  /**
   * Hangup a channel
   * @throws {AriHttpError} If the ARI request fails
   */
  async hangup(channelId: string, params?: HangupParams): Promise<void> {
    return this.http.delete<void>(`/channels/${encodeURIComponent(channelId)}`, toQueryParams(params));
  }

  /**
   * Continue the channel in the dialplan
   * @throws {AriHttpError} If the ARI request fails
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
   * @throws {AriHttpError} If the ARI request fails
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
   * @throws {AriHttpError} If the ARI request fails
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
   * @throws {AriHttpError} If the ARI request fails
   */
  async answer(channelId: string): Promise<void> {
    return this.http.post<void>(`/channels/${encodeURIComponent(channelId)}/answer`);
  }

  /**
   * Indicate ringing to a channel
   * @throws {AriHttpError} If the ARI request fails
   */
  async ring(channelId: string): Promise<void> {
    return this.http.post<void>(`/channels/${encodeURIComponent(channelId)}/ring`);
  }

  /**
   * Stop indicating ringing to a channel
   * @throws {AriHttpError} If the ARI request fails
   */
  async ringStop(channelId: string): Promise<void> {
    return this.http.delete<void>(`/channels/${encodeURIComponent(channelId)}/ring`);
  }

  /**
   * Send DTMF to a channel
   * @throws {AriHttpError} If the ARI request fails
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
   * @throws {AriHttpError} If the ARI request fails
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
   * @throws {AriHttpError} If the ARI request fails
   */
  async unmute(channelId: string, direction: 'both' | 'in' | 'out' = 'both'): Promise<void> {
    return this.http.delete<void>(
      `/channels/${encodeURIComponent(channelId)}/mute`,
      { direction }
    );
  }

  /**
   * Put a channel on hold
   * @throws {AriHttpError} If the ARI request fails
   */
  async hold(channelId: string): Promise<void> {
    return this.http.post<void>(`/channels/${encodeURIComponent(channelId)}/hold`);
  }

  /**
   * Remove a channel from hold
   * @throws {AriHttpError} If the ARI request fails
   */
  async unhold(channelId: string): Promise<void> {
    return this.http.delete<void>(`/channels/${encodeURIComponent(channelId)}/hold`);
  }

  /**
   * Start music on hold for a channel
   * @throws {AriHttpError} If the ARI request fails
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
   * @throws {AriHttpError} If the ARI request fails
   */
  async stopMoh(channelId: string): Promise<void> {
    return this.http.delete<void>(`/channels/${encodeURIComponent(channelId)}/moh`);
  }

  /**
   * Start silence on a channel
   * @throws {AriHttpError} If the ARI request fails
   */
  async startSilence(channelId: string): Promise<void> {
    return this.http.post<void>(`/channels/${encodeURIComponent(channelId)}/silence`);
  }

  /**
   * Stop silence on a channel
   * @throws {AriHttpError} If the ARI request fails
   */
  async stopSilence(channelId: string): Promise<void> {
    return this.http.delete<void>(`/channels/${encodeURIComponent(channelId)}/silence`);
  }

  /**
   * Play media to a channel
   * @throws {AriHttpError} If the ARI request fails
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
   * @throws {AriHttpError} If the ARI request fails
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
   * @throws {AriHttpError} If the ARI request fails
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
   * @throws {AriHttpError} If the ARI request fails
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
   * @throws {AriHttpError} If the ARI request fails
   */
  async snoop(channelId: string, params: SnoopParams): Promise<ChannelInstance> {
    const { snoopId, ...rest } = params;

    let data: Channel;
    if (snoopId) {
      data = await this.http.post<Channel>(
        `/channels/${encodeURIComponent(channelId)}/snoop/${encodeURIComponent(snoopId)}`,
        undefined,
        toQueryParams(rest)
      );
    } else {
      data = await this.http.post<Channel>(
        `/channels/${encodeURIComponent(channelId)}/snoop`,
        undefined,
        toQueryParams(rest)
      );
    }

    return this.client.Channel(data.id, data);
  }

  /**
   * Dial a created channel
   * @throws {AriHttpError} If the ARI request fails
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
   * @throws {AriHttpError} If the ARI request fails
   */
  async getRtpStatistics(channelId: string): Promise<RTPstat> {
    return this.http.get<RTPstat>(`/channels/${encodeURIComponent(channelId)}/rtp_statistics`);
  }

  /**
   * Create an external media channel
   * @throws {AriHttpError} If the ARI request fails
   */
  async externalMedia(params: ExternalMediaParams): Promise<ChannelInstance> {
    this.validateVersion('externalMedia');
    const { channelId, variables, ...rest } = params;
    const query: Record<string, string | number | undefined> = { ...rest };

    if (variables) {
      query['variables'] = JSON.stringify(variables);
    }

    let data: Channel;
    if (channelId) {
      data = await this.http.post<Channel>(
        `/channels/externalMedia/${encodeURIComponent(channelId)}`,
        undefined,
        query
      );
    } else {
      data = await this.http.post<Channel>('/channels/externalMedia', undefined, query);
    }

    return this.client.Channel(data.id, data);
  }
}
