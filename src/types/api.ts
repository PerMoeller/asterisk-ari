/**
 * API request and response types for Asterisk ARI
 *
 * This module contains all TypeScript type definitions for the Asterisk REST Interface (ARI).
 * These types correspond to the objects returned by the Asterisk ARI API.
 *
 * @packageDocumentation
 */

// ============================================================================
// Common Types
// ============================================================================

/**
 * Possible states of a channel in Asterisk.
 *
 * @remarks
 * These states correspond to the channel states in Asterisk's core:
 * - `Down` - Channel is down and available
 * - `Rsrvd` - Channel is reserved
 * - `OffHook` - Channel is off hook (receiver lifted)
 * - `Dialing` - Digits have been dialed
 * - `Ring` - Remote end is ringing
 * - `Ringing` - Local end is ringing
 * - `Up` - Channel is connected and active
 * - `Busy` - Line is busy
 * - `Dialing Offhook` - Dialing while off hook
 * - `Pre-ring` - Channel is about to ring
 * - `Unknown` - Unknown state
 */
export type ChannelState =
  | 'Down'
  | 'Rsrvd'
  | 'OffHook'
  | 'Dialing'
  | 'Ring'
  | 'Ringing'
  | 'Up'
  | 'Busy'
  | 'Dialing Offhook'
  | 'Pre-ring'
  | 'Unknown';

/**
 * Caller ID information for a channel.
 *
 * @example
 * ```typescript
 * const callerId: CallerId = {
 *   name: "John Doe",
 *   number: "+15551234567"
 * };
 * ```
 */
export interface CallerId {
  /** Display name of the caller */
  name: string;
  /** Phone number of the caller */
  number: string;
}

/**
 * Dialplan Context, Extension, and Priority (CEP) information.
 *
 * Represents the current or target position in the Asterisk dialplan.
 *
 * @example
 * ```typescript
 * const dialplan: DialplanCEP = {
 *   context: "default",
 *   exten: "100",
 *   priority: 1
 * };
 * ```
 */
export interface DialplanCEP {
  /** Dialplan context name */
  context: string;
  /** Dialplan extension (phone number or pattern) */
  exten: string;
  /** Priority number within the extension */
  priority: number;
  /** Application name currently executing (if any) */
  app_name?: string;
  /** Arguments passed to the dialplan application */
  app_data?: string;
}

/**
 * RTP (Real-time Transport Protocol) statistics for a channel.
 *
 * Contains detailed statistics about the RTP stream including packet counts,
 * jitter measurements, packet loss, and round-trip time metrics.
 *
 * @remarks
 * All jitter and RTT values are in milliseconds. Packet loss values are
 * cumulative counts of lost packets.
 */
export interface RTPstat {
  /** Number of packets transmitted */
  txcount: number;
  /** Number of packets received */
  rxcount: number;
  /** Jitter on transmitted packets (ms) */
  txjitter?: number;
  /** Jitter on received packets (ms) */
  rxjitter?: number;
  /** Maximum jitter reported by remote end (ms) */
  remote_maxjitter?: number;
  /** Minimum jitter reported by remote end (ms) */
  remote_minjitter?: number;
  /** Average jitter reported by remote end (ms) */
  remote_normdevjitter?: number;
  /** Standard deviation of jitter reported by remote end (ms) */
  remote_stdevjitter?: number;
  /** Maximum local jitter (ms) */
  local_maxjitter?: number;
  /** Minimum local jitter (ms) */
  local_minjitter?: number;
  /** Average local jitter (ms) */
  local_normdevjitter?: number;
  /** Standard deviation of local jitter (ms) */
  local_stdevjitter?: number;
  /** Number of transmitted packets lost */
  txploss: number;
  /** Number of received packets lost */
  rxploss: number;
  /** Maximum packet loss reported by remote end */
  remote_maxrxploss?: number;
  /** Minimum packet loss reported by remote end */
  remote_minrxploss?: number;
  /** Average packet loss reported by remote end */
  remote_normdevrxploss?: number;
  /** Standard deviation of packet loss reported by remote end */
  remote_stdevrxploss?: number;
  /** Maximum local packet loss */
  local_maxrxploss?: number;
  /** Minimum local packet loss */
  local_minrxploss?: number;
  /** Average local packet loss */
  local_normdevrxploss?: number;
  /** Standard deviation of local packet loss */
  local_stdevrxploss?: number;
  /** Current round-trip time (ms) */
  rtt?: number;
  /** Maximum round-trip time (ms) */
  maxrtt?: number;
  /** Minimum round-trip time (ms) */
  minrtt?: number;
  /** Average round-trip time (ms) */
  normdevrtt?: number;
  /** Standard deviation of round-trip time (ms) */
  stdevrtt?: number;
  /** Local SSRC (Synchronization Source identifier) */
  local_ssrc: number;
  /** Remote SSRC (Synchronization Source identifier) */
  remote_ssrc: number;
  /** Number of octets (bytes) transmitted */
  txoctetcount: number;
  /** Number of octets (bytes) received */
  rxoctetcount: number;
  /** Unique identifier for the channel */
  channel_uniqueid: string;
}

