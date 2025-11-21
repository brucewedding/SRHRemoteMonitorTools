# Broadcast Logic Implementation

## Overview
This document describes the implementation of the broadcast logic for the telemetry conversion system, fulfilling task 10 from the implementation plan.

## Requirements Addressed

### Requirement 6.1: State updates trigger broadcasts
- **Implementation**: `broadcastAggregatedState()` is called after each state update in `processMessageBuffer()`
- **Location**: `server/fastify-server.js` line 200
- **Validation**: Tested in `broadcast.test.js` test 8

### Requirement 6.2: Include timestamp in broadcast
- **Implementation**: Timestamp is set to `Date.now()` before broadcasting in `broadcastAggregatedState()`
- **Location**: `server/fastify-server.js` line 221
- **Validation**: Tested in `broadcast.test.js` test 1

### Requirement 6.3: Timeout logic to continue broadcasting last known state
- **Implementation**: 
  - `lastTelemetryTime` tracks when last telemetry was received
  - `broadcastLastKnownState()` runs periodically (every 100ms)
  - If no telemetry for 5 seconds, broadcasts last known state
- **Location**: `server/fastify-server.js` lines 264-298
- **Configuration**: 
  - `BROADCAST_TIMEOUT_MS = 5000` (5 seconds)
  - `BROADCAST_INTERVAL_MS = 100` (100ms)
- **Validation**: Tested in `broadcast.test.js` tests 6-7

### Requirement 6.4: Preserve SystemId for client filtering
- **Implementation**: SystemId is preserved in the state structure and stored per system
- **Location**: `server/fastify-server.js` lines 224-227
- **Validation**: Tested in `broadcast.test.js` test 2

### Requirement 10.2: Filter broadcasts by SystemId for each client
- **Implementation**: 
  - `systemStates` Map tracks state per SystemId
  - Broadcasts check `client.systemToWatch` and only send matching states
- **Location**: `server/fastify-server.js` lines 232-246
- **Validation**: Tested in `broadcast.test.js` test 5

## Key Components

### 1. State Tracking
```javascript
const systemStates = new Map(); // Track state per SystemId
let lastTelemetryTime = Date.now(); // Track last telemetry time
```

### 2. Broadcast Functions

#### `broadcastAggregatedState()`
- Called after each state update
- Includes timestamp in broadcast
- Preserves SystemId
- Filters by SystemId for each client
- Stores state in `systemStates` Map

#### `broadcastLastKnownState()`
- Runs periodically (every 100ms)
- Checks if timeout exceeded (5 seconds)
- Broadcasts last known state for each system
- Updates timestamp to current time
- Filters by SystemId for each client

### 3. Periodic Broadcasting
```javascript
setInterval(broadcastLastKnownState, BROADCAST_INTERVAL_MS);
```

## Testing

All broadcast functionality is tested in `server/broadcast.test.js`:

1. ✓ Timestamp inclusion (Requirement 6.2)
2. ✓ SystemId preservation (Requirement 6.4)
3. ✓ State structure correctness
4. ✓ Multiple SystemId tracking
5. ✓ Client filtering by SystemId (Requirement 10.2)
6. ✓ Timeout logic for last known state (Requirement 6.3)
7. ✓ No broadcast when timeout not exceeded
8. ✓ State updates trigger broadcasts (Requirement 6.1)

## Integration with Existing Code

The broadcast logic integrates seamlessly with:
- **Message Parser**: Receives parsed messages
- **State Aggregator**: Gets current state for broadcasting
- **WebSocket Server**: Uses existing client connections
- **System Tracking**: Uses existing `connectedSystems` Map

## Configuration

Broadcast behavior can be configured via constants:
- `BROADCAST_TIMEOUT_MS`: Time without telemetry before broadcasting last known state (default: 5000ms)
- `BROADCAST_INTERVAL_MS`: How often to check for timeout and broadcast (default: 100ms)

## Future Enhancements

Potential improvements:
1. Make timeout configurable per system
2. Add broadcast rate limiting
3. Add broadcast compression for large states
4. Add broadcast metrics/monitoring
