/**
 * Version detection and compatibility layer
 */

import type { HttpConnection } from './connection.js';
import type { ResourcesJson } from './types/api.js';

/**
 * Parsed ARI version
 */
export interface AriVersion {
  /** ARI major version (corresponds to Asterisk version) */
  major: number;
  /** Breaking changes version */
  breaking: number;
  /** Non-breaking changes version */
  nonBreaking: number;
  /** Full version string */
  full: string;
}

/**
 * Asterisk version mapping from ARI version
 * ARI 4.x.x = Asterisk 16
 * ARI 5.x.x = Asterisk 17
 * ARI 6.x.x = Asterisk 18
 * ARI 7.x.x = Asterisk 19
 * ARI 8.x.x = Asterisk 20
 * ARI 9.x.x = Asterisk 21
 * ARI 10.x.x = Asterisk 22
 * ARI 11.x.x = Asterisk 23
 */
export function getAsteriskVersion(ariVersion: AriVersion): number {
  return ariVersion.major + 12;
}

/**
 * Parse ARI version string (e.g., "6.0.0")
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
 * Fetch ARI version from the server
 */
export async function fetchAriVersion(http: HttpConnection): Promise<AriVersion> {
  const resources = await http.get<ResourcesJson>('/api-docs/resources.json');
  return parseAriVersion(resources.apiVersion);
}

/**
 * Version compatibility checker
 */
export class VersionCompat {
  public readonly version: AriVersion;
  public readonly asteriskVersion: number;

  constructor(version: AriVersion) {
    this.version = version;
    this.asteriskVersion = getAsteriskVersion(version);
  }

  /**
   * Check if external media is supported (Asterisk 18+, ARI 6+)
   */
  get hasExternalMedia(): boolean {
    return this.version.major >= 6;
  }

  /**
   * Check if protocol_id field is available on channels (Asterisk 20+, ARI 8+)
   */
  get hasProtocolId(): boolean {
    return this.version.major >= 8;
  }

  /**
   * Check if tone detection events are supported (Asterisk 22+, ARI 10+)
   */
  get hasToneDetected(): boolean {
    return this.version.major >= 10;
  }

  /**
   * Check if tech-specific hangup cause is available (Asterisk 22.7+)
   */
  get hasTechCause(): boolean {
    // This was added in Asterisk 22.7, but we can't detect minor version
    // So we just check for ARI 10+
    return this.version.major >= 10;
  }

  /**
   * Check if transfer progress events are supported (Asterisk 22+, ARI 10+)
   */
  get hasTransferProgress(): boolean {
    return this.version.major >= 10;
  }

  /**
   * Check if video SFU bridge type is supported (Asterisk 18+)
   */
  get hasVideoSfuBridge(): boolean {
    return this.version.major >= 6;
  }

  /**
   * Check if channel move is supported (Asterisk 18+)
   */
  get hasChannelMove(): boolean {
    return this.version.major >= 6;
  }

  /**
   * Check if talking detection is supported
   */
  get hasTalkingDetection(): boolean {
    // Available since early ARI versions
    return true;
  }

  /**
   * Validate that a method is available for the current version
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
   * Get a human-readable version description
   */
  toString(): string {
    return `Asterisk ${this.asteriskVersion} (ARI ${this.version.full})`;
  }
}