// ============================================================================
// Channel Types
// ============================================================================

/**
 * Represents an active channel in Asterisk.
 *
 * A channel is a connection between Asterisk and an endpoint (phone, trunk, etc.).
 * It carries audio/video data and can participate in bridges, playbacks, and recordings.
 *
 * @example
 * ```typescript
 * client.on('StasisStart', (event, channel) => {
 *   console.log(`Call from ${channel.caller.number} in state ${channel.state}`);
 *   channel.answer();
 * });
 * ```
 */
export interface Channel {
  /** Unique identifier for this channel */
  id: string;
  /** Channel name in Asterisk format (e.g., "PJSIP/endpoint-00000001") */
  name: string;
  /** Current state of the channel */
  state: ChannelState;
  /** Caller ID information for the calling party */
  caller: CallerId;
  /** Caller ID information for the connected party */
  connected: CallerId;
  /** Account code for billing purposes */
  accountcode: string;
  /** Current position in the dialplan */
  dialplan: DialplanCEP;
  /** ISO 8601 timestamp when the channel was created */
  creationtime: string;
  /** Language code for the channel (e.g., "en", "es") */
  language: string;
  /** Channel variables set on this channel */
  channelvars?: Record<string, string>;
  /**
   * Protocol-specific identifier (e.g., SIP Call-ID)
   * @since Asterisk 20+
   */
  protocol_id?: string;
}

/**
 * Parameters for originating (creating and dialing) a new channel.
 *
 * @remarks
 * You must specify either `extension` (to continue in dialplan) or `app` (to enter Stasis).
 *
 * @example
 * ```typescript
 * // Originate to a Stasis application
 * await client.channels.originate({
 *   endpoint: "PJSIP/1000",
 *   app: "my-app",
 *   callerId: "ARI <100>"
 * });
 *
 * // Originate to dialplan
 * await client.channels.originate({
 *   endpoint: "PJSIP/1000",
 *   context: "default",
 *   extension: "200",
 *   priority: 1
 * });
 * ```
 */
export interface OriginateParams {
  /**
   * Endpoint to dial (e.g., "PJSIP/1000", "SIP/trunk/5551234567")
   */
  endpoint: string;
  /** Extension to dial after channel answers (dialplan mode) */
  extension?: string;
  /** Dialplan context for the extension */
  context?: string;
  /** Priority within the extension */
  priority?: number;
  /** Label within the extension to jump to */
  label?: string;
  /** Stasis application name to enter (Stasis mode) */
  app?: string;
  /** Arguments to pass to the Stasis application */
  appArgs?: string;
  /** Caller ID to set on the outgoing channel (format: "Name <number>") */
  callerId?: string;
  /** Timeout in seconds before giving up on the call */
  timeout?: number;
  /** Specific channel ID to use (optional, auto-generated if not provided) */
  channelId?: string;
  /** Channel ID for the second leg in Local channel scenarios */
  otherChannelId?: string;
  /** Channel ID of the originating channel (for linked channels) */
  originator?: string;
  /** Comma-separated list of allowed codecs (e.g., "ulaw,alaw") */
  formats?: string;
  /** Channel variables to set on the new channel */
  variables?: Record<string, string>;
}

