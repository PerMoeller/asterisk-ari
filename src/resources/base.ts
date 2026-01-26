/**
 * Base resource class for API resources
 */

import type { HttpConnection } from '../connection.js';
import type { VersionCompat } from '../version.js';

/**
 * Base class for ARI API resources
 */
export abstract class BaseResource {
  protected readonly http: HttpConnection;
  protected readonly version: VersionCompat;

  constructor(http: HttpConnection, version: VersionCompat) {
    this.http = http;
    this.version = version;
  }

  /**
   * Check if a method is available for the current Asterisk version
   */
  protected validateVersion(method: string): void {
    this.version.validateMethod(method);
  }
}
