/**
 * Bridges API resource
 */

import { BaseResource } from './base.js';
import type { HttpConnection } from '../connection.js';
import { toQueryParams } from '../connection.js';
import type { VersionCompat } from '../version.js';
import type {
  Bridge,
  CreateBridgeParams,
  AddChannelParams,
  RemoveChannelParams,
  PlayBridgeParams,
  RecordBridgeParams,
  Playback,
  LiveRecording,
} from '../types/api.js';

/**
 * Bridges API - Manage bridges (conference rooms, etc.)
 */
export class BridgesResource extends BaseResource {
  constructor(http: HttpConnection, version: VersionCompat) {
    super(http, version);
  }

  /**
   * List all active bridges
   */
  async list(): Promise<Bridge[]> {
    return this.http.get<Bridge[]>('/bridges');
  }

  /**
   * Get a bridge's details
   */
  async get(bridgeId: string): Promise<Bridge> {
    return this.http.get<Bridge>(`/bridges/${encodeURIComponent(bridgeId)}`);
  }

  /**
   * Create a new bridge
   */
  async create(params?: CreateBridgeParams): Promise<Bridge> {
    const { bridgeId, ...rest } = params || {};

    if (bridgeId) {
      return this.http.post<Bridge>(
        `/bridges/${encodeURIComponent(bridgeId)}`,
        undefined,
        rest
      );
    }

    return this.http.post<Bridge>('/bridges', undefined, rest);
  }

  /**
   * Create a bridge or update an existing bridge
   */
  async createOrUpdate(bridgeId: string, params?: Omit<CreateBridgeParams, 'bridgeId'>): Promise<Bridge> {
    return this.http.post<Bridge>(
      `/bridges/${encodeURIComponent(bridgeId)}`,
      undefined,
      params
    );
  }

  /**
   * Destroy a bridge
   */
  async destroy(bridgeId: string): Promise<void> {
    return this.http.delete<void>(`/bridges/${encodeURIComponent(bridgeId)}`);
  }

  /**
   * Add channel(s) to a bridge
   */
  async addChannel(bridgeId: string, params: AddChannelParams): Promise<void> {
    const { channel, ...rest } = params;
    const channelArray = Array.isArray(channel) ? channel : [channel];

    return this.http.post<void>(
      `/bridges/${encodeURIComponent(bridgeId)}/addChannel`,
      undefined,
      { channel: channelArray, ...rest }
    );
  }

  /**
   * Remove channel(s) from a bridge
   */
  async removeChannel(bridgeId: string, params: RemoveChannelParams): Promise<void> {
    const { channel } = params;
    const channelArray = Array.isArray(channel) ? channel : [channel];

    return this.http.post<void>(
      `/bridges/${encodeURIComponent(bridgeId)}/removeChannel`,
      undefined,
      { channel: channelArray }
    );
  }

  /**
   * Set the video source for a bridge
   */
  async setVideoSource(bridgeId: string, channelId: string): Promise<void> {
    return this.http.post<void>(
      `/bridges/${encodeURIComponent(bridgeId)}/videoSource/${encodeURIComponent(channelId)}`
    );
  }

  /**
   * Clear the video source for a bridge
   */
  async clearVideoSource(bridgeId: string): Promise<void> {
    return this.http.delete<void>(`/bridges/${encodeURIComponent(bridgeId)}/videoSource`);
  }

  /**
   * Start music on hold for a bridge
   */
  async startMoh(bridgeId: string, mohClass?: string): Promise<void> {
    return this.http.post<void>(
      `/bridges/${encodeURIComponent(bridgeId)}/moh`,
      undefined,
      mohClass ? { mohClass } : undefined
    );
  }

  /**
   * Stop music on hold for a bridge
   */
  async stopMoh(bridgeId: string): Promise<void> {
    return this.http.delete<void>(`/bridges/${encodeURIComponent(bridgeId)}/moh`);
  }

  /**
   * Play media to a bridge
   */
  async play(bridgeId: string, params: PlayBridgeParams): Promise<Playback> {
    const { media, playbackId, ...rest } = params;
    const mediaArray = Array.isArray(media) ? media : [media];

    const query: Record<string, string | number | string[] | undefined> = {
      ...rest,
      media: mediaArray,
    };

    if (playbackId) {
      return this.http.post<Playback>(
        `/bridges/${encodeURIComponent(bridgeId)}/play/${encodeURIComponent(playbackId)}`,
        undefined,
        query
      );
    }

    return this.http.post<Playback>(
      `/bridges/${encodeURIComponent(bridgeId)}/play`,
      undefined,
      query
    );
  }

  /**
   * Record audio from a bridge
   */
  async record(bridgeId: string, params: RecordBridgeParams): Promise<LiveRecording> {
    return this.http.post<LiveRecording>(
      `/bridges/${encodeURIComponent(bridgeId)}/record`,
      undefined,
      toQueryParams(params)
    );
  }
}
