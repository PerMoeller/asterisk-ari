/**
 * @per_moeller/asterisk-ari
 * Modern TypeScript ARI (Asterisk REST Interface) client
 */

// Main client
export { connect, AriClient } from './client.js';

// Connection utilities
export { HttpConnection, AriHttpError } from './connection.js';
export { WebSocketManager } from './websocket.js';

// Version detection
export {
  AriVersion,
  VersionCompat,
  parseAriVersion,
  fetchAriVersion,
  getAsteriskVersion,
} from './version.js';

// Connection pool
export { ConnectionPool, createPool } from './pool.js';

// Request queue
export { RequestQueue, CircuitBreakerOpenError } from './queue.js';

// Options
export {
  ConnectOptions,
  ResolvedOptions,
  PoolOptions,
  QueueOptions,
  DEFAULT_OPTIONS,
  resolveOptions,
} from './types/options.js';

// API Types
export type {
  // Common
  ChannelState,
  CallerId,
  DialplanCEP,
  RTPstat,
  // Channel
  Channel,
  OriginateParams,
  CreateChannelParams,
  HangupParams,
  ContinueParams,
  MoveParams,
  DTMFParams,
  PlayParams,
  RecordParams,
  SnoopParams,
  DialParams,
  ExternalMediaParams,
  // Bridge
  Bridge,
  BridgeType,
  CreateBridgeParams,
  AddChannelParams,
  RemoveChannelParams,
  PlayBridgeParams,
  RecordBridgeParams,
  // Endpoint
  Endpoint,
  EndpointState,
  TextMessage,
  // Application
  Application,
  SubscribeParams,
  // Playback
  Playback,
  PlaybackState,
  // Recording
  LiveRecording,
  StoredRecording,
  RecordingState,
  StoredRecordingCopyParams,
  // Sound
  Sound,
  FormatLangPair,
  ListSoundsParams,
  // Mailbox
  Mailbox,
  UpdateMailboxParams,
  // Device State
  DeviceState,
  DeviceStateResource,
  // Asterisk
  AsteriskInfo,
  BuildInfo,
  SystemInfo,
  ConfigInfo,
  StatusInfo,
  Variable,
  Module,
  LogChannel,
} from './types/api.js';

// Event Types
export type {
  // Base
  BaseEvent,
  AriEvent,
  AriEventType,
  AriEventMap,
  // Channel events
  StasisStartEvent,
  StasisEndEvent,
  ChannelCreatedEvent,
  ChannelDestroyedEvent,
  ChannelStateChangeEvent,
  ChannelDtmfReceivedEvent,
  ChannelHangupRequestEvent,
  ChannelVarsetEvent,
  ChannelHoldEvent,
  ChannelUnholdEvent,
  ChannelTalkingStartedEvent,
  ChannelTalkingFinishedEvent,
  ChannelConnectedLineEvent,
  ChannelDialplanEvent,
  ChannelCallerIdEvent,
  ChannelToneDetectedEvent,
  // Bridge events
  BridgeCreatedEvent,
  BridgeDestroyedEvent,
  BridgeMergedEvent,
  BridgeVideoSourceChangedEvent,
  BridgeBlindTransferEvent,
  BridgeAttendedTransferEvent,
  ChannelEnteredBridgeEvent,
  ChannelLeftBridgeEvent,
  // Playback events
  PlaybackStartedEvent,
  PlaybackContinuingEvent,
  PlaybackFinishedEvent,
  // Recording events
  RecordingStartedEvent,
  RecordingFinishedEvent,
  RecordingFailedEvent,
  // Endpoint events
  EndpointStateChangeEvent,
  PeerStatusChangeEvent,
  ContactStatusChangeEvent,
  Peer,
  ContactInfo,
  // Device state events
  DeviceStateChangedEvent,
  // Text message events
  TextMessageReceivedEvent,
  // Dial events
  DialEvent,
  // Application events
  ApplicationReplacedEvent,
  ApplicationMoveFailedEvent,
  ApplicationRegisteredEvent,
  ApplicationUnregisteredEvent,
  // Channel user event
  ChannelUsereventEvent,
  // Channel transfer event
  ChannelTransferEvent,
  // Event type categories
  ChannelEventType,
  BridgeEventType,
  PlaybackEventType,
  RecordingEventType,
  // Convenience arg type (for typed event listeners)
  EventConvenienceArg,
} from './events/types.js';

// Event emitters
export { TypedEventEmitter, AriEventEmitter, ConnectionEventEmitter } from './events/emitter.js';
export type { AriEventListener, EventInstanceArg } from './events/emitter.js';

// Model instances
export {
  ChannelInstance,
  BridgeInstance,
  PlaybackInstance,
  LiveRecordingInstance,
  StoredRecordingInstance,
} from './models/index.js';
export type {
  ChannelEventListener,
  ChannelEventListeners,
  BridgeEventListener,
  BridgeEventListeners,
  PlaybackEventListener,
  PlaybackEventListeners,
  RecordingEventListener,
  RecordingEventListeners,
} from './models/index.js';

// Resources
export { BaseResource } from './resources/base.js';
export { ChannelsResource } from './resources/channels.js';
export { BridgesResource } from './resources/bridges.js';
export { EndpointsResource } from './resources/endpoints.js';
export { ApplicationsResource } from './resources/applications.js';
export { AsteriskResource, AsteriskInfoFilter } from './resources/asterisk.js';
export { PlaybacksResource, PlaybackOperation } from './resources/playbacks.js';
export { RecordingsResource, StoredRecordingsResource, LiveRecordingsResource } from './resources/recordings.js';
export { SoundsResource } from './resources/sounds.js';
export { MailboxesResource } from './resources/mailboxes.js';
export { DeviceStatesResource } from './resources/devicestates.js';
