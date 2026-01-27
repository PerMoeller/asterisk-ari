/**
 * Version detection and compatibility layer
 *
 * This module provides version detection for Asterisk ARI and feature
 * compatibility checking based on the detected version.
 *
 * @packageDocumentation
 */

import type { HttpConnection } from './connection.js';
import type { ResourcesJson } from './types/api.js';

/**
 * Parsed ARI version information.
 *
 * ARI uses semantic versioning where:
 * - Major version corresponds to Asterisk version (ARI 6 = Asterisk 18)
 * - Breaking version indicates breaking API changes
 * - Non-breaking version indicates backwards-compatible changes
 *
 * @example
 * ```typescript
 * const version: AriVersion = {
 *   major: 8,
 *   breaking: 0,
 *   nonBreaking: 0,
 *   full: '8.0.0'
 * };
 * // This is ARI 8.0.0, which corresponds to Asterisk 20
 * ```
 */
export interface AriVersion {
  /** ARI major version (corresponds to Asterisk version minus 12) */
  major: number;
  /** Breaking changes version within the major version */
  breaking: number;
  /** Non-breaking changes version */
  nonBreaking: number;
  /** Full version string (e.g., "8.0.0") */
  full: string;
}

/**
 * Calculate the Asterisk version from an ARI version.
 *
 * The mapping is: Asterisk version = ARI major + 12
 *
 * | ARI Version | Asterisk Version |
 * |-------------|------------------|
 * | 4.x.x       | 16               |
 * | 5.x.x       | 17               |
 * | 6.x.x       | 18               |
 * | 7.x.x       | 19               |
 * | 8.x.x       | 20               |
 * | 9.x.x       | 21               |
 * | 10.x.x      | 22               |
 * | 11.x.x      | 23               |
 *
 * @param ariVersion - The parsed ARI version
 * @returns The corresponding Asterisk major version number
 *
 * @example
 * ```typescript
 * const asteriskVersion = getAsteriskVersion({ major: 8, ... });
 * console.log(asteriskVersion); // 20
 * ```
 */
export function getAsteriskVersion(ariVersion: AriVersion): number {
  return ariVersion.major + 12;
}

/**
 * Parse an ARI version string into its components.
 *
 * @param versionString - Version string in format "major.breaking.nonBreaking"
 * @returns Parsed ARI version object
 * @throws {Error} If the version string format is invalid
 *
 * @example
 * ```typescript
 * const version = parseAriVersion('8.0.0');
 * console.log(version.major); // 8
 * ```
 */
export function parseAriVersion(versionString: string): AriVersion {
  const parts = versionString.split('.');
  if (parts.length < 3) {
    throw new Error(`Invalid ARI version format: ${versionString}`);
  }

  return {
    major: parseInt(parts[0]!, 10),
    breaking: parseInt(parts[1]!, 10),
    nonBreaking: parseInt(parts[2]!, 10),
    full: versionString,
  };
}

/**
 * Fetch the ARI version from the Asterisk server.
 *
 * Queries the `/api-docs/resources.json` endpoint to get the API version.
 *
 * @param http - HTTP connection to use
 * @returns Promise resolving to the parsed ARI version
 * @throws {AriHttpError} If the request fails
 *
 * @example
 * ```typescript
 * const version = await fetchAriVersion(http);
 * console.log(`ARI ${version.full}`); // "ARI 8.0.0"
 * ```
 */
export async function fetchAriVersion(http: HttpConnection): Promise<AriVersion> {
  const resources = await http.get<ResourcesJson>('/api-docs/resources.json');
  return parseAriVersion(resources.apiVersion);
}

/**
 * Version compatibility checker for Asterisk features.
 *
 * Provides boolean flags to check if specific features are available
 * in the connected Asterisk version. Use this to conditionally enable
 * features based on server capabilities.
 *
 * @example
 * ```typescript
 * const client = await connect({ ... });
 *
 * // Check version
 * console.log(client.version.toString());
 * // "Asterisk 20 (ARI 8.0.0)"
 *
 * // Check feature availability
 * if (client.version.hasExternalMedia) {
 *   await client.channels.externalMedia({ ... });
 * }
 *
 * if (client.version.hasProtocolId) {
 *   console.log(`SIP Call-ID: ${channel.protocol_id}`);
 * }
 * ```
 */
