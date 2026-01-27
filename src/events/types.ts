/**
 * ARI Event type definitions
 *
 * This module contains TypeScript type definitions for all Asterisk ARI WebSocket events.
 * Events are emitted when state changes occur in Asterisk (calls, bridges, playbacks, etc.).
 *
 * @packageDocumentation
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

/**
 * Base interface for all ARI events.
 *
 * All events share these common properties that identify the event type,
 * source application, and timing.
 */
export interface BaseEvent {
  /** Event type identifier (e.g., "StasisStart", "ChannelDestroyed") */
  type: string;
  /** Name of the Stasis application receiving this event */
  application: string;
  /** ISO 8601 timestamp when the event occurred */
  timestamp: string;
  /** Unique identifier for the Asterisk instance (useful in clustered setups) */
  asterisk_id?: string;
}

// ============================================================================
// Channel Events
// ============================================================================

/**
 * Emitted when a channel enters a Stasis application.
 *
 * This is typically the first event you receive for an incoming call.
 * The channel is now under your application's control.
 *
 * @example
 * ```typescript
 * client.on('StasisStart', (event, channel) => {
 *   console.log(`Call from ${channel.caller.number}`);
 *   console.log(`Application args: ${event.args.join(', ')}`);
 *   await channel.answer();
 * });
 * ```
 */
export interface StasisStartEvent extends BaseEvent {
  type: 'StasisStart';
  /** Arguments passed to the Stasis application */
  args: string[];
  /** The channel entering Stasis */
  channel: Channel;
  /** Channel being replaced (for channel takeover scenarios) */
  replace_channel?: Channel;
}

/**
 * Emitted when a channel leaves a Stasis application.
 *
 * After this event, the channel is no longer under your application's control.
 * This occurs when the channel hangs up, is redirected, or moves to another app.
 */
export interface StasisEndEvent extends BaseEvent {
  type: 'StasisEnd';
  /** The channel leaving Stasis */
  channel: Channel;
}

/**
 * Emitted when a new channel is created.
 *
 * This event occurs for any channel creation in Asterisk, not just
 * channels in your Stasis application.
 */
export interface ChannelCreatedEvent extends BaseEvent {
  type: 'ChannelCreated';
  /** The newly created channel */
  channel: Channel;
}

/**
 * Emitted when a channel is destroyed (hung up).
 *
 * Contains the hangup cause code which indicates why the call ended.
 *
 * @example
 * ```typescript
 * client.on('ChannelDestroyed', (event, channel) => {
 *   console.log(`Channel ${channel.name} destroyed`);
 *   console.log(`Cause: ${event.cause} (${event.cause_txt})`);
 * });
 * ```
 */
export interface ChannelDestroyedEvent extends BaseEvent {
  type: 'ChannelDestroyed';
  /** The destroyed channel */
  channel: Channel;
  /** Numeric hangup cause code */
  cause: number;
  /** Human-readable hangup cause description */
  cause_txt: string;
}

/**
 * Emitted when a channel's state changes.
 *
 * Common state transitions:
 * - Down → Ringing (incoming call)
 * - Ringing → Up (call answered)
 * - Up → Down (call ended)
 */
export interface ChannelStateChangeEvent extends BaseEvent {
  type: 'ChannelStateChange';
  /** The channel with updated state */
  channel: Channel;
}

/**
 * Emitted when DTMF is received on a channel.
 *
 * @example
 * ```typescript
 * let dtmfBuffer = '';
 * channel.on('ChannelDtmfReceived', (event) => {
 *   dtmfBuffer += event.digit;
 *   if (event.digit === '#') {
 *     console.log(`User entered: ${dtmfBuffer}`);
 *     dtmfBuffer = '';
 *   }
 * });
 * ```
 */
export interface ChannelDtmfReceivedEvent extends BaseEvent {
  type: 'ChannelDtmfReceived';
  /** The channel that received DTMF */
  channel: Channel;
  /** The DTMF digit received (0-9, A-D, *, #) */
  digit: string;
  /** Duration the digit was pressed in milliseconds */
  duration_ms: number;
}

/**
 * Emitted when a hangup is requested for a channel.
 *
 * This occurs before the actual hangup. You can use this to perform
 * cleanup actions before the channel is destroyed.
 */
