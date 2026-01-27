# @per_moeller/asterisk-ari

Modern TypeScript client for Asterisk ARI (Asterisk REST Interface). A drop-in replacement for the outdated `ari-client` package with full TypeScript support, aggressive WebSocket reconnection, and support for Asterisk 16-23.

## Features

- **Modern TypeScript** - Full type definitions, async/await, Promises
- **Asterisk 16-23 support** - Automatic version detection with compatibility layer
- **Complete ARI API** - All 11 REST resources with 100+ endpoints
- **Robust WebSocket** - Aggressive reconnection with exponential backoff
- **Event system** - Listen to events on resource instances (like ari-client)
- **Connection pooling** - Built-in pool for high-throughput scenarios
- **Request queue** - Automatic retry with circuit breaker pattern
- **Node.js 20+** - Uses native fetch, no external HTTP dependencies

## Installation

```bash
npm install @per_moeller/asterisk-ari
```

## Quick Start

```typescript
import { connect } from '@per_moeller/asterisk-ari';

const client = await connect({
  url: 'http://localhost:8088',
  username: 'asterisk',
  password: 'asterisk',
  app: 'my-app',
});

console.log('Connected to', client.version.toString());

// Create a channel instance
const channel = client.Channel();

// Register events BEFORE originating
channel.on('StasisStart', async (event, ch) => {
  console.log('Channel started:', ch.name);
  await ch.answer();
  await ch.play({ media: 'sound:hello-world' });
});

channel.on('StasisEnd', () => {
  console.log('Channel ended');
  client.stop();
});

// Originate the call
await channel.originate({
  endpoint: 'PJSIP/1000',
  app: 'my-app',
});
```

## Connection Options

```typescript
const client = await connect({
  // Required
  url: 'http://localhost:8088',
  username: 'asterisk',
  password: 'asterisk',
  app: 'my-app',

  // Optional
  subscribeAll: false,              // Subscribe to all Asterisk events
  reconnect: true,                  // Enable auto-reconnect
  reconnectInterval: 1000,          // Initial reconnect delay (ms)
  maxReconnectInterval: 30000,      // Max reconnect delay (ms)
  reconnectBackoffMultiplier: 1.5,  // Backoff multiplier
  pingInterval: 30000,              // WebSocket ping interval (ms)
  pingTimeout: 5000,                // Ping response timeout (ms)
  requestTimeout: 30000,            // HTTP request timeout (ms)
});
```

## API Resources

All ARI resources are available on the client:

```typescript
// Channels
const channels = await client.channels.list();
const channel = await client.channels.get('channel-id'); // Returns ChannelInstance
await client.channels.hangup('channel-id');

// Bridges
const bridges = await client.bridges.list();
const bridge = await client.bridges.get('bridge-id'); // Returns BridgeInstance
await client.bridges.addChannel(bridge.id, { channel: 'channel-id' });

// Endpoints
const endpoints = await client.endpoints.list();
const endpoint = await client.endpoints.get('PJSIP', '1000');

// Applications
const apps = await client.applications.list();
await client.applications.subscribe('my-app', 'channel:channel-id');

// Playbacks
const playback = await client.playbacks.get('playback-id'); // Returns PlaybackInstance
await client.playbacks.control('playback-id', 'pause');

// Recordings
const recordings = await client.recordings.stored.list();
await client.recordings.live.stop('recording-name');

// Sounds
const sounds = await client.sounds.list({ lang: 'en' });

// Mailboxes
const mailboxes = await client.mailboxes.list();

// Device States
const states = await client.deviceStates.list();

// Asterisk
const info = await client.asterisk.getInfo();
```

## Resource Instances

Create instances to receive events and call methods:

### Channel

```typescript
const channel = client.Channel();

channel.on('StasisStart', async (event, ch) => {
  await ch.answer();
  await ch.play({ media: 'sound:hello-world' });
});

channel.on('ChannelDtmfReceived', (event, ch) => {
  console.log('DTMF:', event.digit);
});

channel.on('StasisEnd', (event, ch) => {
  ch.removeAllListeners();
});

await channel.originate({
  endpoint: 'PJSIP/1000',
  app: 'my-app',
});
```