/**
 * Parameters for creating a channel without dialing.
 *
 * Creates a channel that can be dialed later using the `dial()` method.
 * Useful for setting up channels before initiating the call.
 */
export interface CreateChannelParams {
  /** Endpoint specification (e.g., "PJSIP/1000") */
  endpoint: string;
  /** Stasis application name for the channel */
  app: string;
  /** Arguments to pass to the Stasis application */
  appArgs?: string;
  /** Specific channel ID to use */
  channelId?: string;
  /** Channel ID for the second leg in Local channel scenarios */
  otherChannelId?: string;
  /** Channel ID of the originating channel */
  originator?: string;
  /** Comma-separated list of allowed codecs */
  formats?: string;
  /** Channel variables to set on the new channel */
  variables?: Record<string, string>;
}

/**
 * Parameters for hanging up a channel.
 */
export interface HangupParams {
  /**
   * Numeric hangup cause code (e.g., "16" for normal clearing)
   * @see https://wiki.asterisk.org/wiki/display/AST/Hangup+Cause+Mappings
   */
  reason_code?: string;
  /**
   * Text description of the hangup reason (e.g., "normal", "busy")
   */
  reason?: string;
}

/**
 * Parameters for continuing a channel in the dialplan.
 */
export interface ContinueParams {
  /** Dialplan context to continue in */
  context?: string;
  /** Extension to continue at */
  extension?: string;
  /** Priority to continue at */
  priority?: number;
  /** Label to jump to within the extension */
  label?: string;
}

/**
 * Parameters for moving a channel to a different Stasis application.
 */
export interface MoveParams {
  /** Target Stasis application name */
  app: string;
  /** Arguments to pass to the target application */
  appArgs?: string;
}

/**
 * Parameters for sending DTMF tones to a channel.
 *
 * @example
 * ```typescript
 * // Send a PIN code with proper timing
 * await channel.sendDTMF({
 *   dtmf: "1234#",
 *   between: 100,  // 100ms between digits
 *   duration: 200  // 200ms per digit
 * });
 * ```
 */
export interface DTMFParams {
  /** DTMF digits to send (0-9, A-D, *, #) */
  dtmf: string;
  /** Milliseconds to wait before sending the first digit */
  before?: number;
  /** Milliseconds to wait between each digit */
  between?: number;
  /** Duration of each digit in milliseconds */
  duration?: number;
  /** Milliseconds to wait after sending the last digit */
  after?: number;
}

/**
 * Parameters for playing media to a channel or bridge.
 *
 * @example
 * ```typescript
 * // Play a sound file
 * await channel.play({ media: "sound:hello-world" });
 *
 * // Play multiple files in sequence
 * await channel.play({
 *   media: ["sound:welcome", "sound:press-one"],
 *   lang: "en"
 * });
 *
 * // Play with offset for resuming
 * await channel.play({
 *   media: "sound:long-message",
 *   offsetms: 5000  // Start 5 seconds in
 * });
 * ```
 */
export interface PlayParams {
  /**
   * Media URI(s) to play. Supported schemes:
   * - `sound:` - Asterisk sound files
   * - `recording:` - Stored recordings
   * - `number:` - Say a number
   * - `digits:` - Say digits
   * - `characters:` - Spell characters
   * - `tone:` - Play a tone
   */
  media: string | string[];
  /** Language code for sound files (e.g., "en", "es") */
  lang?: string;
  /** Offset in milliseconds to start playback from */
  offsetms?: number;
  /** Milliseconds to skip forward/back when using playback controls */
  skipms?: number;
  /** Specific playback ID to use (for tracking) */
  playbackId?: string;
}

/**
 * Parameters for recording audio from a channel or bridge.
 *
 * @example
 * ```typescript
 * const recording = await channel.record({
 *   name: "voicemail-12345",
 *   format: "wav",
 *   maxDurationSeconds: 60,
 *   beep: true,
 *   terminateOn: "#"
 * });
 * ```
 */
export interface RecordParams {
  /** Name for the recording (will be used as filename) */
  name: string;
  /** Audio format (e.g., "wav", "ulaw", "gsm") */
  format: string;
  /** Maximum recording duration in seconds */
  maxDurationSeconds?: number;
  /** Stop recording after this many seconds of silence */
  maxSilenceSeconds?: number;
  /** Behavior if recording already exists */
  ifExists?: 'fail' | 'overwrite' | 'append';
  /** Play a beep before starting the recording */
  beep?: boolean;
  /** DTMF digits that terminate the recording (e.g., "#") */
  terminateOn?: string;
}

