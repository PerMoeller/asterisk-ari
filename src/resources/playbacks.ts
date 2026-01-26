/**
 * Playbacks API resource
 */

import { BaseResource } from './base.js';
import type { HttpConnection } from '../connection.js';
import type { VersionCompat } from '../version.js';
import type { Playback } from '../types/api.js';

export type PlaybackOperation = 'restart' | 'pause' | 'unpause' | 'reverse' | 'forward';

/**
 * Playbacks API - Control media playback
 */
export class PlaybacksResource extends BaseResource {
  constructor(http: HttpConnection, version: VersionCompat) {
    super(http, version);
  }

  /**
   * Get a playback's details
   */
  async get(playbackId: string): Promise<Playback> {
    return this.http.get<Playback>(`/playbacks/${encodeURIComponent(playbackId)}`);
  }

  /**
   * Stop a playback
   */
  async stop(playbackId: string): Promise<void> {
    return this.http.delete<void>(`/playbacks/${encodeURIComponent(playbackId)}`);
  }

  /**
   * Control a playback
   */
  async control(playbackId: string, operation: PlaybackOperation): Promise<void> {
    return this.http.post<void>(
      `/playbacks/${encodeURIComponent(playbackId)}/control`,
      undefined,
      { operation }
    );
  }
}
