/**
 * Playbacks API resource
 */

import { BaseResource } from './base.js';
import type { HttpConnection } from '../connection.js';
import type { VersionCompat } from '../version.js';
import type { AriClient } from '../client.js';
import type { PlaybackInstance } from '../models/playback.js';
import type { Playback } from '../types/api.js';

export type PlaybackOperation = 'restart' | 'pause' | 'unpause' | 'reverse' | 'forward';

/**
 * Playbacks API - Control media playback
 */
export class PlaybacksResource extends BaseResource {
  constructor(client: AriClient, http: HttpConnection, version: VersionCompat) {
    super(client, http, version);
  }

  /**
   * Get a playback by ID.
   *
   * Returns a PlaybackInstance with methods and event handling.
   * Throws AriHttpError with status 404 if the playback does not exist.
   *
   * @param playbackId - The playback ID
   * @returns PlaybackInstance with current data from Asterisk
   * @throws {AriHttpError} If the playback doesn't exist (404) or other API error
   *
   * @example
   * ```typescript
   * // Load an existing playback
   * const playback = await client.playbacks.get('playback-id');
   * playback.on('PlaybackFinished', (event) => { ... });
   *
   * // Check if playback exists
   * try {
   *   const playback = await client.playbacks.get('unknown-id');
   * } catch (e) {
   *   if (e instanceof AriHttpError && e.status === 404) {
   *     console.log('Playback not found');
   *   }
   * }
   * ```
   */
  async get(playbackId: string): Promise<PlaybackInstance> {
    const data = await this.http.get<Playback>(`/playbacks/${encodeURIComponent(playbackId)}`);
    return this.client.Playback(data.id, data);
  }

  /**
   * Stop a playback
   * @throws {AriHttpError} If the ARI request fails
   */
  async stop(playbackId: string): Promise<void> {
    return this.http.delete<void>(`/playbacks/${encodeURIComponent(playbackId)}`);
  }

  /**
   * Control a playback
   * @throws {AriHttpError} If the ARI request fails
   */
  async control(playbackId: string, operation: PlaybackOperation): Promise<void> {
    return this.http.post<void>(
      `/playbacks/${encodeURIComponent(playbackId)}/control`,
      undefined,
      { operation }
    );
  }
}