/**
 * Parameters for snooping (spying/whispering) on a channel.
 *
 * Creates a new channel that can listen to and/or speak to the target channel.
 *
 * @example
 * ```typescript
 * // Supervisor listening silently
 * const snoopChannel = await channel.snoop({
 *   spy: "both",
 *   whisper: "none",
 *   app: "supervisor-app"
 * });
 * ```
 */
export interface SnoopParams {
  /**
   * Direction to spy (listen) on:
   * - `none` - Don't listen
   * - `both` - Listen to both directions
   * - `out` - Listen to audio going out from the channel
   * - `in` - Listen to audio coming in to the channel
   */
  spy?: 'none' | 'both' | 'out' | 'in';
  /**
   * Direction to whisper (speak) to:
   * - `none` - Don't whisper
   * - `both` - Whisper to both parties
   * - `out` - Whisper only to remote party
   * - `in` - Whisper only to local channel
   */
  whisper?: 'none' | 'both' | 'out' | 'in';
  /** Stasis application for the snoop channel */
  app: string;
  /** Arguments to pass to the Stasis application */
  appArgs?: string;
  /** Specific channel ID for the snoop channel */
  snoopId?: string;
}

/**
 * Parameters for dialing a created channel.
 */
export interface DialParams {
  /** Channel ID of the calling channel (for caller ID purposes) */
  caller?: string;
  /** Timeout in seconds before giving up */
  timeout?: number;
}

/**
 * Parameters for creating an external media channel.
 *
 * External media allows connecting Asterisk audio to external
 * applications via RTP or AudioSocket protocols.
 *
 * @since Asterisk 18+
 *
 * @example
 * ```typescript
 * const channel = await client.channels.externalMedia({
 *   app: "my-app",
 *   external_host: "192.168.1.100:10000",
 *   format: "ulaw",
 *   encapsulation: "rtp",
 *   transport: "udp"
 * });
 * ```
 */
export interface ExternalMediaParams {
  /** Specific channel ID to use */
  channelId?: string;
  /** Stasis application name */
  app: string;
  /** External host and port (format: "host:port") */
  external_host: string;
  /** Protocol encapsulation type */
  encapsulation?: 'rtp' | 'audiosocket';
  /** Transport protocol */
  transport?: 'udp' | 'tcp';
  /** Connection type for TCP transport */
  connection_type?: 'client' | 'server';
  /** Audio codec format (e.g., "ulaw", "alaw", "slin16") */
  format: string;
  /** Audio direction */
  direction?: 'both' | 'read' | 'write';
  /** Additional protocol-specific data */
  data?: string;
  /** Channel variables to set */
  variables?: Record<string, string>;
}

// ============================================================================
// Bridge Types
// ============================================================================

/**
 * Type of bridge for different use cases.
 *
 * - `mixing` - Standard conference bridge (mixes audio from all participants)
 * - `holding` - Holding bridge (for music on hold, parking)
 * - `dtmf_events` - Bridge that generates DTMF events
 * - `proxy_media` - Media goes through Asterisk (required for some features)
 * - `video_sfu` - Selective Forwarding Unit for video (Asterisk 18+)
 * - `video_single` - Single video source bridge
 */
export type BridgeType = 'mixing' | 'holding' | 'dtmf_events' | 'proxy_media' | 'video_sfu' | 'video_single';

/**
 * Represents an active bridge in Asterisk.
 *
 * A bridge is a container that connects multiple channels together,
 * allowing audio/video to flow between them.
 *
 * @example
 * ```typescript
 * const bridge = await client.bridges.create({ type: "mixing" });
 * await bridge.addChannel({ channel: [channelA.id, channelB.id] });
 * ```
 */
