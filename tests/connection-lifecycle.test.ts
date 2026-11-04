import { describe, it, expect, afterEach } from 'vitest';
import { WebSocketServer } from 'ws';
import type { AddressInfo } from 'node:net';
import { AriClient } from '../src/client.js';
import { HttpConnection } from '../src/connection.js';
import { WebSocketManager } from '../src/websocket.js';
import { VersionCompat } from '../src/version.js';
import { resolveOptions } from '../src/types/options.js';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function makeOptions(url = 'http://localhost:8088', password = 'secret') {
  return resolveOptions({
    url,
    username: 'asterisk',
    password,
    app: 'test-app',
    reconnectInterval: 20,
    maxReconnectInterval: 20,
  });
}

/** Local WebSocket server standing in for Asterisk's /ari/events endpoint. */
async function startServer(accept: boolean) {
  let attempts = 0;
  const server = new WebSocketServer({
    port: 0,
    verifyClient: (_info, done) => {
      attempts++;
      done(accept, accept ? undefined : 401);
    },
  });
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  const { port } = server.address() as AddressInfo;
  return {
    server,
    url: `http://127.0.0.1:${port}`,
    attempts: () => attempts,
    close: () => new Promise<void>((resolve) => {
      for (const client of server.clients) client.terminate();
      server.close(() => resolve());
    }),
  };
}

describe('HttpConnection.getCredentials', () => {
  it('keeps colons that are part of the password', () => {
    const http = new HttpConnection(makeOptions('http://localhost:8088', 'p:ss:word'));
    expect(http.getCredentials()).toEqual({ username: 'asterisk', password: 'p:ss:word' });
  });

  it('still handles a password without colons', () => {
    const http = new HttpConnection(makeOptions());
    expect(http.getCredentials()).toEqual({ username: 'asterisk', password: 'secret' });
  });
});

describe('WebSocketManager reconnection', () => {
  let cleanup: Array<() => Promise<void> | void> = [];

  afterEach(async () => {
    for (const fn of cleanup.reverse()) await fn();
    cleanup = [];
  });

  it('does not keep retrying in the background when the initial connection fails', async () => {
    const srv = await startServer(false);
    cleanup.push(srv.close);
    const ws = new WebSocketManager(makeOptions(srv.url));
    cleanup.push(() => ws.disconnect());
    ws.on('error', () => {}); // e.g. an application logging WebSocket errors

    await expect(ws.connect()).rejects.toBeTruthy();
    await sleep(150); // several reconnect intervals

    expect(srv.attempts()).toBe(1);
    expect(ws.getReconnectAttempts()).toBe(0);
    expect(ws.isConnected()).toBe(false);
  });

  it('does not raise an uncaught exception when the initial connection fails', async () => {
    const srv = await startServer(false);
    cleanup.push(srv.close);
    const uncaught: unknown[] = [];
    const onUncaught = (err: unknown) => uncaught.push(err);
    process.on('uncaughtException', onUncaught);
    cleanup.push(() => { process.off('uncaughtException', onUncaught); });
    // No 'error' listener: this is the state of the manager inside connect(), before
    // an AriClient exists. The failure must only surface through the rejected promise.
    const ws = new WebSocketManager(makeOptions(srv.url));
    cleanup.push(() => ws.disconnect());

    await expect(ws.connect()).rejects.toBeTruthy();
    await sleep(50);

    expect(uncaught).toEqual([]);
  });

  it('still reconnects automatically after an established connection drops', async () => {
    const srv = await startServer(true);
    cleanup.push(srv.close);
    const ws = new WebSocketManager(makeOptions(srv.url));
    cleanup.push(() => ws.disconnect());

    await ws.connect();
    const reconnected = new Promise<void>((resolve) => ws.once('reconnected', () => resolve()));
    for (const client of srv.server.clients) client.terminate();

    await reconnected;
    expect(srv.attempts()).toBe(2);
    expect(ws.isConnected()).toBe(true);
  });
});

describe('AriClient connection events', () => {
  function makeClient() {
    const options = makeOptions();
    const ws = new WebSocketManager(options);
    const client = new AriClient(
      options,
      new HttpConnection(options),
      ws,
      new VersionCompat({ major: 8, breaking: 0, nonBreaking: 0, full: '8.0.0' })
    );
    return { client, ws };
  }

  it('relays connection lifecycle events to the client', () => {
    const { client, ws } = makeClient();
    const received: Array<[string, unknown]> = [];
    client
      .onConnectionEvent('connected', (d) => received.push(['connected', d]))
      .onConnectionEvent('disconnected', (d) => received.push(['disconnected', d]))
      .onConnectionEvent('reconnecting', (d) => received.push(['reconnecting', d]))
      .onConnectionEvent('reconnected', (d) => received.push(['reconnected', d]));

    ws.emit('disconnected', { intentional: false });
    ws.emit('reconnecting', { attempt: 1, delay: 1000 });
    ws.emit('connected', undefined);
    ws.emit('reconnected', undefined);

    expect(received).toEqual([
      ['disconnected', { intentional: false }],
      ['reconnecting', { attempt: 1, delay: 1000 }],
      ['connected', undefined],
      ['reconnected', undefined],
    ]);
    client.stop();
  });

  it('removes a listener with offConnectionEvent', () => {
    const { client, ws } = makeClient();
    let calls = 0;
    const listener = () => { calls++; };
    client.onConnectionEvent('disconnected', listener);
    ws.emit('disconnected', { intentional: false });
    client.offConnectionEvent('disconnected', listener);
    ws.emit('disconnected', { intentional: false });

    expect(calls).toBe(1);
    client.stop();
  });
});
