import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AriClient } from '../src/client.js';
import { HttpConnection } from '../src/connection.js';
import { WebSocketManager } from '../src/websocket.js';
import { VersionCompat } from '../src/version.js';
import { resolveOptions } from '../src/types/options.js';
import type { ChannelTransferEvent } from '../src/events/types.js';
import type { Channel } from '../src/types/api.js';

// Endpoints and event shapes from the Asterisk 22.9.0 ARI spec (rest-api/api-docs/*.json)
// that the client was missing or had wrong.

function makeClient(): AriClient {
  const options = resolveOptions({
    url: 'http://localhost:8088',
    username: 'asterisk',
    password: 'secret',
    app: 'test-app',
    instanceReconcileInterval: 0,
  });
  const http = new HttpConnection(options);
  const ws = new WebSocketManager(options);
  const versionCompat = new VersionCompat({ major: 10, breaking: 0, nonBreaking: 0, full: '10.0.0' });
  return new AriClient(options, http, ws, versionCompat);
}

function makeChannel(id: string, overrides: Partial<Channel> = {}): Channel {
  return {
    id,
    name: `PJSIP/test-${id}`,
    state: 'Up',
    caller: { name: '', number: '' },
    connected: { name: '', number: '' },
    accountcode: '',
    dialplan: { context: 'default', exten: 's', priority: 1 },
    creationtime: '2026-09-27T12:00:00.000+0000',
    language: 'en',
    ...overrides,
  };
}

interface RecordedRequest {
  method: string;
  path: string;
  query: Record<string, string>;
  body: unknown;
}

describe('Asterisk 22.9.0 REST coverage', () => {
  let client: AriClient;
  let fetchMock: ReturnType<typeof vi.fn>;
  let nextResponse: () => Response;

  const lastRequest = (): RecordedRequest => {
    const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
    const parsed = new URL(url);
    return {
      method: init.method ?? 'GET',
      path: parsed.pathname,
      query: Object.fromEntries(parsed.searchParams),
      body: init.body === undefined ? undefined : JSON.parse(init.body as string),
    };
  };

  beforeEach(() => {
    client = makeClient();
    nextResponse = () => new Response(null, { status: 204 });
    fetchMock = vi.fn(async () => nextResponse());
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('POST /channels/{channelId}/progress', () => {
    it('is exposed on the channels resource', async () => {
      await client.channels.progress('chan-1');

      expect(lastRequest()).toEqual({
        method: 'POST',
        path: '/ari/channels/chan-1/progress',
        query: {},
        body: undefined,
      });
    });

    it('is exposed on a channel instance', async () => {
      await client.Channel('chan-2', makeChannel('chan-2')).progress();

      expect(lastRequest()).toMatchObject({ method: 'POST', path: '/ari/channels/chan-2/progress' });
    });
  });

  describe('POST /channels/{channelId}/transfer_progress', () => {
    it('sends the state as the states query parameter', async () => {
      await client.channels.transferProgress('chan-1', 'channel_answered');

      expect(lastRequest()).toEqual({
        method: 'POST',
        path: '/ari/channels/chan-1/transfer_progress',
        query: { states: 'channel_answered' },
        body: undefined,
      });
    });

    it('is exposed on a channel instance', async () => {
      await client.Channel('chan-2', makeChannel('chan-2')).transferProgress('channel_progress');

      expect(lastRequest()).toMatchObject({
        method: 'POST',
        path: '/ari/channels/chan-2/transfer_progress',
        query: { states: 'channel_progress' },
      });
    });
  });

  describe('/asterisk/config/dynamic/{configClass}/{objectType}/{id}', () => {
    it('gets a dynamic configuration object', async () => {
      const tuples = [{ attribute: 'allow', value: 'ulaw' }];
      nextResponse = () =>
        new Response(JSON.stringify(tuples), { status: 200, headers: { 'content-type': 'application/json' } });

      const result = await client.asterisk.getObject('res_pjsip', 'endpoint', 'alice');

      expect(result).toEqual(tuples);
      expect(lastRequest()).toEqual({
        method: 'GET',
        path: '/ari/asterisk/config/dynamic/res_pjsip/endpoint/alice',
        query: {},
        body: undefined,
      });
    });

    it('updates an object with the fields wrapped in a "fields" body key', async () => {
      const fields = [
        { attribute: 'allow', value: 'ulaw' },
        { attribute: 'direct_media', value: 'no' },
      ];
      nextResponse = () =>
        new Response(JSON.stringify(fields), { status: 200, headers: { 'content-type': 'application/json' } });

      const result = await client.asterisk.updateObject('res_pjsip', 'endpoint', 'alice', fields);

      expect(result).toEqual(fields);
      expect(lastRequest()).toEqual({
        method: 'PUT',
        path: '/ari/asterisk/config/dynamic/res_pjsip/endpoint/alice',
        query: {},
        body: { fields },
      });
    });

    it('creates an object with defaults when no fields are given', async () => {
      nextResponse = () =>
        new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });

      await client.asterisk.updateObject('res_pjsip', 'aor', 'alice');

      expect(lastRequest()).toMatchObject({ method: 'PUT', body: undefined });
    });

    it('deletes a dynamic configuration object', async () => {
      await client.asterisk.deleteObject('res_pjsip', 'endpoint', 'alice');

      expect(lastRequest()).toMatchObject({
        method: 'DELETE',
        path: '/ari/asterisk/config/dynamic/res_pjsip/endpoint/alice',
      });
    });

    it('encodes path segments', async () => {
      await client.asterisk.deleteObject('res_pjsip', 'endpoint', 'a/b c');

      expect(lastRequest().path).toBe('/ari/asterisk/config/dynamic/res_pjsip/endpoint/a%2Fb%20c');
    });
  });

  describe('POST /events/user/{eventName}', () => {
    it('sends application and sources as query parameters and variables in the body', async () => {
      await client.events.userEvent('CallFlagged', {
        application: 'test-app',
        source: ['channel:chan-1', 'bridge:br-1'],
        variables: { reason: 'vip' },
      });

      expect(lastRequest()).toEqual({
        method: 'POST',
        path: '/ari/events/user/CallFlagged',
        query: { application: 'test-app', source: 'channel:chan-1,bridge:br-1' },
        body: { variables: { reason: 'vip' } },
      });
    });

    it('omits source and body when not given', async () => {
      await client.events.userEvent('Ping', { application: 'test-app' });

      expect(lastRequest()).toEqual({
        method: 'POST',
        path: '/ari/events/user/Ping',
        query: { application: 'test-app' },
        body: undefined,
      });
    });
  });

  describe('PUT /applications/{applicationName}/eventFilter', () => {
    it('sends event types as {type} objects, which is the only form Asterisk accepts', async () => {
      nextResponse = () =>
        new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });

      await client.applications.filter('test-app', {
        allowed: ['StasisStart', { type: 'ChannelDestroyed' }],
        disallowed: ['ChannelVarset'],
      });

      expect(lastRequest()).toMatchObject({
        method: 'PUT',
        path: '/ari/applications/test-app/eventFilter',
        body: {
          allowed: [{ type: 'StasisStart' }, { type: 'ChannelDestroyed' }],
          disallowed: [{ type: 'ChannelVarset' }],
        },
      });
    });

    it('resets the filters when called without one', async () => {
      nextResponse = () =>
        new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });

      await client.applications.filter('test-app');

      expect(lastRequest()).toMatchObject({ method: 'PUT', body: undefined });
    });
  });
});