export interface Bridge {
  /** Unique identifier for this bridge */
  id: string;
  /** Technology used for bridging (e.g., "simple_bridge", "native_rtp") */
  technology: string;
  /** Type of bridge */
  bridge_type: BridgeType;
  /** Bridge class (e.g., "base", "stasis") */
  bridge_class: string;
  /** Creator of the bridge (application name) */
  creator: string;
  /** Friendly name for the bridge */
  name: string;
  /** Array of channel IDs currently in the bridge */
  channels: string[];
  /** Video mode for the bridge */
  video_mode?: 'none' | 'talker' | 'single';
  /** Channel ID of the current video source */
  video_source_id?: string;
  /** ISO 8601 timestamp when the bridge was created */
  creationtime: string;
}

/**
 * Parameters for creating a bridge.
 *
 * @example
 * ```typescript
 * // Create a mixing bridge with custom ID
 * const bridge = await client.bridges.create({
 *   type: "mixing",
 *   bridgeId: "conference-room-1",
 *   name: "Conference Room 1"
 * });
 * ```
 */
export interface CreateBridgeParams {
  /**
   * Bridge type(s). Can be a single type or comma-separated list.
   * Multiple types combine behaviors (e.g., "mixing,dtmf_events").
   */
  type?: BridgeType | string;
  /** Specific bridge ID to use */
  bridgeId?: string;
  /** Friendly name for the bridge */
  name?: string;
}

/**
 * Parameters for adding channels to a bridge.
 *
 * @example
 * ```typescript
 * await bridge.addChannel({
 *   channel: ["channel-1", "channel-2"],
 *   role: "participant",
 *   mute: true
 * });
 * ```
 */
export interface AddChannelParams {
  /** Channel ID(s) to add to the bridge */
  channel: string | string[];
  /**
   * Role of the channel in the bridge.
   * Common values: "participant", "announcer"
   */
  role?: string;
  /** If true, DTMF from this channel won't be heard in the bridge */
  absorbDTMF?: boolean;
  /** If true, the channel joins muted */
  mute?: boolean;
  /** If true, don't update connected line information */
  inhibitConnectedLineUpdates?: boolean;
}

/**
 * Parameters for removing channels from a bridge.
 */
export interface RemoveChannelParams {
  /** Channel ID(s) to remove from the bridge */
  channel: string | string[];
}

/**
 * Parameters for playing media to a bridge.
 * @see PlayParams
 */
export interface PlayBridgeParams extends PlayParams {}

/**
 * Parameters for recording a bridge.
 * @see RecordParams
 */
export interface RecordBridgeParams extends RecordParams {}

// ============================================================================
// Endpoint Types
// ============================================================================

/**
 * State of an endpoint.
 *
 * - `unknown` - State cannot be determined
 * - `offline` - Endpoint is not registered/available
 * - `online` - Endpoint is registered and available
 */
export type EndpointState = 'unknown' | 'offline' | 'online';

/**
 * Represents an endpoint (phone, trunk, etc.) in Asterisk.
 *
 * An endpoint is a configured destination that can have multiple
 * active channels.
 */
export interface Endpoint {
  /** Channel technology (e.g., "PJSIP", "SIP", "IAX2") */
  technology: string;
  /** Endpoint resource name */
  resource: string;
  /** Current state of the endpoint */
  state: EndpointState;
  /** Array of active channel IDs for this endpoint */
  channel_ids: string[];
}

/**
 * Text message to be sent to an endpoint.
 *
 * @example
 * ```typescript
 * await client.endpoints.sendMessage("pjsip", "1000", {
 *   from: "pjsip:100",
 *   to: "pjsip:1000",
 *   body: "Hello from ARI!"
 * });
 * ```
 */
export interface TextMessage {
  /** Sender URI */
  from: string;
  /** Recipient URI */
  to: string;
  /** Message content */
  body: string;
  /** Additional message variables */
  variables?: Record<string, string>;
}

// ============================================================================
// Application Types
// ============================================================================

/**
 * Represents a Stasis application.
 *
 * A Stasis application is an ARI application that receives events
 * for channels, bridges, and other resources it controls.
 */
export interface Application {
  /** Name of the application */
  name: string;
  /** Channel IDs controlled by this application */
  channel_ids: string[];
  /** Bridge IDs controlled by this application */
  bridge_ids: string[];
  /** Endpoint IDs subscribed to by this application */
  endpoint_ids: string[];
  /** Device names subscribed to by this application */
  device_names: string[];
}

