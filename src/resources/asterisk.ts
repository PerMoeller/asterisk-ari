/**
 * Asterisk system API resource
 */

import { BaseResource } from './base.js';
import type { HttpConnection } from '../connection.js';
import type { VersionCompat } from '../version.js';
import type { AsteriskInfo, Variable, Module, LogChannel } from '../types/api.js';

export type AsteriskInfoFilter = 'build' | 'system' | 'config' | 'status';

/**
 * Asterisk API - Manage Asterisk system resources
 */
export class AsteriskResource extends BaseResource {
  constructor(http: HttpConnection, version: VersionCompat) {
    super(http, version);
  }

  /**
   * Get Asterisk system information
   */
  async getInfo(only?: AsteriskInfoFilter[]): Promise<AsteriskInfo> {
    return this.http.get<AsteriskInfo>('/asterisk/info', {
      only: only?.join(','),
    });
  }

  /**
   * List Asterisk modules
   */
  async listModules(): Promise<Module[]> {
    return this.http.get<Module[]>('/asterisk/modules');
  }

  /**
   * Get a specific Asterisk module
   */
  async getModule(moduleName: string): Promise<Module> {
    return this.http.get<Module>(`/asterisk/modules/${encodeURIComponent(moduleName)}`);
  }

  /**
   * Load an Asterisk module
   */
  async loadModule(moduleName: string): Promise<void> {
    return this.http.post<void>(`/asterisk/modules/${encodeURIComponent(moduleName)}`);
  }

  /**
   * Unload an Asterisk module
   */
  async unloadModule(moduleName: string): Promise<void> {
    return this.http.delete<void>(`/asterisk/modules/${encodeURIComponent(moduleName)}`);
  }

  /**
   * Reload an Asterisk module
   */
  async reloadModule(moduleName: string): Promise<void> {
    return this.http.put<void>(`/asterisk/modules/${encodeURIComponent(moduleName)}`);
  }

  /**
   * List logging channels
   */
  async listLogChannels(): Promise<LogChannel[]> {
    return this.http.get<LogChannel[]>('/asterisk/logging');
  }

  /**
   * Add a logging channel
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
   */
  async deleteLogChannel(logChannelName: string): Promise<void> {
    return this.http.delete<void>(`/asterisk/logging/${encodeURIComponent(logChannelName)}`);
  }

  /**
   * Rotate a log channel
   */
  async rotateLogChannel(logChannelName: string): Promise<void> {
    return this.http.put<void>(`/asterisk/logging/${encodeURIComponent(logChannelName)}/rotate`);
  }

  /**
   * Get a global variable
   */
  async getGlobalVariable(variable: string): Promise<string> {
    const result = await this.http.get<Variable>('/asterisk/variable', { variable });
    return result.value;
  }

  /**
   * Set a global variable
   */
  async setGlobalVariable(variable: string, value?: string): Promise<void> {
    return this.http.post<void>('/asterisk/variable', undefined, { variable, value });
  }

  /**
   * Ping Asterisk
   */
  async ping(): Promise<{ ping: string; timestamp: string; asterisk_id: string }> {
    return this.http.get('/asterisk/ping');
  }
}
