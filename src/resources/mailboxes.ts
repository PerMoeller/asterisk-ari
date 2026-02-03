/**
 * Mailboxes API resource
 */

import { BaseResource } from './base.js';
import type { HttpConnection } from '../connection.js';
import { toQueryParams } from '../connection.js';
import type { VersionCompat } from '../version.js';
import type { AriClient } from '../client.js';
import type { Mailbox, UpdateMailboxParams } from '../types/api.js';

/**
 * Mailboxes API - Manage voicemail mailboxes
 */
export class MailboxesResource extends BaseResource {
  constructor(client: AriClient, http: HttpConnection, version: VersionCompat) {
    super(client, http, version);
  }

  /**
   * List all mailboxes
   * @throws {AriHttpError} If the ARI request fails
   */
  async list(): Promise<Mailbox[]> {
    return this.http.get<Mailbox[]>('/mailboxes');
  }

  /**
   * Get a specific mailbox
   * @throws {AriHttpError} If the ARI request fails
   */
  async get(mailboxName: string): Promise<Mailbox> {
    return this.http.get<Mailbox>(`/mailboxes/${encodeURIComponent(mailboxName)}`);
  }

  /**
   * Update a mailbox
   * @throws {AriHttpError} If the ARI request fails
   */
  async update(mailboxName: string, params: UpdateMailboxParams): Promise<void> {
    return this.http.put<void>(
      `/mailboxes/${encodeURIComponent(mailboxName)}`,
      undefined,
      toQueryParams(params)
    );
  }

  /**
   * Delete a mailbox
   * @throws {AriHttpError} If the ARI request fails
   */
  async delete(mailboxName: string): Promise<void> {
    return this.http.delete<void>(`/mailboxes/${encodeURIComponent(mailboxName)}`);
  }
}