/**
 * Parameters for subscribing to event sources.
 */
export interface SubscribeParams {
  /**
   * Event source(s) to subscribe to.
   * Format: "resource:id" (e.g., "channel:12345", "bridge:conf-1")
   */
  eventSource: string | string[];
}

// ============================================================================
// Playback Types
// ============================================================================

/**
 * State of a playback operation.
 *
 * - `queued` - Playback is waiting to start
 * - `playing` - Playback is in progress
 * - `paused` - Playback is paused (can be resumed)
 * - `complete` - Playback finished successfully
 * - `failed` - Playback failed
 */
export type PlaybackState = 'queued' | 'playing' | 'paused' | 'complete' | 'failed';

/**
 * Represents an active playback operation.
 */
export interface Playback {
  /** Unique identifier for this playback */
  id: string;
  /** URI of the media being played */
  media_uri: string;
  /** URI of the next media to play (if queued) */
  next_media_uri?: string;
  /** URI of the target (channel or bridge) */
  target_uri: string;
  /** Language of the media */
  language: string;
  /** Current state of the playback */
  state: PlaybackState;
}

// ============================================================================
// Recording Types
// ============================================================================

/**
 * State of a recording operation.
 *
 * - `queued` - Recording is waiting to start
 * - `recording` - Recording is in progress
 * - `paused` - Recording is paused (can be resumed)
 * - `done` - Recording completed successfully
 * - `failed` - Recording failed
 * - `canceled` - Recording was canceled
 */
export type RecordingState = 'queued' | 'recording' | 'paused' | 'done' | 'failed' | 'canceled';

/**
 * Represents an active (live) recording.
 */
export interface LiveRecording {
  /** Name of the recording (filename without extension) */
  name: string;
  /** Audio format of the recording */
  format: string;
  /** Current state of the recording */
  state: RecordingState;
  /** URI of the target being recorded */
  target_uri: string;
  /** Total duration in seconds */
  duration?: number;
  /** Duration of non-silent audio in seconds */
  talking_duration?: number;
  /** Duration of silence in seconds */
  silence_duration?: number;
  /** Reason for failure (if state is 'failed') */
  cause?: string;
}

/**
 * Represents a stored recording on disk.
 */
export interface StoredRecording {
  /** Name of the recording (filename without extension) */
  name: string;
  /** Audio format of the recording */
  format: string;
}

/**
 * Parameters for copying a stored recording.
 */
export interface StoredRecordingCopyParams {
  /** Name for the destination recording */
  destinationRecordingName: string;
}

// ============================================================================
// Sound Types
// ============================================================================

/**
 * Represents a sound file available in Asterisk.
 */
export interface Sound {
  /** Sound identifier (used in play URIs) */
  id: string;
  /** Human-readable text description of the sound */
  text?: string;
  /** Available format/language combinations */
  formats: FormatLangPair[];
}

/**
 * A format and language combination for a sound file.
 */
export interface FormatLangPair {
  /** Language code (e.g., "en", "es") */
  language: string;
  /** Audio format (e.g., "wav", "gsm") */
  format: string;
}

/**
 * Parameters for listing sounds.
 */
export interface ListSoundsParams {
  /** Filter by language */
  lang?: string;
  /** Filter by format */
  format?: string;
}

// ============================================================================
// Mailbox Types
// ============================================================================

/**
 * Represents a voicemail mailbox.
 */
export interface Mailbox {
  /** Mailbox identifier */
  name: string;
  /** Number of old (read) messages */
  old_messages: number;
  /** Number of new (unread) messages */
  new_messages: number;
}

/**
 * Parameters for updating mailbox message counts.
 */
export interface UpdateMailboxParams {
  /** Number of old (read) messages */
  oldMessages: number;
  /** Number of new (unread) messages */
  newMessages: number;
}

// ============================================================================
// Device State Types
// ============================================================================

/**
 * Possible states for a device.
 *
 * - `UNKNOWN` - Device exists but state is unknown
 * - `NOT_INUSE` - Device is idle
 * - `INUSE` - Device is in use
 * - `BUSY` - Device is busy (all lines in use)
 * - `INVALID` - Device is invalid/not found
 * - `UNAVAILABLE` - Device is not available
 * - `RINGING` - Device is ringing
 * - `RINGINUSE` - Device is ringing while in use
 * - `ONHOLD` - Device is on hold
 */
