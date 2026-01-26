/**
 * API request and response types for Asterisk ARI
 */

// ============================================================================
// Common Types
// ============================================================================

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

export interface CallerId {
  name: string;
  number: string;
}

export interface DialplanCEP {
  context: string;
  exten: string;
  priority: number;
  app_name?: string;
  app_data?: string;
}

export interface RTPstat {
  txcount: number;
  rxcount: number;
  txjitter?: number;
  rxjitter?: number;
  remote_maxjitter?: number;
  remote_minjitter?: number;
  remote_normdevjitter?: number;
  remote_stdevjitter?: number;
  local_maxjitter?: number;
  local_minjitter?: number;
  local_normdevjitter?: number;
  local_stdevjitter?: number;
  txploss: number;
  rxploss: number;
  remote_maxrxploss?: number;
  remote_minrxploss?: number;
  remote_normdevrxploss?: number;
  remote_stdevrxploss?: number;
  local_maxrxploss?: number;
  local_minrxploss?: number;
  local_normdevrxploss?: number;
  local_stdevrxploss?: number;
  rtt?: number;
  maxrtt?: number;
  minrtt?: number;
  normdevrtt?: number;
  stdevrtt?: number;
  local_ssrc: number;
  remote_ssrc: number;
  txoctetcount: number;
  rxoctetcount: number;
  channel_uniqueid: string;
}

// ============================================================================
// Channel Types
// ============================================================================

export interface Channel {
  id: string;
  name: string;
  state: ChannelState;
  caller: CallerId;
  connected: CallerId;
  accountcode: string;
  dialplan: DialplanCEP;
  creationtime: string;
  language: string;
  channelvars?: Record<string, string>;
  /** Protocol ID (Asterisk 20+) */
  protocol_id?: string;
}

export interface OriginateParams {
  endpoint: string;
  extension?: string;
  context?: string;
  priority?: number;
  label?: string;
  app?: string;
  appArgs?: string;
  callerId?: string;
  timeout?: number;
  channelId?: string;
  otherChannelId?: string;
  originator?: string;
  formats?: string;
  variables?: Record<string, string>;
}

export interface CreateChannelParams {
  endpoint: string;
  app: string;
  appArgs?: string;
  channelId?: string;
  otherChannelId?: string;
  originator?: string;
  formats?: string;
  variables?: Record<string, string>;
}

export interface HangupParams {
  reason_code?: string;
  reason?: string;
}

export interface ContinueParams {
  context?: string;
  extension?: string;
  priority?: number;
  label?: string;
}

export interface MoveParams {
  app: string;
  appArgs?: string;
}

export interface DTMFParams {
  dtmf: string;
  before?: number;
  between?: number;
  duration?: number;
  after?: number;
}

export interface PlayParams {
  media: string | string[];
  lang?: string;
  offsetms?: number;
  skipms?: number;
  playbackId?: string;
}

export interface RecordParams {
  name: string;
  format: string;
  maxDurationSeconds?: number;
  maxSilenceSeconds?: number;
  ifExists?: 'fail' | 'overwrite' | 'append';
  beep?: boolean;
  terminateOn?: string;
}

export interface SnoopParams {
  spy?: 'none' | 'both' | 'out' | 'in';
  whisper?: 'none' | 'both' | 'out' | 'in';
  app: string;
  appArgs?: string;
  snoopId?: string;
}

export interface DialParams {
  caller?: string;
  timeout?: number;
}

export interface ExternalMediaParams {
  channelId?: string;
  app: string;
  external_host: string;
  encapsulation?: 'rtp' | 'audiosocket';
  transport?: 'udp' | 'tcp';
  connection_type?: 'client' | 'server';
  format: string;
  direction?: 'both' | 'read' | 'write';
  data?: string;
  variables?: Record<string, string>;
}

// ============================================================================
// Bridge Types
// ============================================================================

export type BridgeType = 'mixing' | 'holding' | 'dtmf_events' | 'proxy_media' | 'video_sfu' | 'video_single';

export interface Bridge {
  id: string;
  technology: string;
  bridge_type: BridgeType;
  bridge_class: string;
  creator: string;
  name: string;
  channels: string[];
  video_mode?: 'none' | 'talker' | 'single';
  video_source_id?: string;
  creationtime: string;
}