export interface ChannelHangupRequestEvent extends BaseEvent {
  type: 'ChannelHangupRequest';
  /** The channel being hung up */
  channel: Channel;
  /** Whether this is a soft hangup (can be canceled) */
  soft?: boolean;
  /** Hangup cause code if specified */
  cause?: number;
}

/**
 * Emitted when a channel variable is set.
 *
 * Note: The channel may be undefined for global variable sets.
 */
export interface ChannelVarsetEvent extends BaseEvent {
  type: 'ChannelVarset';
  /** The channel the variable was set on (undefined for global variables) */
  channel?: Channel;
  /** Name of the variable */
  variable: string;
  /** Value of the variable */
  value: string;
}

/**
 * Emitted when a channel is placed on hold.
 */
export interface ChannelHoldEvent extends BaseEvent {
  type: 'ChannelHold';
  /** The channel placed on hold */
  channel: Channel;
  /** Music on hold class to play */
  musicclass?: string;
}

/**
 * Emitted when a channel is taken off hold.
 */
export interface ChannelUnholdEvent extends BaseEvent {
  type: 'ChannelUnhold';
  /** The channel removed from hold */
  channel: Channel;
}

/**
 * Emitted when talking is detected on a channel.
 *
 * Requires talk detection to be enabled on the channel.
 */
export interface ChannelTalkingStartedEvent extends BaseEvent {
  type: 'ChannelTalkingStarted';
  /** The channel where talking started */
  channel: Channel;
}

/**
 * Emitted when talking stops on a channel.
 *
 * Requires talk detection to be enabled on the channel.
 */
export interface ChannelTalkingFinishedEvent extends BaseEvent {
  type: 'ChannelTalkingFinished';
  /** The channel where talking stopped */
  channel: Channel;
  /** Duration of talking in milliseconds */
  duration: number;
}

/**
 * Emitted when the connected line information changes.
 *
 * This typically occurs during call transfers or when caller ID is updated.
 */
export interface ChannelConnectedLineEvent extends BaseEvent {
  type: 'ChannelConnectedLine';
  /** The channel with updated connected line info */
  channel: Channel;
}

/**
 * Emitted when a channel enters a dialplan application.
 *
 * Only emitted for subscribed channels executing dialplan.
 */
export interface ChannelDialplanEvent extends BaseEvent {
  type: 'ChannelDialplan';
  /** The channel executing dialplan */
  channel: Channel;
  /** Dialplan application name */
  dialplan_app: string;
  /** Arguments passed to the dialplan application */
  dialplan_app_data: string;
}

/**
 * Emitted when caller ID changes on a channel.
 */
export interface ChannelCallerIdEvent extends BaseEvent {
  type: 'ChannelCallerId';
  /** The channel with updated caller ID */
  channel: Channel;
  /** Numeric presentation value */
  caller_presentation: number;
  /** Human-readable presentation description */
  caller_presentation_txt: string;
}

/**
 * Emitted when a tone is detected on a channel.
 *
 * @since Asterisk 22+
 */
export interface ChannelToneDetectedEvent extends BaseEvent {
  type: 'ChannelToneDetected';
  /** The channel where tone was detected */
  channel: Channel;
}

// ============================================================================
// Bridge Events
// ============================================================================

/**
 * Emitted when a bridge is created.
 */
export interface BridgeCreatedEvent extends BaseEvent {
  type: 'BridgeCreated';
  /** The newly created bridge */
  bridge: Bridge;
}

/**
 * Emitted when a bridge is destroyed.
 */
export interface BridgeDestroyedEvent extends BaseEvent {
  type: 'BridgeDestroyed';
  /** The destroyed bridge */
  bridge: Bridge;
}

/**
 * Emitted when two bridges are merged.
 */
export interface BridgeMergedEvent extends BaseEvent {
  type: 'BridgeMerged';
  /** The resulting bridge after merge */
  bridge: Bridge;
  /** The bridge that was merged into the other */
  bridge_from: Bridge;
}

/**
 * Emitted when the video source changes in a bridge.
 */
export interface BridgeVideoSourceChangedEvent extends BaseEvent {
  type: 'BridgeVideoSourceChanged';
  /** The bridge with changed video source */
  bridge: Bridge;
  /** Previous video source channel ID */
  old_video_source_id?: string;
}

/**
 * Emitted when a blind transfer is performed.
 *
 * A blind transfer sends a call to a destination without consulting first.
 */
