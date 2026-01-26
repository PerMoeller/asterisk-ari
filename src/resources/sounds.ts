/**
 * Sounds API resource
 */

import { BaseResource } from './base.js';
import type { HttpConnection } from '../connection.js';
import { toQueryParams } from '../connection.js';
import type { VersionCompat } from '../version.js';
import type { Sound, ListSoundsParams } from '../types/api.js';

/**
 * Sounds API - List available sounds
 */
export class SoundsResource extends BaseResource {
  constructor(http: HttpConnection, version: VersionCompat) {
    super(http, version);
  }

  /**
   * List all sounds
   */
  async list(params?: ListSoundsParams): Promise<Sound[]> {
    return this.http.get<Sound[]>('/sounds', toQueryParams(params));
  }

  /**
   * Get a specific sound
   */
  async get(soundId: string): Promise<Sound> {
    return this.http.get<Sound>(`/sounds/${encodeURIComponent(soundId)}`);
  }
}
