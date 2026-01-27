/**
 * ARI Event type definitions
 */

import type {
  Bridge,
  Channel,
  DeviceState,
  Endpoint,
  LiveRecording,
  Playback,
} from '../types/api.js';

// ============================================================================
// Base Event Types
// ============================================================================

export interface BaseEvent {
  type: string;
  application: string;
  timestamp: string;
  asterisk_id?: string;
}

// ============================================================================
// Channel Events
// ============================================================================

export interface StasisStartEvent extends BaseEvent {
  type: 'StasisStart';
  args: string[];
  channel: Channel;
  replace_channel?: Channel;
}

export interface StasisEndEvent extends BaseEvent {
  type: 'StasisEnd';
  channel: Channel;
}

export interface ChannelCreatedEvent extends BaseEvent {
  type: 'ChannelCreated';
  channel: Channel;
}

export interface ChannelDestroyedEvent extends BaseEvent {
  type: 'ChannelDestroyed';
  channel: Channel;
  cause: number;
  cause_txt: string;
}

export interface ChannelStateChangeEvent extends BaseEvent {
  type: 'ChannelStateChange';
  channel: Channel;
}

export interface ChannelDtmfReceivedEvent extends BaseEvent {
  type: 'ChannelDtmfReceived';
  channel: Channel;
  digit: string;
  duration_ms: number;
}

export interface ChannelHangupRequestEvent extends BaseEvent {
  type: 'ChannelHangupRequest';
  channel: Channel;
  soft?: boolean;
  cause?: number;
}

export interface ChannelVarsetEvent extends BaseEvent {
  type: 'ChannelVarset';
  channel?: Channel;
  variable: string;
  value: string;
}

export interface ChannelHoldEvent extends BaseEvent {
  type: 'ChannelHold';
  channel: Channel;
  musicclass?: string;
}

export interface ChannelUnholdEvent extends BaseEvent {
  type: 'ChannelUnhold';
  channel: Channel;
}

export interface ChannelTalkingStartedEvent extends BaseEvent {
  type: 'ChannelTalkingStarted';
  channel: Channel;
}

export interface ChannelTalkingFinishedEvent extends BaseEvent {
  type: 'ChannelTalkingFinished';
  channel: Channel;
  duration: number;
}

export interface ChannelConnectedLineEvent extends BaseEvent {
  type: 'ChannelConnectedLine';
  channel: Channel;
}

export interface ChannelDialplanEvent extends BaseEvent {
  type: 'ChannelDialplan';
  channel: Channel;
  dialplan_app: string;
  dialplan_app_data: string;
}

export interface ChannelCallerIdEvent extends BaseEvent {
  type: 'ChannelCallerId';
  channel: Channel;
  caller_presentation: number;
  caller_presentation_txt: string;
}

/** Asterisk 22+ */
export interface ChannelToneDetectedEvent extends BaseEvent {
  type: 'ChannelToneDetected';
  channel: Channel;
}

// ============================================================================
// Bridge Events
// ============================================================================

export interface BridgeCreatedEvent extends BaseEvent {
  type: 'BridgeCreated';
  bridge: Bridge;
}

export interface BridgeDestroyedEvent extends BaseEvent {
  type: 'BridgeDestroyed';
  bridge: Bridge;
}

export interface BridgeMergedEvent extends BaseEvent {
  type: 'BridgeMerged';
  bridge: Bridge;
  bridge_from: Bridge;
}

export interface BridgeVideoSourceChangedEvent extends BaseEvent {
  type: 'BridgeVideoSourceChanged';
  bridge: Bridge;
  old_video_source_id?: string;
}

export interface BridgeBlindTransferEvent extends BaseEvent {
  type: 'BridgeBlindTransfer';
  channel: Channel;
  replace_channel?: Channel;
  transferee?: Channel;
  exten: string;
  context: string;
  result: string;
  is_external: boolean;
  bridge?: Bridge;
}

export interface BridgeAttendedTransferEvent extends BaseEvent {
  type: 'BridgeAttendedTransfer';
  transferer_first_leg: Channel;
  transferer_second_leg: Channel;
  replace_channel?: Channel;
  transferee?: Channel;
  transfer_target?: Channel;
  result: string;
  is_external: boolean;
  transferer_first_leg_bridge?: Bridge;
  transferer_second_leg_bridge?: Bridge;
  destination_type: string;
  destination_bridge?: string;
  destination_application?: string;
  destination_link_first_leg?: Channel;
  destination_link_second_leg?: Channel;
  destination_threeway_channel?: Channel;
  destination_threeway_bridge?: Bridge;
}

export interface ChannelEnteredBridgeEvent extends BaseEvent {
  type: 'ChannelEnteredBridge';
  bridge: Bridge;
  channel: Channel;
}