describe('ChannelTransfer event routing', () => {
  let client: AriClient;

  const handleEvent = (event: unknown): void =>
    (client as unknown as { handleEvent: (e: unknown) => void }).handleEvent(event);

  // Shape built by ari_transfer_to_json() in main/stasis_channels.c: no top-level `channel`,
  // the channel that received the REFER is referred_by.source_channel.
  const makeTransferEvent = (sourceId: string, state?: string): ChannelTransferEvent => ({
    type: 'ChannelTransfer',
    application: 'test-app',
    timestamp: '2026-09-27T12:00:01.000+0000',
    ...(state ? { state } : {}),
    refer_to: {
      requested_destination: { destination: '2000' },
    },
    referred_by: {
      source_channel: makeChannel(sourceId, { state: 'Up' }),
      connected_channel: makeChannel('transferee-1'),
    },
  });

  beforeEach(() => {
    client = makeClient();
  });

  it('dispatches ChannelTransfer to the instance of the channel that received the REFER', () => {
    const source = client.Channel('source-1', makeChannel('source-1', { state: 'Ringing' }));

    let received: ChannelTransferEvent | undefined;
    let receivedChannelId: string | undefined;
    source.on('ChannelTransfer', (event, channel) => {
      received = event;
      receivedChannelId = channel.id;
    });

    handleEvent(makeTransferEvent('source-1', 'channel_progress'));

    expect(received?.refer_to.requested_destination.destination).toBe('2000');
    expect(received?.state).toBe('channel_progress');
    expect(receivedChannelId).toBe('source-1');
    // Instance data is refreshed from the event's channel snapshot
    expect(source.state).toBe('Up');
  });

  it('passes the source channel instance to global listeners', () => {
    let convenienceId: string | undefined;
    client.on('ChannelTransfer', (_event, channel) => {
      convenienceId = channel.id;
    });

    handleEvent(makeTransferEvent('source-2'));

    expect(convenienceId).toBe('source-2');
  });

  it('does not dispatch to the other channels carried in the event', () => {
    const transferee = client.Channel('transferee-1', makeChannel('transferee-1'));
    let calls = 0;
    transferee.on('ChannelTransfer', () => calls++);

    handleEvent(makeTransferEvent('source-3'));

    expect(calls).toBe(0);
  });
});

describe('Channel model fields', () => {
  it('keeps caller_rdnis and tenantid from channel snapshots', () => {
    const client = makeClient();
    const channel = client.Channel('chan-1', makeChannel('chan-1', { caller_rdnis: '5551000', tenantid: 'tenant-a' }));

    expect(channel.caller_rdnis).toBe('5551000');
    expect(channel.tenantid).toBe('tenant-a');
  });
});
