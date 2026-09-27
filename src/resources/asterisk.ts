/**
 * Asterisk system API resource
 */

import { BaseResource } from './base.js';
import type { HttpConnection } from '../connection.js';
import type { VersionCompat } from '../version.js';
import type { AriClient } from '../client.js';
import type { AsteriskInfo, AsteriskPing, Variable, Module, LogChannel, ConfigTuple } from '../types/api.js';

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
  async ping(): Promise<AsteriskPing> {
    return this.http.get<AsteriskPing>('/asterisk/ping');
  }

  /**
   * Retrieve a dynamic configuration object (sorcery), e.g. a PJSIP endpoint.
   *
   * @param configClass - Configuration class (module), e.g. "res_pjsip"
   * @param objectType - Object type, e.g. "endpoint", "aor", "auth"
   * @param id - Object id
   * @throws {AriHttpError} If the ARI request fails (404 if not found)
   *
   * @example
   * ```typescript
   * const fields = await client.asterisk.getObject('res_pjsip', 'endpoint', 'alice');
   * ```
   */
  async getObject(configClass: string, objectType: string, id: string): Promise<ConfigTuple[]> {
    return this.http.get<ConfigTuple[]>(this.configObjectPath(configClass, objectType, id));
  }

  /**
   * Create or update a dynamic configuration object.
   *
   * The object type must be backed by a writable sorcery wizard (e.g. "astdb" or
   * "memory") for this to succeed.
   *
   * @param configClass - Configuration class (module), e.g. "res_pjsip"
   * @param objectType - Object type, e.g. "endpoint", "aor", "auth"
   * @param id - Object id
   * @param fields - Fields to set. May be omitted when creating an object with defaults.
   * @returns The object's fields after the update
   * @throws {AriHttpError} If the ARI request fails
   *
   * @example
   * ```typescript
   * await client.asterisk.updateObject('res_pjsip', 'endpoint', 'alice', [
   *   { attribute: 'allow', value: 'ulaw' },
   *   { attribute: 'aors', value: 'alice' },
   * ]);
   * ```
   */
  async updateObject(
    configClass: string,
    objectType: string,
    id: string,
    fields?: ConfigTuple[]
  ): Promise<ConfigTuple[]> {
    return this.http.put<ConfigTuple[]>(
      this.configObjectPath(configClass, objectType, id),
      fields ? { fields } : undefined
    );
  }

  /**
   * Delete a dynamic configuration object.
   *
   * @param configClass - Configuration class (module), e.g. "res_pjsip"
   * @param objectType - Object type, e.g. "endpoint", "aor", "auth"
   * @param id - Object id
   * @throws {AriHttpError} If the ARI request fails
   */
  async deleteObject(configClass: string, objectType: string, id: string): Promise<void> {
    return this.http.delete<void>(this.configObjectPath(configClass, objectType, id));
  }

  private configObjectPath(configClass: string, objectType: string, id: string): string {
    return `/asterisk/config/dynamic/${encodeURIComponent(configClass)}/` +
      `${encodeURIComponent(objectType)}/${encodeURIComponent(id)}`;
  }
}