export interface BridgeBlindTransferEvent extends BaseEvent {
  type: 'BridgeBlindTransfer';
  /** Channel performing the transfer */
  channel: Channel;
  /** Channel replacing the transferer */
  replace_channel?: Channel;
  /** Channel being transferred */
  transferee?: Channel;
  /** Extension the call is being transferred to */
  exten: string;
  /** Dialplan context for the transfer */
  context: string;
  /** Transfer result (e.g., "Success", "Fail") */
  result: string;
  /** Whether the transfer is to an external destination */
  is_external: boolean;
  /** Bridge involved in the transfer */
  bridge?: Bridge;
}

/**
 * Emitted when an attended transfer is performed.
 *
 * An attended transfer involves the transferer consulting with the
 * transfer target before completing the transfer.
 */
export interface BridgeAttendedTransferEvent extends BaseEvent {
  type: 'BridgeAttendedTransfer';
  /** First leg of the transferer's channels */
  transferer_first_leg: Channel;
  /** Second leg of the transferer's channels */
  transferer_second_leg: Channel;
  /** Channel replacing the transferer */
  replace_channel?: Channel;
  /** Channel being transferred */
  transferee?: Channel;
  /** Transfer target channel */
  transfer_target?: Channel;
  /** Transfer result (e.g., "Success", "Fail") */
  result: string;
  /** Whether the transfer is to an external destination */
  is_external: boolean;
  /** Bridge for the first leg */
  transferer_first_leg_bridge?: Bridge;
  /** Bridge for the second leg */
  transferer_second_leg_bridge?: Bridge;
  /** Type of destination (e.g., "Bridge", "Application") */
  destination_type: string;
  /** Destination bridge ID */
  destination_bridge?: string;
  /** Destination application name */
  destination_application?: string;
  /** First leg of destination link */
  destination_link_first_leg?: Channel;
  /** Second leg of destination link */
  destination_link_second_leg?: Channel;
  /** Three-way channel for three-way transfers */
  destination_threeway_channel?: Channel;
  /** Three-way bridge for three-way transfers */
  destination_threeway_bridge?: Bridge;
}

/**
 * Emitted when a channel enters a bridge.
 */
export interface ChannelEnteredBridgeEvent extends BaseEvent {
  type: 'ChannelEnteredBridge';
  /** The bridge being entered */
  bridge: Bridge;
  /** The channel entering the bridge */
  channel: Channel;
}

/**
 * Emitted when a channel leaves a bridge.
 */
export interface ChannelLeftBridgeEvent extends BaseEvent {
  type: 'ChannelLeftBridge';
  /** The bridge being left */
  bridge: Bridge;
  /** The channel leaving the bridge */
  channel: Channel;
}

// ============================================================================
// Playback Events
// ============================================================================

/**
 * Emitted when playback starts.
 */
export interface PlaybackStartedEvent extends BaseEvent {
  type: 'PlaybackStarted';
  /** The playback that started */
  playback: Playback;
}

/**
 * Emitted when playback continues to the next media item.
 */
export interface PlaybackContinuingEvent extends BaseEvent {
  type: 'PlaybackContinuing';
  /** The continuing playback */
  playback: Playback;
}

/**
 * Emitted when playback finishes.
 */
export interface PlaybackFinishedEvent extends BaseEvent {
  type: 'PlaybackFinished';
  /** The finished playback */
  playback: Playback;
}

// ============================================================================
// Recording Events
// ============================================================================

/**
 * Emitted when recording starts.
 */
export interface RecordingStartedEvent extends BaseEvent {
  type: 'RecordingStarted';
  /** The recording that started */
  recording: LiveRecording;
}

/**
 * Emitted when recording finishes successfully.
 */
export interface RecordingFinishedEvent extends BaseEvent {
  type: 'RecordingFinished';
  /** The finished recording */
  recording: LiveRecording;
}

/**
 * Emitted when recording fails.
 */
export interface RecordingFailedEvent extends BaseEvent {
  type: 'RecordingFailed';
  /** The failed recording */
  recording: LiveRecording;
}

// ============================================================================
// Endpoint Events
// ============================================================================

/**
 * Emitted when an endpoint's state changes.
 */
export interface EndpointStateChangeEvent extends BaseEvent {
  type: 'EndpointStateChange';
  /** The endpoint with changed state */
  endpoint: Endpoint;
}

/**
 * Emitted when a peer's registration status changes.
 */
export interface PeerStatusChangeEvent extends BaseEvent {
  type: 'PeerStatusChange';
  /** The endpoint for this peer */
  endpoint: Endpoint;
  /** Peer status information */
  peer: Peer;
}

