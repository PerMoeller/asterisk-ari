/**
 * Recordings API resource
 */

import { BaseResource } from './base.js';
import type { HttpConnection } from '../connection.js';
import { toQueryParams } from '../connection.js';
import type { VersionCompat } from '../version.js';
import type { AriClient } from '../client.js';
import type { StoredRecording, LiveRecording, StoredRecordingCopyParams } from '../types/api.js';

/**
 * Stored Recordings API
 */
export class StoredRecordingsResource extends BaseResource {
  constructor(client: AriClient, http: HttpConnection, version: VersionCompat) {
    super(client, http, version);
  }

  /**
   * List all stored recordings
   * @throws {AriHttpError} If the ARI request fails
   */
  async list(): Promise<StoredRecording[]> {
    return this.http.get<StoredRecording[]>('/recordings/stored');
  }

  /**
   * Get a stored recording's details
   * @throws {AriHttpError} If the ARI request fails
   */
  async get(recordingName: string): Promise<StoredRecording> {
    return this.http.get<StoredRecording>(
      `/recordings/stored/${encodeURIComponent(recordingName)}`
    );
  }

  /**
   * Get the file for a stored recording
   * @throws {AriHttpError} If the ARI request fails
   */
  async getFile(recordingName: string): Promise<ArrayBuffer> {
    return this.http.get<ArrayBuffer>(
      `/recordings/stored/${encodeURIComponent(recordingName)}/file`
    );
  }

  /**
   * Copy a stored recording
   * @throws {AriHttpError} If the ARI request fails
   */
  async copy(recordingName: string, params: StoredRecordingCopyParams): Promise<StoredRecording> {
    return this.http.post<StoredRecording>(
      `/recordings/stored/${encodeURIComponent(recordingName)}/copy`,
      undefined,
      toQueryParams(params)
    );
  }

  /**
   * Delete a stored recording
   * @throws {AriHttpError} If the ARI request fails
   */
  async delete(recordingName: string): Promise<void> {
    return this.http.delete<void>(`/recordings/stored/${encodeURIComponent(recordingName)}`);
  }
}

/**
 * Live Recordings API
 */
export class LiveRecordingsResource extends BaseResource {
  constructor(client: AriClient, http: HttpConnection, version: VersionCompat) {
    super(client, http, version);
  }

  /**
   * Get a live recording's details
   * @throws {AriHttpError} If the ARI request fails
   */
  async get(recordingName: string): Promise<LiveRecording> {
    return this.http.get<LiveRecording>(
      `/recordings/live/${encodeURIComponent(recordingName)}`
    );
  }

  /**
   * Stop and store a live recording
   * @throws {AriHttpError} If the ARI request fails
   */
  async stop(recordingName: string): Promise<void> {
    return this.http.post<void>(
      `/recordings/live/${encodeURIComponent(recordingName)}/stop`
    );
  }

  /**
   * Pause a live recording
   * @throws {AriHttpError} If the ARI request fails
   */
  async pause(recordingName: string): Promise<void> {
    return this.http.post<void>(
      `/recordings/live/${encodeURIComponent(recordingName)}/pause`
    );
  }

  /**
   * Unpause a live recording
   * @throws {AriHttpError} If the ARI request fails
   */
  async unpause(recordingName: string): Promise<void> {
    return this.http.delete<void>(
      `/recordings/live/${encodeURIComponent(recordingName)}/pause`
    );
  }

  /**
   * Mute a live recording
   * @throws {AriHttpError} If the ARI request fails
   */
  async mute(recordingName: string): Promise<void> {
    return this.http.post<void>(
      `/recordings/live/${encodeURIComponent(recordingName)}/mute`
    );
  }

  /**
   * Unmute a live recording
   * @throws {AriHttpError} If the ARI request fails
   */
  async unmute(recordingName: string): Promise<void> {
    return this.http.delete<void>(
      `/recordings/live/${encodeURIComponent(recordingName)}/mute`
    );
  }

  /**
   * Cancel and discard a live recording
   * @throws {AriHttpError} If the ARI request fails
   */
  async cancel(recordingName: string): Promise<void> {
    return this.http.delete<void>(
      `/recordings/live/${encodeURIComponent(recordingName)}`
    );
  }
}

/**
 * Combined Recordings API
 */
export class RecordingsResource {
  public readonly stored: StoredRecordingsResource;
  public readonly live: LiveRecordingsResource;

  constructor(client: AriClient, http: HttpConnection, version: VersionCompat) {
    this.stored = new StoredRecordingsResource(client, http, version);
    this.live = new LiveRecordingsResource(client, http, version);
  }
}