export class VersionCompat {
  /** The parsed ARI version */
  public readonly version: AriVersion;
  /** The corresponding Asterisk major version number */
  public readonly asteriskVersion: number;

  /**
   * Create a version compatibility checker.
   *
   * @param version - Parsed ARI version from the server
   */
  constructor(version: AriVersion) {
    this.version = version;
    this.asteriskVersion = getAsteriskVersion(version);
  }

  /**
   * Check if external media channels are supported.
   *
   * External media allows connecting Asterisk audio to external
   * applications via RTP or AudioSocket.
   *
   * @returns `true` if supported (Asterisk 18+, ARI 6+)
   */
  get hasExternalMedia(): boolean {
    return this.version.major >= 6;
  }

  /**
   * Check if the protocol_id field is available on channels.
   *
   * The protocol_id contains protocol-specific identifiers like
   * SIP Call-ID for SIP channels.
   *
   * @returns `true` if supported (Asterisk 20+, ARI 8+)
   */
  get hasProtocolId(): boolean {
    return this.version.major >= 8;
  }

  /**
   * Check if tone detection events are supported.
   *
   * Enables ChannelToneDetected events for detecting specific tones.
   *
   * @returns `true` if supported (Asterisk 22+, ARI 10+)
   */
  get hasToneDetected(): boolean {
    return this.version.major >= 10;
  }

  /**
   * Check if technology-specific hangup cause is available.
   *
   * Provides more detailed hangup cause information for specific
   * channel technologies (SIP, PJSIP, etc.).
   *
   * @returns `true` if supported (Asterisk 22.7+, ARI 10+)
   */
  get hasTechCause(): boolean {
    // This was added in Asterisk 22.7, but we can't detect minor version
    // So we just check for ARI 10+
    return this.version.major >= 10;
  }

  /**
   * Check if transfer progress events are supported.
   *
   * Provides ChannelTransfer events during call transfers.
   *
   * @returns `true` if supported (Asterisk 22+, ARI 10+)
   */
  get hasTransferProgress(): boolean {
    return this.version.major >= 10;
  }

  /**
   * Check if video SFU bridge type is supported.
   *
   * Selective Forwarding Unit bridges for video conferencing.
   *
   * @returns `true` if supported (Asterisk 18+, ARI 6+)
   */
  get hasVideoSfuBridge(): boolean {
    return this.version.major >= 6;
  }

  /**
   * Check if channel move is supported.
   *
   * Allows moving channels between Stasis applications.
   *
   * @returns `true` if supported (Asterisk 18+, ARI 6+)
   */
  get hasChannelMove(): boolean {
    return this.version.major >= 6;
  }

  /**
   * Check if talking detection is supported.
   *
   * Enables ChannelTalkingStarted and ChannelTalkingFinished events.
   *
   * @returns `true` (supported since early ARI versions)
   */
  get hasTalkingDetection(): boolean {
    // Available since early ARI versions
    return true;
  }

  /**
   * Validate that a method is available for the current version.
   *
   * Throws an error if the method requires a higher Asterisk version
   * than what is connected.
   *
   * @param method - Method name to validate
   * @throws {Error} If the method is not available in the current version
   *
   * @internal
   */
  validateMethod(method: string): void {
    const requirements: Record<string, { check: boolean; minAsterisk: string }> = {
      externalMedia: { check: this.hasExternalMedia, minAsterisk: '18' },
      move: { check: this.hasChannelMove, minAsterisk: '18' },
    };

    const requirement = requirements[method];
    if (requirement && !requirement.check) {
      throw new Error(
        `Method '${method}' requires Asterisk ${requirement.minAsterisk}+ ` +
        `(current: Asterisk ${this.asteriskVersion}, ARI ${this.version.full})`
      );
    }
  }

  /**
   * Get a human-readable version description.
   *
   * @returns String in format "Asterisk XX (ARI X.X.X)"
   *
   * @example
   * ```typescript
   * console.log(version.toString());
   * // "Asterisk 20 (ARI 8.0.0)"
   * ```
   */
  toString(): string {
    return `Asterisk ${this.asteriskVersion} (ARI ${this.version.full})`;
  }
}