/**
 * Peer status information.
 */
export interface Peer {
  /** Peer status (e.g., "Reachable", "Unreachable", "Registered") */
  peer_status: string;
  /** Reason for status change */
  cause?: string;
  /** Peer's IP address */
  address?: string;
  /** Peer's port */
  port?: string;
  /** Time of status change */
  time?: string;
}

/**
 * Emitted when a SIP contact's status changes.
 */
export interface ContactStatusChangeEvent extends BaseEvent {
  type: 'ContactStatusChange';
  /** The endpoint for this contact */
  endpoint: Endpoint;
  /** Contact status information */
  contact_info: ContactInfo;
}

/**
 * SIP contact status information.
 */
export interface ContactInfo {
  /** Contact URI */
  uri: string;
  /** Contact status (e.g., "Reachable", "Unreachable") */
  contact_status: string;
  /** Address of Record */
  aor: string;
  /** Round-trip time in microseconds */
  roundtrip_usec?: string;
}

// ============================================================================
// Device State Events
// ============================================================================

/**
 * Emitted when a device state changes.
 */
export interface DeviceStateChangedEvent extends BaseEvent {
  type: 'DeviceStateChanged';
  /** Device state information */
  device_state: {
    /** Device name */
    name: string;
    /** Current device state */
    state: DeviceState;
  };
}

// ============================================================================
// Text Message Events
// ============================================================================

/**
 * Emitted when a text message is received.
 */
export interface TextMessageReceivedEvent extends BaseEvent {
  type: 'TextMessageReceived';
  /** The received message */
  message: {
    /** Sender URI */
    from: string;
    /** Recipient URI */
    to: string;
    /** Message body */
    body: string;
    /** Message variables */
    variables?: Record<string, string>;
  };
  /** Endpoint that received the message */
  endpoint?: Endpoint;
}

// ============================================================================
// Dial Events
// ============================================================================

/**
 * Emitted during the dial process to indicate dial status.
 *
 * This event occurs multiple times during a call's lifecycle
 * as the dial status changes (e.g., RINGING, ANSWER, BUSY).
 */
export interface DialEvent extends BaseEvent {
  type: 'Dial';
  /** The calling channel (may be undefined) */
  caller?: Channel;
  /** The channel being dialed */
  peer: Channel;
  /** Forwarding information if call was forwarded */
  forward?: string;
  /** Channel the call was forwarded from */
  forwarded?: Channel;
  /** Original dial string */
  dialstring?: string;
  /** Current dial status (e.g., "RINGING", "ANSWER", "BUSY", "NOANSWER") */
  dialstatus: string;
}

// ============================================================================
// Application Events
// ============================================================================

/**
 * Emitted when another WebSocket connection takes over the application.
 *
 * This occurs when a new connection is made for the same application,
 * replacing the current connection.
 */
export interface ApplicationReplacedEvent extends BaseEvent {
  type: 'ApplicationReplaced';
}

/**
 * Emitted when a channel move to this application fails.
 */
export interface ApplicationMoveFailedEvent extends BaseEvent {
  type: 'ApplicationMoveFailed';
  /** The channel that failed to move */
  channel: Channel;
  /** Intended destination application */
  destination: string;
  /** Arguments for the destination application */
  args: string[];
}

/**
 * Emitted when an application is registered.
 */
export interface ApplicationRegisteredEvent extends BaseEvent {
  type: 'ApplicationRegistered';
}

/**
 * Emitted when an application is unregistered.
 */
export interface ApplicationUnregisteredEvent extends BaseEvent {
  type: 'ApplicationUnregistered';
}

// ============================================================================
// Channel User Event
// ============================================================================

/**
 * User-defined event sent from the dialplan or another ARI application.
 *
 * @example
 * ```typescript
 * // From dialplan: UserEvent(MyCustomEvent,Key1:Value1,Key2:Value2)
 * client.on('ChannelUserevent', (event) => {
 *   if (event.eventname === 'MyCustomEvent') {
 *     console.log(event.userevent.Key1); // "Value1"
 *   }
 * });
 * ```
 */
export interface ChannelUsereventEvent extends BaseEvent {
  type: 'ChannelUserevent';
  /** Channel associated with the event (optional) */
  channel?: Channel;
  /** Bridge associated with the event (optional) */
  bridge?: Bridge;
  /** Endpoint associated with the event (optional) */
  endpoint?: Endpoint;
  /** Name of the user event */
  eventname: string;
  /** Key-value pairs passed with the event */
  userevent: Record<string, string>;
}