export interface CreateBridgeParams {
  type?: BridgeType | string;
  bridgeId?: string;
  name?: string;
}

export interface AddChannelParams {
  channel: string | string[];
  role?: string;
  absorbDTMF?: boolean;
  mute?: boolean;
  inhibitConnectedLineUpdates?: boolean;
}

export interface RemoveChannelParams {
  channel: string | string[];
}

export interface PlayBridgeParams extends PlayParams {}

export interface RecordBridgeParams extends RecordParams {}

// ============================================================================
// Endpoint Types
// ============================================================================

export type EndpointState = 'unknown' | 'offline' | 'online';

export interface Endpoint {
  technology: string;
  resource: string;
  state: EndpointState;
  channel_ids: string[];
}

export interface TextMessage {
  from: string;
  to: string;
  body: string;
  variables?: Record<string, string>;
}

// ============================================================================
// Application Types
// ============================================================================

export interface Application {
  name: string;
  channel_ids: string[];
  bridge_ids: string[];
  endpoint_ids: string[];
  device_names: string[];
}

export interface SubscribeParams {
  eventSource: string | string[];
}

// ============================================================================
// Playback Types
// ============================================================================

export type PlaybackState = 'queued' | 'playing' | 'paused' | 'complete' | 'failed';

export interface Playback {
  id: string;
  media_uri: string;
  next_media_uri?: string;
  target_uri: string;
  language: string;
  state: PlaybackState;
}

// ============================================================================
// Recording Types
// ============================================================================

export type RecordingState = 'queued' | 'recording' | 'paused' | 'done' | 'failed' | 'canceled';

export interface LiveRecording {
  name: string;
  format: string;
  state: RecordingState;
  target_uri: string;
  duration?: number;
  talking_duration?: number;
  silence_duration?: number;
  cause?: string;
}

export interface StoredRecording {
  name: string;
  format: string;
}

export interface StoredRecordingCopyParams {
  destinationRecordingName: string;
}

// ============================================================================
// Sound Types
// ============================================================================

export interface Sound {
  id: string;
  text?: string;
  formats: FormatLangPair[];
}

export interface FormatLangPair {
  language: string;
  format: string;
}

export interface ListSoundsParams {
  lang?: string;
  format?: string;
}

// ============================================================================
// Mailbox Types
// ============================================================================

export interface Mailbox {
  name: string;
  old_messages: number;
  new_messages: number;
}

export interface UpdateMailboxParams {
  oldMessages: number;
  newMessages: number;
}

// ============================================================================
// Device State Types
// ============================================================================

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

export interface DeviceStateResource {
  name: string;
  state: DeviceState;
}

// ============================================================================
// Asterisk System Types
// ============================================================================

export interface AsteriskInfo {
  build?: BuildInfo;
  system?: SystemInfo;
  config?: ConfigInfo;
  status?: StatusInfo;
}

export interface BuildInfo {
  os: string;
  kernel: string;
  options: string;
  machine: string;
  date: string;
  user: string;
}

export interface SystemInfo {
  version: string;
  entity_id: string;
}

export interface ConfigInfo {
  name: string;
  default_language: string;
  max_channels?: number;
  max_open_files?: number;
  max_load?: number;
  setid?: SetId;
}

export interface SetId {
  user: string;
  group: string;
}

export interface StatusInfo {
  startup_time: string;
  last_reload_time: string;
}

export interface Variable {
  value: string;
}

export interface Module {
  name: string;
  description: string;
  use_count: number;
  status: string;
  support_level: string;
}

export interface LogChannel {
  channel: string;
  type: string;
  status: string;
  configuration: string;
}

// ============================================================================
// ARI Info Types
// ============================================================================

export interface AriInfo {
  apiVersion: string;
  swaggerVersion: string;
  basePath: string;
  resourcePath: string;
  apis: ApiDeclaration[];
  models?: Record<string, unknown>;
}

export interface ApiDeclaration {
  path: string;
  description?: string;
}

export interface ResourcesJson {
  apiVersion: string;
  swaggerVersion: string;
  basePath: string;
  apis: ApiListing[];
}

export interface ApiListing {
  path: string;
  description: string;
}
