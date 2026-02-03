/**
 * Device States API resource
 */

import { BaseResource } from './base.js';
import type { HttpConnection } from '../connection.js';
import type { VersionCompat } from '../version.js';
import type { AriClient } from '../client.js';
import type { DeviceStateResource, DeviceState } from '../types/api.js';

/**
 * Device States API - Manage device states
 */
export class DeviceStatesResource extends BaseResource {
  constructor(client: AriClient, http: HttpConnection, version: VersionCompat) {
    super(client, http, version);
  }

  /**
   * List all device states
   * @throws {AriHttpError} If the ARI request fails
   */
  async list(): Promise<DeviceStateResource[]> {
    return this.http.get<DeviceStateResource[]>('/deviceStates');
  }

  /**
   * Get a specific device state
   * @throws {AriHttpError} If the ARI request fails
   */
  async get(deviceName: string): Promise<DeviceStateResource> {
    return this.http.get<DeviceStateResource>(
      `/deviceStates/${encodeURIComponent(deviceName)}`
    );
  }

  /**
   * Update a device state
   * @throws {AriHttpError} If the ARI request fails
   */
  async update(deviceName: string, deviceState: DeviceState): Promise<void> {
    return this.http.put<void>(
      `/deviceStates/${encodeURIComponent(deviceName)}`,
      undefined,
      { deviceState }
    );
  }

  /**
   * Delete a device state
   * @throws {AriHttpError} If the ARI request fails
   */
  async delete(deviceName: string): Promise<void> {
    return this.http.delete<void>(`/deviceStates/${encodeURIComponent(deviceName)}`);
  }
}
