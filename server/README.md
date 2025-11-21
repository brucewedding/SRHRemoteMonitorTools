# Server Migration: Express to Fastify

## Overview

This directory contains both the legacy Express server and the new Fastify server implementation.

## Files

- `server.js` - Legacy Express server (preserved for reference)
- `fastify-server.js` - New Fastify server with WebSocket support

## Running the Servers

### Fastify Server (New)
```bash
npm run start:fastify
```

### Express Server (Legacy)
```bash
npm start
```

## Development Mode

### With Fastify
```bash
npm run dev:fastify
```

### With Express (Legacy)
```bash
npm run dev
```

## Features Implemented

### Fastify Server
- ✅ WebSocket support via `@fastify/websocket`
- ✅ CORS support via `@fastify/cors`
- ✅ Structured logging with Pino
- ✅ Error handling and graceful shutdown
- ✅ Health check endpoint (`/health`)
- ✅ Preserved all WebSocket connection management logic
- ✅ Preserved client authentication and system selection
- ✅ Preserved message broadcasting functionality
- ✅ Preserved system tracking and cleanup

## Key Differences from Express

1. **Logging**: Fastify uses Pino for structured logging instead of console.log
2. **WebSocket**: Uses `@fastify/websocket` plugin instead of `ws` library directly
3. **Performance**: Fastify provides better performance and lower overhead
4. **Type Safety**: Better TypeScript support (can be added later)
5. **Plugin System**: Modular architecture with Fastify plugins

## Health Check

The Fastify server includes a health check endpoint:

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-21T12:10:25.551Z"
}
```

## Next Steps

1. Implement message parser for telemetry data
2. Create state aggregator for message processing
3. Add message type handlers
4. Integrate with frontend
