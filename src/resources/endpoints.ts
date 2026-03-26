/**
 * Endpoints API resource
 */

import { BaseResource } from './base.js';
import type { HttpConnection } from '../connection.js';
import type { VersionCompat } from '../version.js';
import type { AriClient } from '../client.js';
import type { Endpoint, TextMessage, ReferParams } from '../types/api.js';

/**
 * Endpoints API - Manage endpoints (phones, trunks, etc.)
 */
export class EndpointsResource extends BaseResource {
  constructor(client: AriClient, http: HttpConnection, version: VersionCompat) {
    super(client, http, version);
  }

  /**
   * List all endpoints
   * @throws {AriHttpError} If the ARI request fails
   */
  async list(): Promise<Endpoint[]> {
    return this.http.get<Endpoint[]>('/endpoints');
  }

  /**
   * Get all endpoints for a specific technology
   * @throws {AriHttpError} If the ARI request fails
   */
  async listByTech(tech: string): Promise<Endpoint[]> {
    return this.http.get<Endpoint[]>(`/endpoints/${encodeURIComponent(tech)}`);
  }

  /**
   * Get a specific endpoint
   * @throws {AriHttpError} If the ARI request fails
   */
  async get(tech: string, resource: string): Promise<Endpoint> {
    return this.http.get<Endpoint>(
      `/endpoints/${encodeURIComponent(tech)}/${encodeURIComponent(resource)}`
    );
  }

  /**
   * Send a message to a specific endpoint
   * @throws {AriHttpError} If the ARI request fails
   */
  async sendMessage(tech: string, resource: string, message: TextMessage): Promise<void> {
    const { from, body, variables } = message;

    return this.http.put<void>(
      `/endpoints/${encodeURIComponent(tech)}/${encodeURIComponent(resource)}/sendMessage`,
      variables ? { variables } : undefined,
      {
        from,
        body,
      }
    );
  }

  /**
   * Send a message to a specific endpoint (using endpoint reference)
   * @throws {AriHttpError} If the ARI request fails
   */
  async sendMessageToEndpoint(endpoint: string, message: TextMessage): Promise<void> {
    const { from, to, body, variables } = message;

    return this.http.put<void>(
      '/endpoints/sendMessage',
      variables ? { variables } : undefined,
      {
        to: endpoint,
        from,
        body,
      }
    );
  }

  /**
   * Refer a specific endpoint to some destination
   * @throws {AriHttpError} If the ARI request fails
   */
  async refer(tech: string, resource: string, params: ReferParams): Promise<void> {
    const { variables, ...rest } = params;
    const body = variables ? { variables } : undefined;

    return this.http.post<void>(
      `/endpoints/${encodeURIComponent(tech)}/${encodeURIComponent(resource)}/refer`,
      body,
      rest
    );
  }

  /**
   * Refer an endpoint to some destination (using endpoint reference)
   * @throws {AriHttpError} If the ARI request fails
   */
  async referToEndpoint(endpoint: string, params: ReferParams): Promise<void> {
    const { variables, ...rest } = params;
    const body = variables ? { variables } : undefined;

    return this.http.post<void>(
      '/endpoints/refer',
      body,
      { to: endpoint, ...rest }
    );
  }
}
