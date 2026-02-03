/**
 * Bridges API resource
 */

import { BaseResource } from './base.js';
import type { HttpConnection } from '../connection.js';
import { toQueryParams } from '../connection.js';
import type { VersionCompat } from '../version.js';
import type { AriClient } from '../client.js';
import type { BridgeInstance } from '../models/bridge.js';
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
  constructor(client: AriClient, http: HttpConnection, version: VersionCompat) {
    super(client, http, version);
  }

  /**
   * List all active bridges
   * @throws {AriHttpError} If the ARI request fails
   */
  async list(): Promise<Bridge[]> {
    return this.http.get<Bridge[]>('/bridges');
  }

  /**
   * Get a bridge by ID.
   *
   * Returns a BridgeInstance with methods and event handling.
   * Throws AriHttpError with status 404 if the bridge does not exist.
   *
   * @param bridgeId - The bridge ID
   * @returns BridgeInstance with current data from Asterisk
   * @throws {AriHttpError} If the bridge doesn't exist (404) or other API error
   *
   * @example
   * ```typescript
   * // Load an existing bridge
   * const bridge = await client.bridges.get('my-bridge-id');
   * bridge.on('ChannelEnteredBridge', (event) => { ... });
   *
   * // Check if bridge exists
   * try {
   *   const bridge = await client.bridges.get('unknown-id');
   * } catch (e) {
   *   if (e instanceof AriHttpError && e.status === 404) {
   *     console.log('Bridge not found');
   *   }
   * }
   * ```
   */
  async get(bridgeId: string): Promise<BridgeInstance> {
    const data = await this.http.get<Bridge>(`/bridges/${encodeURIComponent(bridgeId)}`);
    return this.client._getBridgeInstance(data.id, data);
  }

  /**
   * Create a new bridge
   * @throws {AriHttpError} If the ARI request fails
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
   * @throws {AriHttpError} If the ARI request fails
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
   * @throws {AriHttpError} If the ARI request fails
   */
  async destroy(bridgeId: string): Promise<void> {
    return this.http.delete<void>(`/bridges/${encodeURIComponent(bridgeId)}`);
  }

  /**
   * Add channel(s) to a bridge
   * @throws {AriHttpError} If the ARI request fails
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
   * @throws {AriHttpError} If the ARI request fails
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
   * @throws {AriHttpError} If the ARI request fails
   */
  async setVideoSource(bridgeId: string, channelId: string): Promise<void> {
    return this.http.post<void>(
      `/bridges/${encodeURIComponent(bridgeId)}/videoSource/${encodeURIComponent(channelId)}`
    );
  }

  /**
   * Clear the video source for a bridge
   * @throws {AriHttpError} If the ARI request fails
   */
  async clearVideoSource(bridgeId: string): Promise<void> {
    return this.http.delete<void>(`/bridges/${encodeURIComponent(bridgeId)}/videoSource`);
  }

  /**
   * Start music on hold for a bridge
   * @throws {AriHttpError} If the ARI request fails
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
   * @throws {AriHttpError} If the ARI request fails
   */
  async stopMoh(bridgeId: string): Promise<void> {
    return this.http.delete<void>(`/bridges/${encodeURIComponent(bridgeId)}/moh`);
  }

  /**
   * Play media to a bridge
   * @throws {AriHttpError} If the ARI request fails
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
   * @throws {AriHttpError} If the ARI request fails
   */
  async record(bridgeId: string, params: RecordBridgeParams): Promise<LiveRecording> {
    return this.http.post<LiveRecording>(
      `/bridges/${encodeURIComponent(bridgeId)}/record`,
      undefined,
      toQueryParams(params)
    );
  }
}
