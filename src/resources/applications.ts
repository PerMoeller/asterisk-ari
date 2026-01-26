/**
 * Applications API resource
 */

import { BaseResource } from './base.js';
import type { HttpConnection } from '../connection.js';
import type { VersionCompat } from '../version.js';
import type { Application } from '../types/api.js';

/**
 * Applications API - Manage Stasis applications
 */
export class ApplicationsResource extends BaseResource {
  constructor(http: HttpConnection, version: VersionCompat) {
    super(http, version);
  }

  /**
   * List all applications
   */
  async list(): Promise<Application[]> {
    return this.http.get<Application[]>('/applications');
  }

  /**
   * Get a specific application
   */
  async get(applicationName: string): Promise<Application> {
    return this.http.get<Application>(`/applications/${encodeURIComponent(applicationName)}`);
  }

  /**
   * Subscribe to events for specific resources
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
   */
  async unsubscribe(applicationName: string, eventSource: string | string[]): Promise<Application> {
    const sources = Array.isArray(eventSource) ? eventSource : [eventSource];

    return this.http.delete<Application>(
      `/applications/${encodeURIComponent(applicationName)}/subscription`,
      { eventSource: sources }
    );
  }

  /**
   * Filter application events for a specific event type
   */
  async filter(applicationName: string, filter?: { allowed?: string[]; disallowed?: string[] }): Promise<Application> {
    return this.http.put<Application>(
      `/applications/${encodeURIComponent(applicationName)}/eventFilter`,
      filter
    );
  }
}