export interface ChannelLeftBridgeEvent extends BaseEvent {
  type: 'ChannelLeftBridge';
  bridge: Bridge;
  channel: Channel;
}

// ============================================================================
// Playback Events
// ============================================================================

export interface PlaybackStartedEvent extends BaseEvent {
  type: 'PlaybackStarted';
  playback: Playback;
}

export interface PlaybackContinuingEvent extends BaseEvent {
  type: 'PlaybackContinuing';
  playback: Playback;
}

export interface PlaybackFinishedEvent extends BaseEvent {
  type: 'PlaybackFinished';
  playback: Playback;
}

// ============================================================================
// Recording Events
// ============================================================================

export interface RecordingStartedEvent extends BaseEvent {
  type: 'RecordingStarted';
  recording: LiveRecording;
}

export interface RecordingFinishedEvent extends BaseEvent {
  type: 'RecordingFinished';
  recording: LiveRecording;
}

export interface RecordingFailedEvent extends BaseEvent {
  type: 'RecordingFailed';
  recording: LiveRecording;
}

// ============================================================================
// Endpoint Events
// ============================================================================

export interface EndpointStateChangeEvent extends BaseEvent {
  type: 'EndpointStateChange';
  endpoint: Endpoint;
}

export interface PeerStatusChangeEvent extends BaseEvent {
  type: 'PeerStatusChange';
  endpoint: Endpoint;
  peer: Peer;
}

export interface Peer {
  peer_status: string;
  cause?: string;
  address?: string;
  port?: string;
  time?: string;
}

export interface ContactStatusChangeEvent extends BaseEvent {
  type: 'ContactStatusChange';
  endpoint: Endpoint;
  contact_info: ContactInfo;
}

export interface ContactInfo {
  uri: string;
  contact_status: string;
  aor: string;
  roundtrip_usec?: string;
}

// ============================================================================
// Device State Events
// ============================================================================

export interface DeviceStateChangedEvent extends BaseEvent {
  type: 'DeviceStateChanged';
  device_state: {
    name: string;
    state: DeviceState;
  };
}

// ============================================================================
// Text Message Events
// ============================================================================

export interface TextMessageReceivedEvent extends BaseEvent {
  type: 'TextMessageReceived';
  message: {
    from: string;
    to: string;
    body: string;
    variables?: Record<string, string>;
  };
  endpoint?: Endpoint;
}

// ============================================================================
// Dial Events
// ============================================================================

export interface DialEvent extends BaseEvent {
  type: 'Dial';
  caller?: Channel;
  peer: Channel;
  forward?: string;
  forwarded?: Channel;
  dialstring?: string;
  dialstatus: string;
}

// ============================================================================
// Application Events
// ============================================================================

export interface ApplicationReplacedEvent extends BaseEvent {
  type: 'ApplicationReplaced';
}

export interface ApplicationMoveFailedEvent extends BaseEvent {
  type: 'ApplicationMoveFailed';
  channel: Channel;
  destination: string;
  args: string[];
}

export interface ApplicationRegisteredEvent extends BaseEvent {
  type: 'ApplicationRegistered';
}

export interface ApplicationUnregisteredEvent extends BaseEvent {
  type: 'ApplicationUnregistered';
}

// ============================================================================
// Channel User Event
// ============================================================================

export interface ChannelUsereventEvent extends BaseEvent {
  type: 'ChannelUserevent';
  channel?: Channel;
  bridge?: Bridge;
  endpoint?: Endpoint;
  eventname: string;
  userevent: Record<string, string>;
}

// ============================================================================
// Channel Transfer Event (Asterisk 22+)
// ============================================================================

export interface ChannelTransferEvent extends BaseEvent {
  type: 'ChannelTransfer';
  channel: Channel;
}

// ============================================================================
// Union of All Events
// ============================================================================

export type AriEvent =
  | StasisStartEvent
  | StasisEndEvent
  | ChannelCreatedEvent
  | ChannelDestroyedEvent
  | ChannelStateChangeEvent
  | ChannelDtmfReceivedEvent
  | ChannelHangupRequestEvent
  | ChannelVarsetEvent
  | ChannelHoldEvent
  | ChannelUnholdEvent
  | ChannelTalkingStartedEvent
  | ChannelTalkingFinishedEvent
  | ChannelConnectedLineEvent
  | ChannelDialplanEvent
  | ChannelCallerIdEvent
  | ChannelToneDetectedEvent
  | BridgeCreatedEvent
  | BridgeDestroyedEvent
  | BridgeMergedEvent
  | BridgeVideoSourceChangedEvent
  | BridgeBlindTransferEvent
  | BridgeAttendedTransferEvent
  | ChannelEnteredBridgeEvent
  | ChannelLeftBridgeEvent
  | PlaybackStartedEvent
  | PlaybackContinuingEvent
  | PlaybackFinishedEvent
  | RecordingStartedEvent
  | RecordingFinishedEvent
  | RecordingFailedEvent
  | EndpointStateChangeEvent
  | PeerStatusChangeEvent
  | ContactStatusChangeEvent
  | DeviceStateChangedEvent
  | TextMessageReceivedEvent
  | DialEvent
  | ApplicationReplacedEvent
  | ApplicationMoveFailedEvent
  | ApplicationRegisteredEvent
  | ApplicationUnregisteredEvent
  | ChannelUsereventEvent
  | ChannelTransferEvent;

