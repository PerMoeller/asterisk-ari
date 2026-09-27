/**
 * Applications API resource
 */

import { BaseResource } from './base.js';
import type { HttpConnection } from '../connection.js';
import type { VersionCompat } from '../version.js';
import type { AriClient } from '../client.js';
import type { Application, ApplicationEventFilter, EventFilterEntry } from '../types/api.js';

/**
 * Applications API - Manage Stasis applications
 */
export class ApplicationsResource extends BaseResource {
  constructor(client: AriClient, http: HttpConnection, version: VersionCompat) {
    super(client, http, version);
  }

  /**
   * List all applications
   * @throws {AriHttpError} If the ARI request fails
   */
  async list(): Promise<Application[]> {
    return this.http.get<Application[]>('/applications');
  }

  /**
   * Get a specific application
   * @throws {AriHttpError} If the ARI request fails
   */
  async get(applicationName: string): Promise<Application> {
    return this.http.get<Application>(`/applications/${encodeURIComponent(applicationName)}`);
  }

  /**
   * Subscribe to events for specific resources
   * @throws {AriHttpError} If the ARI request fails
   */
  async subscribe(applicationName: string, eventSource: string | string[]): Promise<Application> {
    const sources = Array.isArray(eventSource) ? eventSource : [eventSource];

    return this.http.post<Application>(
      `/applications/${encodeURIComponent(applicationName)}/subscription`,
      undefined,
      { eventSource: sources }
    );
  }

  /**
   * Unsubscribe from events for specific resources
   * @throws {AriHttpError} If the ARI request fails
   */
  async unsubscribe(applicationName: string, eventSource: string | string[]): Promise<Application> {
    const sources = Array.isArray(eventSource) ? eventSource : [eventSource];

    return this.http.delete<Application>(
      `/applications/${encodeURIComponent(applicationName)}/subscription`,
      { eventSource: sources }
    );
  }

  /**
   * Filter application events for a specific event type.
   *
   * Call without a filter to reset it, so all events are sent again.
   *
   * @throws {AriHttpError} If the ARI request fails
   */
  async filter(applicationName: string, filter?: ApplicationEventFilter): Promise<Application> {
    // Asterisk only accepts filter entries as { type } objects; a bare string is a 400.
    const toEntries = (types?: (string | EventFilterEntry)[]): EventFilterEntry[] | undefined =>
      types?.map((entry) => (typeof entry === 'string' ? { type: entry } : entry));

    const body = filter
      ? { allowed: toEntries(filter.allowed), disallowed: toEntries(filter.disallowed) }
      : undefined;

    return this.http.put<Application>(
      `/applications/${encodeURIComponent(applicationName)}/eventFilter`,
      body
    );
  }
}
