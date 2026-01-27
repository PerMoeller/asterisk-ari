# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/claude-code) when working with this repository.

## Project Overview

This is `@per_moeller/asterisk-ari`, a modern TypeScript client for Asterisk ARI (Asterisk REST Interface). It serves as a drop-in replacement for the outdated `ari-client` package with full TypeScript support, WebSocket reconnection, and support for Asterisk 16-23.

## Build & Development Commands

```bash
npm run build      # Compile TypeScript to dist/
npm run watch      # Watch mode compilation
npm run test       # Run tests with vitest (watch mode)
npm run test:run   # Run tests once
npm run lint       # ESLint check on src/
npm run format     # Prettier format src/
```

## Architecture

### Directory Structure

- `src/` - Source code
  - `client.ts` - Main `AriClient` class and `connect()` function
  - `connection.ts` - HTTP connection handler using native fetch
  - `websocket.ts` - WebSocket manager with reconnection logic
  - `version.ts` - ARI/Asterisk version detection
  - `pool.ts` - Connection pooling for high-throughput
  - `queue.ts` - Request queue with circuit breaker pattern
  - `resources/` - REST API resource classes (channels, bridges, etc.)
  - `models/` - Instance wrappers with event emitters (Channel, Bridge, Playback, Recording)
  - `events/` - Event types and typed event emitter
  - `types/` - TypeScript type definitions
- `examples/` - Usage examples
- `dist/` - Compiled output (ESM only)

### Key Patterns

1. **ESM-only** - Uses `"type": "module"` with NodeNext resolution. All imports must use `.js` extension.

2. **Instance-based event handling** - Create instances via `client.Channel()`, `client.Bridge()`, etc. Register event listeners on instances before operations. Events are routed to specific instances by ID.

3. **Resource classes** - Direct API access via `client.channels`, `client.bridges`, etc. These wrap the REST endpoints.

4. **Version compatibility** - `VersionCompat` class provides feature flags like `hasExternalMedia` (Asterisk 18+), `hasProtocolId` (Asterisk 20+).

### TypeScript Configuration

- Target: ES2022
- Strict mode enabled
- `noUncheckedIndexedAccess: true` - Array/object access returns `T | undefined`

## Testing

Uses Vitest. Run `npm test` for watch mode or `npm run test:run` for single run.

## Publishing

Package is published to npm as `@per_moeller/asterisk-ari`. The `prepublishOnly` script runs the build automatically.
