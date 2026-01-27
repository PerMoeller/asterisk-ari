/**
 * Endpoints API resource
 */

import { BaseResource } from './base.js';
import type { HttpConnection } from '../connection.js';
import type { VersionCompat } from '../version.js';
import type { AriClient } from '../client.js';
import type { Endpoint, TextMessage } from '../types/api.js';

/**
 * Endpoints API - Manage endpoints (phones, trunks, etc.)
 */
export class EndpointsResource extends BaseResource {
  constructor(client: AriClient, http: HttpConnection, version: VersionCompat) {
    super(client, http, version);
  }

  /**
   * List all endpoints
   */
  async list(): Promise<Endpoint[]> {
    return this.http.get<Endpoint[]>('/endpoints');
  }

  /**
   * Get all endpoints for a specific technology
   */
  async listByTech(tech: string): Promise<Endpoint[]> {
    return this.http.get<Endpoint[]>(`/endpoints/${encodeURIComponent(tech)}`);
  }

  /**
   * Get a specific endpoint
   */
  async get(tech: string, resource: string): Promise<Endpoint> {
    return this.http.get<Endpoint>(
      `/endpoints/${encodeURIComponent(tech)}/${encodeURIComponent(resource)}`
    );
  }

  /**
   * Send a message to a specific endpoint
   */
  async sendMessage(tech: string, resource: string, message: TextMessage): Promise<void> {
    const { from, to, body, variables } = message;

    return this.http.put<void>(
      `/endpoints/${encodeURIComponent(tech)}/${encodeURIComponent(resource)}/sendMessage`,
      undefined,
      {
        from,
        to,
        body,
        variables: variables ? JSON.stringify(variables) : undefined,
      }
    );
  }

  /**
   * Send a message to a specific endpoint (using endpoint reference)
   */
  async sendMessageToEndpoint(endpoint: string, message: TextMessage): Promise<void> {
    const { from, to, body, variables } = message;

    return this.http.put<void>(
      '/endpoints/sendMessage',
      undefined,
      {
        to: endpoint,
        from,
        body,
        variables: variables ? JSON.stringify(variables) : undefined,
      }
    );
  }

  /**
   * Refer an endpoint to some destination
   */
  async refer(tech: string, resource: string, to: string, toSelf?: boolean): Promise<void> {
    return this.http.post<void>(
      `/endpoints/${encodeURIComponent(tech)}/${encodeURIComponent(resource)}/refer`,
      undefined,
      { to, to_self: toSelf }
    );
  }
}