export type AriEventType = AriEvent['type'];

// ============================================================================
// Event Type Map for Type-Safe Listeners
// ============================================================================

export interface AriEventMap {
  StasisStart: StasisStartEvent;
  StasisEnd: StasisEndEvent;
  ChannelCreated: ChannelCreatedEvent;
  ChannelDestroyed: ChannelDestroyedEvent;
  ChannelStateChange: ChannelStateChangeEvent;
  ChannelDtmfReceived: ChannelDtmfReceivedEvent;
  ChannelHangupRequest: ChannelHangupRequestEvent;
  ChannelVarset: ChannelVarsetEvent;
  ChannelHold: ChannelHoldEvent;
  ChannelUnhold: ChannelUnholdEvent;
  ChannelTalkingStarted: ChannelTalkingStartedEvent;
  ChannelTalkingFinished: ChannelTalkingFinishedEvent;
  ChannelConnectedLine: ChannelConnectedLineEvent;
  ChannelDialplan: ChannelDialplanEvent;
  ChannelCallerId: ChannelCallerIdEvent;
  ChannelToneDetected: ChannelToneDetectedEvent;
  BridgeCreated: BridgeCreatedEvent;
  BridgeDestroyed: BridgeDestroyedEvent;
  BridgeMerged: BridgeMergedEvent;
  BridgeVideoSourceChanged: BridgeVideoSourceChangedEvent;
  BridgeBlindTransfer: BridgeBlindTransferEvent;
  BridgeAttendedTransfer: BridgeAttendedTransferEvent;
  ChannelEnteredBridge: ChannelEnteredBridgeEvent;
  ChannelLeftBridge: ChannelLeftBridgeEvent;
  PlaybackStarted: PlaybackStartedEvent;
  PlaybackContinuing: PlaybackContinuingEvent;
  PlaybackFinished: PlaybackFinishedEvent;
  RecordingStarted: RecordingStartedEvent;
  RecordingFinished: RecordingFinishedEvent;
  RecordingFailed: RecordingFailedEvent;
  EndpointStateChange: EndpointStateChangeEvent;
  PeerStatusChange: PeerStatusChangeEvent;
  ContactStatusChange: ContactStatusChangeEvent;
  DeviceStateChanged: DeviceStateChangedEvent;
  TextMessageReceived: TextMessageReceivedEvent;
  Dial: DialEvent;
  ApplicationReplaced: ApplicationReplacedEvent;
  ApplicationMoveFailed: ApplicationMoveFailedEvent;
  ApplicationRegistered: ApplicationRegisteredEvent;
  ApplicationUnregistered: ApplicationUnregisteredEvent;
  ChannelUserevent: ChannelUsereventEvent;
  ChannelTransfer: ChannelTransferEvent;
  '*': AriEvent;
}

// ============================================================================
// Channel-specific Event Types
// ============================================================================

export type ChannelEventType =
  | 'StasisStart'
  | 'StasisEnd'
  | 'ChannelCreated'
  | 'ChannelDestroyed'
  | 'ChannelStateChange'
  | 'ChannelDtmfReceived'
  | 'ChannelHangupRequest'
  | 'ChannelVarset'
  | 'ChannelHold'
  | 'ChannelUnhold'
  | 'ChannelTalkingStarted'
  | 'ChannelTalkingFinished'
  | 'ChannelConnectedLine'
  | 'ChannelDialplan'
  | 'ChannelCallerId'
  | 'ChannelToneDetected'
  | 'ChannelEnteredBridge'
  | 'ChannelLeftBridge'
  | 'ChannelUserevent'
  | 'ChannelTransfer'
  | 'Dial';

export type BridgeEventType =
  | 'BridgeCreated'
  | 'BridgeDestroyed'
  | 'BridgeMerged'
  | 'BridgeVideoSourceChanged'
  | 'BridgeBlindTransfer'
  | 'BridgeAttendedTransfer'
  | 'ChannelEnteredBridge'
  | 'ChannelLeftBridge';

export type PlaybackEventType =
  | 'PlaybackStarted'
  | 'PlaybackContinuing'
  | 'PlaybackFinished';

export type RecordingEventType =
  | 'RecordingStarted'
  | 'RecordingFinished'
  | 'RecordingFailed';
