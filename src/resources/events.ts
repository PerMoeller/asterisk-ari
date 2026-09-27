/**
 * Events API resource
 */

import { BaseResource } from './base.js';
import type { HttpConnection } from '../connection.js';
import type { VersionCompat } from '../version.js';
import type { AriClient } from '../client.js';
import type { UserEventParams } from '../types/api.js';

/**
 * Events API - Generate user events
 *
 * The events WebSocket itself is managed by the client; see `connect()`.
 */
export class EventsResource extends BaseResource {
  constructor(client: AriClient, http: HttpConnection, version: VersionCompat) {
    super(client, http, version);
  }

  /**
   * Generate a user event, delivered to the application as a ChannelUserevent event.
   *
   * @param eventName - Event name
   * @param params - Receiving application, event sources and variables
   * @throws {AriHttpError} If the ARI request fails (404 if the application is not found,
   *   422 if an event source is not found)
   *
   * @example
   * ```typescript
   * await client.events.userEvent('CallFlagged', {
   *   application: 'my-app',
   *   source: `channel:${channel.id}`,
   *   variables: { reason: 'vip' },
   * });
   * ```
   */
  async userEvent(eventName: string, params: UserEventParams): Promise<void> {
    const { application, source, variables } = params;

    return this.http.post<void>(
      `/events/user/${encodeURIComponent(eventName)}`,
      variables ? { variables } : undefined,
      { application, source }
    );
  }
}
