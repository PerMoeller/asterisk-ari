/**
 * Asterisk system API resource
 */

import { BaseResource } from './base.js';
import type { HttpConnection } from '../connection.js';
import type { VersionCompat } from '../version.js';
import type { AriClient } from '../client.js';
import type { AsteriskInfo, Variable, Module, LogChannel } from '../types/api.js';

export type AsteriskInfoFilter = 'build' | 'system' | 'config' | 'status';

/**
 * Asterisk API - Manage Asterisk system resources
 */
export class AsteriskResource extends BaseResource {
  constructor(client: AriClient, http: HttpConnection, version: VersionCompat) {
    super(client, http, version);
  }

  /**
   * Get Asterisk system information
   * @throws {AriHttpError} If the ARI request fails
   */
  async getInfo(only?: AsteriskInfoFilter[]): Promise<AsteriskInfo> {
    return this.http.get<AsteriskInfo>('/asterisk/info', {
      only: only?.join(','),
    });
  }

  /**
   * List Asterisk modules
   * @throws {AriHttpError} If the ARI request fails
   */
  async listModules(): Promise<Module[]> {
    return this.http.get<Module[]>('/asterisk/modules');
  }

  /**
   * Get a specific Asterisk module
   * @throws {AriHttpError} If the ARI request fails
   */
  async getModule(moduleName: string): Promise<Module> {
    return this.http.get<Module>(`/asterisk/modules/${encodeURIComponent(moduleName)}`);
  }

  /**
   * Load an Asterisk module
   * @throws {AriHttpError} If the ARI request fails
   */
  async loadModule(moduleName: string): Promise<void> {
    return this.http.post<void>(`/asterisk/modules/${encodeURIComponent(moduleName)}`);
  }

  /**
   * Unload an Asterisk module
   * @throws {AriHttpError} If the ARI request fails
   */
  async unloadModule(moduleName: string): Promise<void> {
    return this.http.delete<void>(`/asterisk/modules/${encodeURIComponent(moduleName)}`);
  }

  /**
   * Reload an Asterisk module
   * @throws {AriHttpError} If the ARI request fails
   */
  async reloadModule(moduleName: string): Promise<void> {
    return this.http.put<void>(`/asterisk/modules/${encodeURIComponent(moduleName)}`);
  }

  /**
   * List logging channels
   * @throws {AriHttpError} If the ARI request fails
   */
  async listLogChannels(): Promise<LogChannel[]> {
    return this.http.get<LogChannel[]>('/asterisk/logging');
  }

  /**
   * Add a logging channel
   * @throws {AriHttpError} If the ARI request fails
   */
  async addLogChannel(logChannelName: string, configuration: string): Promise<void> {
    return this.http.post<void>(
      `/asterisk/logging/${encodeURIComponent(logChannelName)}`,
      undefined,
      { configuration }
    );
  }

  /**
   * Delete a logging channel
   * @throws {AriHttpError} If the ARI request fails
   */
  async deleteLogChannel(logChannelName: string): Promise<void> {
    return this.http.delete<void>(`/asterisk/logging/${encodeURIComponent(logChannelName)}`);
  }

  /**
   * Rotate a log channel
   * @throws {AriHttpError} If the ARI request fails
   */
  async rotateLogChannel(logChannelName: string): Promise<void> {
    return this.http.put<void>(`/asterisk/logging/${encodeURIComponent(logChannelName)}/rotate`);
  }

  /**
   * Get a global variable
   * @throws {AriHttpError} If the ARI request fails
   */
  async getGlobalVariable(variable: string): Promise<string> {
    const result = await this.http.get<Variable>('/asterisk/variable', { variable });
    return result.value;
  }

  /**
   * Set a global variable
   * @throws {AriHttpError} If the ARI request fails
   */
  async setGlobalVariable(variable: string, value?: string): Promise<void> {
    return this.http.post<void>('/asterisk/variable', undefined, { variable, value });
  }

  /**
   * Ping Asterisk
   * @throws {AriHttpError} If the ARI request fails
   */
  async ping(): Promise<{ ping: string; timestamp: string; asterisk_id: string }> {
    return this.http.get('/asterisk/ping');
  }
}
