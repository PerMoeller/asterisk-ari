/**
 * Sounds API resource
 */

import { BaseResource } from './base.js';
import type { HttpConnection } from '../connection.js';
import { toQueryParams } from '../connection.js';
import type { VersionCompat } from '../version.js';
import type { AriClient } from '../client.js';
import type { Sound, ListSoundsParams } from '../types/api.js';

/**
 * Sounds API - List available sounds
 */
export class SoundsResource extends BaseResource {
  constructor(client: AriClient, http: HttpConnection, version: VersionCompat) {
    super(client, http, version);
  }

  /**
   * List all sounds
   * @throws {AriHttpError} If the ARI request fails
   */
  async list(params?: ListSoundsParams): Promise<Sound[]> {
    return this.http.get<Sound[]>('/sounds', toQueryParams(params));
  }

  /**
   * Get a specific sound
   * @throws {AriHttpError} If the ARI request fails
   */
  async get(soundId: string): Promise<Sound> {
    return this.http.get<Sound>(`/sounds/${encodeURIComponent(soundId)}`);
  }
}
