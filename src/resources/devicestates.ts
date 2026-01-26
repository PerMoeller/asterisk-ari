/**
 * Device States API resource
 */

import { BaseResource } from './base.js';
import type { HttpConnection } from '../connection.js';
import type { VersionCompat } from '../version.js';
import type { DeviceStateResource, DeviceState } from '../types/api.js';

/**
 * Device States API - Manage device states
 */
export class DeviceStatesResource extends BaseResource {
  constructor(http: HttpConnection, version: VersionCompat) {
    super(http, version);
  }

  /**
   * List all device states
   */
  async list(): Promise<DeviceStateResource[]> {
    return this.http.get<DeviceStateResource[]>('/deviceStates');
  }

  /**
   * Get a specific device state
   */
  async get(deviceName: string): Promise<DeviceStateResource> {
    return this.http.get<DeviceStateResource>(
      `/deviceStates/${encodeURIComponent(deviceName)}`
    );
  }

  /**
   * Update a device state
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
   */
  async delete(deviceName: string): Promise<void> {
    return this.http.delete<void>(`/deviceStates/${encodeURIComponent(deviceName)}`);
  }
}