### Bridge

```typescript
// Create a new bridge
const bridge = await client.Bridge({ type: 'mixing' });

bridge.on('ChannelEnteredBridge', (event, br) => {
  console.log('Channel entered:', event.channel.name);
});

bridge.on('ChannelLeftBridge', (event, br) => {
  if (br.channels.length === 0) {
    br.destroy();
  }
});

await bridge.addChannel({ channel: channel.id });

// Load an existing bridge
const existing = await client.bridges.get('bridge-id');
```

### Playback

```typescript
const playback = await channel.play({ media: 'sound:hello-world' });

playback.on('PlaybackFinished', () => {
  console.log('Playback done');
});

// Control playback
await playback.pause();
await playback.unpause();
await playback.stop();
```

### Recording

```typescript
const recording = await channel.record({
  name: 'my-recording',
  format: 'wav',
});

recording.on('RecordingFinished', () => {
  console.log('Recording saved');
});

await recording.pause();
await recording.unpause();
await recording.stop();
```

## Global Events

Listen to all events on the client:

```typescript
// All events
client.on('*', (event) => {
  console.log('Event:', event.type);
});

// Specific events
client.on('StasisStart', (event) => {
  console.log('New channel:', event.channel.name);
});

client.on('ChannelDestroyed', (event) => {
  console.log('Channel destroyed:', event.channel.id);
});
```

## Connection Pool

For high-throughput scenarios:

```typescript
import { createPool } from '@per_moeller/asterisk-ari';

const pool = await createPool({
  url: 'http://localhost:8088',
  username: 'asterisk',
  password: 'asterisk',
  app: 'pool-app',
  poolSize: 5,
});

// Get connection (round-robin)
const client = pool.getConnection();

// Use the client
const channel = client.Channel();
await channel.originate({ endpoint: 'PJSIP/1000', app: 'pool-app' });

// Cleanup
await pool.stop();
```

## Request Queue

For automatic retry and circuit breaker:

```typescript
import { RequestQueue } from '@per_moeller/asterisk-ari';

const queue = new RequestQueue({
  maxConcurrent: 10,
  maxRetries: 3,
  retryDelay: 1000,
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 30000,
});

// Enqueue requests
const result = await queue.enqueue(() => client.channels.list());
```

## Version Compatibility

The client automatically detects the Asterisk version and adjusts API calls:

```typescript
console.log(client.version.toString()); // "Asterisk 20 (ARI 8.0.0)"
console.log(client.version.asteriskVersion); // 20
console.log(client.version.hasExternalMedia); // true (Asterisk 18+)
console.log(client.version.hasProtocolId); // true (Asterisk 20+)
```

## Event Types

Full TypeScript types for all 30+ event types:

- Channel: `StasisStart`, `StasisEnd`, `ChannelCreated`, `ChannelDestroyed`, `ChannelStateChange`, `ChannelDtmfReceived`, `ChannelHangupRequest`, `ChannelVarset`, `ChannelHold`, `ChannelUnhold`, `ChannelTalkingStarted`, `ChannelTalkingFinished`, `ChannelConnectedLine`, `ChannelDialplan`, `ChannelCallerId`, `ChannelToneDetected`
- Bridge: `BridgeCreated`, `BridgeDestroyed`, `BridgeMerged`, `BridgeVideoSourceChanged`, `BridgeBlindTransfer`, `BridgeAttendedTransfer`, `ChannelEnteredBridge`, `ChannelLeftBridge`
- Playback: `PlaybackStarted`, `PlaybackContinuing`, `PlaybackFinished`
- Recording: `RecordingStarted`, `RecordingFinished`, `RecordingFailed`
- Other: `EndpointStateChange`, `PeerStatusChange`, `ContactStatusChange`, `DeviceStateChanged`, `TextMessageReceived`, `Dial`, `ApplicationReplaced`, `ApplicationMoveFailed`

## License

MIT
