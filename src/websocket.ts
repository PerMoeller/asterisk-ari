/**
 * WebSocket manager with aggressive reconnection
 */

import WebSocket from 'ws';
import { ConnectionEventEmitter } from './events/emitter.js';
import type { ResolvedOptions } from './types/options.js';
import type { AriEvent } from './events/types.js';

export interface WebSocketManagerOptions {
  url: string;
  username: string;
  password: string;
  app: string;
  subscribeAll: boolean;
  reconnect: boolean;
  reconnectInterval: number;
  maxReconnectInterval: number;
  reconnectBackoffMultiplier: number;
  pingInterval: number;
  pingTimeout: number;
}

/**
 * WebSocket connection manager with automatic reconnection
 */
export class WebSocketManager extends ConnectionEventEmitter {
  private ws: WebSocket | null = null;
  private reconnecting = false;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  private readonly wsUrl: string;
  private readonly options: WebSocketManagerOptions;

  constructor(options: ResolvedOptions) {
    super();
    this.options = {
      url: options.url,
      username: options.username,
      password: options.password,
      app: options.app,
      subscribeAll: options.subscribeAll,
      reconnect: options.reconnect,
      reconnectInterval: options.reconnectInterval,
      maxReconnectInterval: options.maxReconnectInterval,
      reconnectBackoffMultiplier: options.reconnectBackoffMultiplier,
      pingInterval: options.pingInterval,
      pingTimeout: options.pingTimeout,
    };
    this.wsUrl = this.buildWebSocketUrl();
  }

  /**
   * Build the WebSocket URL with authentication and parameters
   */
  private buildWebSocketUrl(): string {
    const httpUrl = new URL(this.options.url);
    const protocol = httpUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = new URL(`${protocol}//${httpUrl.host}/ari/events`);

    wsUrl.searchParams.set('api_key', `${this.options.username}:${this.options.password}`);
    wsUrl.searchParams.set('app', this.options.app);

    if (this.options.subscribeAll) {
      wsUrl.searchParams.set('subscribeAll', 'true');
    }

    return wsUrl.toString();
  }

  /**
   * Calculate reconnect delay with exponential backoff
   */
  private getReconnectDelay(): number {
    const delay = this.options.reconnectInterval *
      Math.pow(this.options.reconnectBackoffMultiplier, this.reconnectAttempts);
    return Math.min(delay, this.options.maxReconnectInterval);
  }

  /**
   * Connect to the WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.intentionalClose = false;
      this.ws = new WebSocket(this.wsUrl);

      const onOpen = (): void => {
        this.ws?.removeListener('error', onError);
        this.reconnectAttempts = 0;
        this.reconnecting = false;
        this.startPingInterval();
        this.emit('connected', undefined);
        resolve();
      };

      const onError = (error: Error): void => {
        this.ws?.removeListener('open', onOpen);
        reject(error);
      };

      this.ws.once('open', onOpen);
      this.ws.once('error', onError);

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const event = JSON.parse(data.toString()) as AriEvent;
          this.emit('message', event);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });

      this.ws.on('close', (code: number, reason: Buffer) => {
        this.stopPingInterval();

        if (!this.intentionalClose) {
          this.emit('disconnected', { intentional: false });
          if (this.options.reconnect) {
            this.scheduleReconnect();
          }
        } else {
          this.emit('disconnected', { intentional: true });
        }
      });

      this.ws.on('error', (error: Error) => {
        this.emit('error', error);
      });

      this.ws.on('pong', () => {
        if (this.pongTimer) {
          clearTimeout(this.pongTimer);
          this.pongTimer = null;
        }
      });
    });
  }

  /**
   * Start the ping interval for keep-alive
   */
  private startPingInterval(): void {
    this.stopPingInterval();

    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();

        // Set pong timeout
        this.pongTimer = setTimeout(() => {
          console.warn('WebSocket ping timeout, reconnecting...');
          this.ws?.terminate();
        }, this.options.pingTimeout);
      }
    }, this.options.pingInterval);
  }

  /**
   * Stop the ping interval
   */
  private stopPingInterval(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnecting || this.intentionalClose) {
      return;
    }

    this.reconnecting = true;
    const delay = this.getReconnectDelay();
    this.reconnectAttempts++;

    this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
        this.emit('reconnected', undefined);
      } catch (error) {
        // Will trigger another reconnect via the close handler
        console.error('Reconnection failed:', error);
      }
    }, delay);
  }

  /**
   * Disconnect from the WebSocket
   */
  disconnect(): void {
    this.intentionalClose = true;
    this.reconnecting = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopPingInterval();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get current reconnect attempts
   */
  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }
}