export type DeviceState =
  | 'UNKNOWN'
  | 'NOT_INUSE'
  | 'INUSE'
  | 'BUSY'
  | 'INVALID'
  | 'UNAVAILABLE'
  | 'RINGING'
  | 'RINGINUSE'
  | 'ONHOLD';

/**
 * Represents a device state resource.
 */
export interface DeviceStateResource {
  /** Device name (e.g., "Stasis:mydevice") */
  name: string;
  /** Current state of the device */
  state: DeviceState;
}

// ============================================================================
// Asterisk System Types
// ============================================================================

/**
 * Asterisk system information.
 */
export interface AsteriskInfo {
  /** Build information */
  build?: BuildInfo;
  /** System information */
  system?: SystemInfo;
  /** Configuration information */
  config?: ConfigInfo;
  /** Current status information */
  status?: StatusInfo;
}

/**
 * Asterisk build information.
 */
export interface BuildInfo {
  /** Operating system name */
  os: string;
  /** Kernel version */
  kernel: string;
  /** Build options */
  options: string;
  /** Machine architecture */
  machine: string;
  /** Build date */
  date: string;
  /** User who built Asterisk */
  user: string;
}

/**
 * Asterisk system information.
 */
export interface SystemInfo {
  /** Asterisk version string */
  version: string;
  /** Entity ID for this Asterisk instance */
  entity_id: string;
}

/**
 * Asterisk configuration information.
 */
export interface ConfigInfo {
  /** System name */
  name: string;
  /** Default language */
  default_language: string;
  /** Maximum number of channels */
  max_channels?: number;
  /** Maximum number of open files */
  max_open_files?: number;
  /** Maximum load average */
  max_load?: number;
  /** User/group IDs Asterisk runs as */
  setid?: SetId;
}

/**
 * User and group ID information.
 */
export interface SetId {
  /** User ID/name */
  user: string;
  /** Group ID/name */
  group: string;
}

/**
 * Asterisk status information.
 */
export interface StatusInfo {
  /** ISO 8601 timestamp when Asterisk started */
  startup_time: string;
  /** ISO 8601 timestamp of last reload */
  last_reload_time: string;
}

/**
 * A channel variable value.
 */
export interface Variable {
  /** The variable's value */
  value: string;
}

/**
 * Asterisk module information.
 */
export interface Module {
  /** Module name */
  name: string;
  /** Module description */
  description: string;
  /** Number of uses of this module */
  use_count: number;
  /** Module status (e.g., "Running") */
  status: string;
  /** Support level (e.g., "core", "extended") */
  support_level: string;
}

/**
 * Asterisk log channel information.
 */
export interface LogChannel {
  /** Log channel name */
  channel: string;
  /** Log type */
  type: string;
  /** Log channel status */
  status: string;
  /** Log channel configuration */
  configuration: string;
}

// ============================================================================
// ARI Info Types
// ============================================================================

/**
 * ARI API information from the resources.json endpoint.
 * @internal
 */
export interface AriInfo {
  /** ARI API version */
  apiVersion: string;
  /** Swagger version */
  swaggerVersion: string;
  /** Base path for API calls */
  basePath: string;
  /** Resource path */
  resourcePath: string;
  /** Available API declarations */
  apis: ApiDeclaration[];
  /** Model definitions */
  models?: Record<string, unknown>;
}

/**
 * API declaration from resources.json.
 * @internal
 */
export interface ApiDeclaration {
  /** API path */
  path: string;
  /** API description */
  description?: string;
}

/**
 * Root resources.json structure.
 * @internal
 */
export interface ResourcesJson {
  /** ARI API version */
  apiVersion: string;
  /** Swagger version */
  swaggerVersion: string;
  /** Base path for API calls */
  basePath: string;
  /** Available APIs */
  apis: ApiListing[];
}

/**
 * API listing entry from resources.json.
 * @internal
 */
export interface ApiListing {
  /** API path */
  path: string;
  /** API description */
  description: string;
}
