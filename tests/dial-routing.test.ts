import { describe, it, expect, beforeEach } from 'vitest';
import { AriClient } from '../src/client.js';
import { HttpConnection } from '../src/connection.js';
import { WebSocketManager } from '../src/websocket.js';
import { VersionCompat } from '../src/version.js';
import { resolveOptions } from '../src/types/options.js';
import type { DialEvent } from '../src/events/types.js';
import type { Channel } from '../src/types/api.js';

function makeClient(): AriClient {
  const options = resolveOptions({
    url: 'http://localhost:8088',
    username: 'asterisk',
    password: 'secret',
    app: 'test-app',
  });
  const http = new HttpConnection(options);
  const ws = new WebSocketManager(options);
  const versionCompat = new VersionCompat({ major: 8, breaking: 0, nonBreaking: 0, full: '8.0.0' });
  return new AriClient(options, http, ws, versionCompat);
}

function makeChannel(id: string, name = `PJSIP/test-${id}`): Channel {
  return {
    id,
    name,
    state: 'Down',
    caller: { name: '', number: '' },
    connected: { name: '', number: '' },
    accountcode: '',
    dialplan: { context: 'default', exten: 's', priority: 1 },
    creationtime: '2026-05-08T12:00:00.000+0000',
    language: 'en',
  };
}

function makeDialEvent(peer: Channel, caller?: Channel, dialstatus = 'PROGRESS'): DialEvent {
  return {
    type: 'Dial',
    application: 'test-app',
    timestamp: '2026-05-08T12:00:01.000+0000',
    peer,
    ...(caller ? { caller } : {}),
    dialstatus,
  };
}

describe('Dial event routing to channel instances', () => {
  let client: AriClient;

  beforeEach(() => {
    client = makeClient();
  });

  it('dispatches Dial events to the peer channel instance', () => {
    const peerId = 'peer-channel-001';
    const peer = client.Channel(peerId, makeChannel(peerId));

    let received: DialEvent | undefined;
    let receivedChannel: { id: string } | undefined;
    peer.on('Dial', (event, channel) => {
      received = event;
      receivedChannel = channel;
    });

    const dialEvent = makeDialEvent(makeChannel(peerId), undefined, 'PROGRESS');
    // Re-emit the same channel object that's actually on the event so identity matches
    dialEvent.peer = makeChannel(peerId);

    // Inject the event through the same path the WebSocket would
    // (handleEvent is private but routeEventToInstances is reachable via emit)
    // We simulate the WebSocket message path via the ws emitter.
    (client as unknown as { handleEvent: (e: unknown) => void }).handleEvent(dialEvent);

    expect(received).toBeDefined();
    expect(received?.type).toBe('Dial');
    expect(received?.dialstatus).toBe('PROGRESS');
    expect(receivedChannel?.id).toBe(peerId);
  });

  it('dispatches Dial events to the caller channel instance when present', () => {
    const callerId = 'caller-channel-001';
    const peerId = 'peer-channel-002';
    const callerInstance = client.Channel(callerId, makeChannel(callerId));
    client.Channel(peerId, makeChannel(peerId));

    let callerReceived: DialEvent | undefined;
    callerInstance.on('Dial', (event) => {
      callerReceived = event;
    });

    const dialEvent = makeDialEvent(makeChannel(peerId), makeChannel(callerId), 'RINGING');

    (client as unknown as { handleEvent: (e: unknown) => void }).handleEvent(dialEvent);

    expect(callerReceived).toBeDefined();
    expect(callerReceived?.dialstatus).toBe('RINGING');
  });

  it('dispatches Dial events to BOTH peer and caller instances when both are registered', () => {
    const callerId = 'caller-channel-both';
    const peerId = 'peer-channel-both';
    const callerInstance = client.Channel(callerId, makeChannel(callerId));
    const peerInstance = client.Channel(peerId, makeChannel(peerId));

    let callerCount = 0;
    let peerCount = 0;
    callerInstance.on('Dial', () => callerCount++);
    peerInstance.on('Dial', () => peerCount++);

    const dialEvent = makeDialEvent(makeChannel(peerId), makeChannel(callerId), 'ANSWER');
    (client as unknown as { handleEvent: (e: unknown) => void }).handleEvent(dialEvent);

    expect(callerCount).toBe(1);
    expect(peerCount).toBe(1);
  });

  it('does not throw when no channel instance is registered for the peer', () => {
    const dialEvent = makeDialEvent(makeChannel('unregistered-peer'), undefined, 'BUSY');
    expect(() =>
      (client as unknown as { handleEvent: (e: unknown) => void }).handleEvent(dialEvent)
    ).not.toThrow();
  });
});