// ============================================================================
// Channel Transfer Event (Asterisk 22+)
// ============================================================================

/**
 * Emitted when a channel transfer occurs.
 *
 * @since Asterisk 22+
 */
export interface ChannelTransferEvent extends BaseEvent {
  type: 'ChannelTransfer';
  /** The channel being transferred */
  channel: Channel;
}

// ============================================================================
// Union of All Events
// ============================================================================

/**
 * Union type of all possible ARI events.
 *
 * Use this type when you need to handle events generically.
 */
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

/**
 * All possible event type strings.
 */
export type AriEventType = AriEvent['type'];

// ============================================================================
// Event Type Map for Type-Safe Listeners
// ============================================================================

/**
 * Maps event type strings to their corresponding event interfaces.
 *
 * Used internally for type-safe event listeners.
 *
 * @example
 * ```typescript
 * // The listener receives the correct event type automatically
 * client.on('StasisStart', (event, channel) => {
 *   // event is StasisStartEvent
 *   // channel is Channel
 * });
 * ```
 */
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
  /** Wildcard listener receives all events */
  '*': AriEvent;
}

// ============================================================================
// Channel-specific Event Types
// ============================================================================

/**
 * Event types that can occur on channels.
 */
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

/**
 * Event types that can occur on bridges.
 */
export type BridgeEventType =
  | 'BridgeCreated'
  | 'BridgeDestroyed'
  | 'BridgeMerged'
  | 'BridgeVideoSourceChanged'
  | 'BridgeBlindTransfer'
  | 'BridgeAttendedTransfer'
  | 'ChannelEnteredBridge'
  | 'ChannelLeftBridge';

/**
 * Event types that can occur on playbacks.
 */
export type PlaybackEventType =
  | 'PlaybackStarted'
  | 'PlaybackContinuing'
  | 'PlaybackFinished';

/**
 * Event types that can occur on recordings.
 */
export type RecordingEventType =
  | 'RecordingStarted'
  | 'RecordingFinished'
  | 'RecordingFailed';

// ============================================================================
// Convenience Arguments for ari-client Compatibility
// ============================================================================

/**
 * Maps event types to their raw data convenience argument type.
 *
 * This type maps to raw data types (Channel, Bridge, etc.) without methods.
 * For instance types with methods, see `EventInstanceArg` in the emitter module.
 *
 * @remarks
 * This type is primarily used internally. When using `client.on()`, you'll
 * receive instance types (ChannelInstance, BridgeInstance, etc.) that have
 * methods like `answer()`, `play()`, etc.
 *
 * @see EventInstanceArg for the instance type mapping used in event listeners
 */
export type EventConvenienceArg<K extends AriEventType> =
  K extends 'StasisStart' | 'StasisEnd' | 'ChannelCreated' | 'ChannelDestroyed' |
           'ChannelStateChange' | 'ChannelDtmfReceived' | 'ChannelHangupRequest' |
           'ChannelHold' | 'ChannelUnhold' | 'ChannelTalkingStarted' |
           'ChannelTalkingFinished' | 'ChannelConnectedLine' | 'ChannelDialplan' |
           'ChannelCallerId' | 'ChannelToneDetected' | 'ChannelEnteredBridge' |
           'ChannelLeftBridge' | 'ChannelTransfer' | 'BridgeBlindTransfer' |
           'ApplicationMoveFailed'
    ? Channel
    : K extends 'BridgeCreated' | 'BridgeDestroyed' | 'BridgeMerged' | 'BridgeVideoSourceChanged'
    ? Bridge
    : K extends 'PlaybackStarted' | 'PlaybackContinuing' | 'PlaybackFinished'
    ? Playback
    : K extends 'RecordingStarted' | 'RecordingFinished' | 'RecordingFailed'
    ? LiveRecording
    : K extends 'EndpointStateChange' | 'PeerStatusChange' | 'ContactStatusChange'
    ? Endpoint
    : K extends 'Dial'
    ? Channel // peer channel
    : K extends 'ChannelVarset'
    ? Channel | undefined // channel is optional in ChannelVarset
    : K extends 'ChannelUserevent'
    ? Channel | undefined // channel is optional in ChannelUserevent
    : undefined;
