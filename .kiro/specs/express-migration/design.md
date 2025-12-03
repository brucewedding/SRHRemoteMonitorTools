# Design Document: Express Server Migration

## Overview

This design outlines the migration of advanced telemetry processing features from the Fastify-based WebSocket server to the existing Express-based WebSocket server. The migration will preserve all existing functionality while adding message parsing, state aggregation, memory monitoring, buffer cleaning, and broadcast throttling capabilities.

The Express server currently handles basic WebSocket connections, system tracking, and message broadcasting. This migration will enhance it with:

- Structured telemetry message processing with timestamp-based ordering
- State aggregation for real-time monitoring dashboards
- Memory monitoring with automatic restart on critical thresholds
- Circular buffer cleaning to prevent unbounded memory growth
- Adaptive broadcast throttling under memory pressure
- Enhanced diagnostic logging for operational visibility

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Express HTTP Server                      │
│                    (with WebSocket support)                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Message    │ │    State     │ │   Memory     │
│   Parser     │ │  Aggregator  │ │   Monitor    │
└──────────────┘ └──────────────┘ └──────────────┘
        │               │               │
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Message    │ │   Broadcast  │ │    Buffer    │
│   Buffer     │ │  Throttler   │ │   Cleaner    │
└──────────────┘ └──────────────┘ └──────────────┘
```

### Component Integration

The Express server will integrate existing components without modification:

1. **MessageParser**: Validates and parses incoming telemetry messages
2. **StateAggregator**: Maintains aggregated state from parsed messages
3. **MemoryMonitor**: Tracks heap usage and triggers alerts
4. **BufferCleaner**: Removes stale data from circular buffers
5. **BroadcastThrottler**: Adjusts broadcast frequency based on memory pressure

### Data Flow

```
Device → WebSocket → Message Buffer → Sort by Timestamp → Parse → 
State Aggregator → Broadcast Filter → WebSocket Clients
                                ↓
                        Memory Monitor → Throttler
                                ↓
                        Buffer Cleaner
```

## Components and Interfaces

### 1. Message Processing Pipeline

**Message Buffer**
- Array-based buffer with configurable size (100 messages)
- FIFO eviction when at capacity
- Periodic processing every 50ms
- Timestamp-based sorting before processing

**Processing Flow**
```javascript
// Pseudo-code interface
processTelemetryMessage(rawMessage) → boolean
processMessageBuffer() → void
```

### 2. State Management

**State Aggregator Integration**
```javascript
const stateAggregator = new StateAggregator();

// Update state with parsed message
stateAggregator.updateState(parsedMessage);

// Get current state for broadcasting
const state = stateAggregator.getState();
```

**System State Tracking**
- Map of SystemId → aggregated state
- Automatic cleanup on system disconnect
- Per-system broadcast filtering

### 3. Memory Management

**Memory Monitor Integration**
```javascript
const memoryMonitor = new MemoryMonitor({
  warningThresholdMB: 350,
  criticalThresholdMB: 400,
  logger: console,
  onCritical: () => process.exit(1)
});

// Enhanced diagnostics
memoryMonitor.check({
  messageBufferSize: messageBuffer.length,
  systemStatesSize: systemStates.size,
  connectedSystemsSize: connectedSystems.size,
  wsClientsSize: wsClients.size
});

// Start monitoring
memoryMonitor.startMonitoring(30000); // 30 seconds
```

**Buffer Cleaner Integration**
```javascript
const bufferCleaner = new BufferCleaner(stateAggregator, {
  timeoutMs: 300000, // 5 minutes
  logger: console
});

// Start cleaning
bufferCleaner.startCleaning(60000); // 60 seconds
```

### 4. Broadcast Optimization

**Throttler Integration**
```javascript
const broadcastThrottler = new BroadcastThrottler({
  normalIntervalMs: 100,
  throttledIntervalMs: 500,
  memoryThresholdMB: 350
});

// Check before broadcasting
const heapUsageMB = process.memoryUsage().heapUsed / 1024 / 1024;
if (broadcastThrottler.shouldBroadcastNow(heapUsageMB)) {
  // Perform broadcast
  broadcastThrottler.recordBroadcast();
}
```

**Per-System Throttling**
- Map of SystemId → last broadcast time
- Minimum 100ms interval per system
- Cleanup on system disconnect

### 5. WebSocket Connection Management

**Connection Tracking** (preserved from existing Express server)
- `wsClients`: Map of WebSocket → email/SystemId
- `connectedSystems`: Map of SystemId → Set of watching clients
- `waitingClients`: Set of clients waiting for a system
- `systemStates`: Map of SystemId → aggregated state

**Connection Lifecycle**
```javascript
wss.on('connection', (ws, req) => {
  // Parse query parameters
  // Initialize client tracking
  // Send initial systems list
  
  ws.on('message', (data) => {
    // Handle telemetry messages
    // Handle device messages
    // Handle system messages
  });
  
  ws.on('close', () => {
    // Clean up all tracking structures
    // Remove from wsClients, waitingClients, connectedSystems
    // Delete system states for disconnected systems
  });
});
```

## Data Models

### Telemetry Message Structure

```javascript
{
  messageType: string,      // e.g., "MotorCurrent", "StreamingPressure"
  timestampUtc: number,     // Unix timestamp in milliseconds
  source: string,           // "CAN" or "UDP"
  data: {
    pumpSide: string,       // "Left", "Right", or "All"
    // ... message-specific fields
  }
}
```

### Aggregated State Structure

```javascript
{
  SystemId: string,
  HeartRate: number,
  LeftHeart: {
    PowerConsumption: number,
    AtrialPressure: number,
    CardiacOutput: number,
    TargetStrokeLen: number,
    ActualStrokeLen: number,
    IntPressure: number,
    IntPressureMin: number,
    IntPressureMax: number,
    MedicalPressure: SensorData
  },
  RightHeart: { /* same structure as LeftHeart */ },
  CVPSensor: SensorData,
  PAPSensor: SensorData,
  AoPSensor: SensorData,
  ArtPressSensor: SensorData,
  IvcPressSensor: SensorData,
  StreamingPressure: {
    leftAtrial: Array<PressurePoint>,
    rightAtrial: Array<PressurePoint>,
    leftVentricular: Array<PressurePoint>,
    rightVentricular: Array<PressurePoint>,
    aortic: Array<PressurePoint>,
    pulmonaryArterial: Array<PressurePoint>
  },
  StatusData: SystemStatus,
  OperationState: string,
  HeartStatus: string,
  Timestamp: number,
  _telemetryStatus: {
    noDataReceived: boolean,
    leftHeartAvailable: boolean,
    rightHeartAvailable: boolean
  }
}
```

### Broadcast Message Structure

```javascript
// State broadcast
{
  ...AggregatedState,
  Timestamp: number  // Updated to current time
}

// Systems list broadcast
{
  type: 'systems_list',
  systems: Array<string>,
  timestamp: string
}

// Device message broadcast
{
  type: 'deviceMessage',
  timestamp: string,
  username: string,
  message: string,
  self: boolean  // Only for sender
}
```

## Cor
rectness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

After reviewing the acceptance criteria, several properties are redundant and can be consolidated:
- Properties 2.3 and 6.2 both verify timestamps in broadcasts (consolidated to Property 3)
- Properties 2.4 and 6.4 both verify SystemId preservation (consolidated to Property 4)
- Properties 1.2 and 9.2 both verify timestamp sorting (consolidated to Property 2)
- Properties 6.5 and 10.2 both verify client filtering (consolidated to Property 15)

### Message Processing Properties

**Property 1: Telemetry message parsing**
*For any* telemetry message received, the message should be parsed using MessageParser before being added to the message buffer
**Validates: Requirements 1.1**

**Property 2: Timestamp-ordered processing**
*For any* set of buffered messages, when processed, they should be sorted by timestampUtc in ascending order before state updates
**Validates: Requirements 1.2, 9.2**

**Property 3: Buffer capacity enforcement**
*For any* message buffer at capacity (100 messages), adding a new message should result in the oldest message being removed
**Validates: Requirements 1.3**

**Property 4: Error resilience**
*For any* parsing error or processing error, the server should log the error and continue processing remaining messages without crashing
**Validates: Requirements 1.5, 9.5**

### State Management Properties

**Property 5: State update propagation**
*For any* parsed telemetry message, processing it should result in the StateAggregator being updated with the message data
**Validates: Requirements 2.1**

**Property 6: Broadcast on state update**
*For any* state update, a broadcast should be sent to connected clients (subject to throttling)
**Validates: Requirements 2.2, 9.4**

**Property 7: Broadcast timestamp inclusion**
*For any* broadcast message, it should contain a Timestamp field with the current time
**Validates: Requirements 2.3, 6.2**

**Property 8: SystemId preservation**
*For any* broadcast message, if the state contains a SystemId, it should be preserved in the broadcast
**Validates: Requirements 2.4, 6.4**

**Property 9: Per-system state storage**
*For any* SystemId present in telemetry, the aggregated state for that SystemId should be stored in the systemStates map
**Validates: Requirements 2.5**

### Memory Management Properties

**Property 10: Memory diagnostic inclusion**
*For any* memory check, the diagnostic data should include messageBufferSize, systemStatesSize, connectedSystemsSize, and wsClientsSize
**Validates: Requirements 3.4**

**Property 11: Buffer cleaning**
*For any* circular buffer channel, when cleaning is triggered, all data points older than the timeout threshold should be removed
**Validates: Requirements 4.2**

### Connection Management Properties

**Property 12: Client cleanup on disconnect**
*For any* client that disconnects, it should be removed from wsClients, waitingClients, and all system watcher sets in connectedSystems
**Validates: Requirements 5.1, 5.3**

**Property 13: Empty system cleanup**
*For any* system entry in connectedSystems with zero watchers, it should be removed from the map
**Validates: Requirements 5.2**

**Property 14: Closed connection skipping**
*For any* iteration over WebSocket clients, closed connections (readyState !== 1) should be skipped without storing references
**Validates: Requirements 5.4**

**Property 15: System state cleanup**
*For any* system that disconnects, its entry in systemStates and lastBroadcastTime should be deleted
**Validates: Requirements 5.5, 12.4**

### Broadcast Filtering Properties

**Property 16: Broadcast to all clients**
*For any* state update, all connected WebSocket clients with readyState === 1 should receive a broadcast (subject to filtering and throttling)
**Validates: Requirements 6.1**

**Property 17: SystemId filtering**
*For any* client with a systemToWatch property, broadcasts should only be sent if the state's SystemId matches the client's systemToWatch
**Validates: Requirements 6.5, 10.2**

**Property 18: Unfiltered client broadcasts**
*For any* client without a systemToWatch property, all state updates should be broadcast to that client
**Validates: Requirements 10.3**

### Throttling Properties

**Property 19: Memory-based throttling**
*For any* broadcast attempt when heap usage exceeds the memory threshold, the BroadcastThrottler should enforce the throttled interval
**Validates: Requirements 7.1, 7.2, 7.4**

**Property 20: Per-system broadcast throttling**
*For any* SystemId, broadcasts should be throttled to a minimum interval of 100ms, with broadcasts attempted sooner being skipped
**Validates: Requirements 12.1, 12.2**

**Property 21: Broadcast time tracking**
*For any* SystemId that has been broadcast, the lastBroadcastTime map should contain an entry with the timestamp of the last broadcast
**Validates: Requirements 12.3**

### Client Association Properties

**Property 22: Client-system association**
*For any* client connecting with a systemId query parameter, the client should be added to the watchers set for that SystemId in connectedSystems
**Validates: Requirements 10.1**

**Property 23: Waiting client connection**
*For any* new system that connects, all clients in waitingClients should be connected to that system and removed from waitingClients
**Validates: Requirements 10.5**

**Property 24: Client migration on system disconnect**
*For any* system that disconnects, all clients watching that system should be moved to waitingClients
**Validates: Requirements 10.4**

### Processing Order Properties

**Property 25: Sequential state updates**
*For any* batch of messages processed, state updates should occur in timestamp order (oldest first)
**Validates: Requirements 9.3**

### Diagnostic Logging Properties

**Property 26: Diagnostic completeness**
*For any* diagnostic log entry, it should include buffer sizes (messageBuffer, systemStates) and connection counts (connectedSystems, wsClients, waitingClients)
**Validates: Requirements 11.5**

## Error Handling

### Message Processing Errors

**Parse Errors**
- Log error with message details
- Continue processing other messages
- Do not crash the server

**State Update Errors**
- Log error with message type and data
- Continue processing remaining messages
- Preserve existing state

**Broadcast Errors**
- Log error with client details
- Continue broadcasting to other clients
- Do not remove client from tracking

### Memory Errors

**Warning Threshold Exceeded**
- Log warning with diagnostic information
- Activate broadcast throttling
- Continue normal operation

**Critical Threshold Exceeded**
- Log critical error
- Exit process with code 1
- Allow PM2 to restart the server

### Connection Errors

**WebSocket Errors**
- Log error details
- Check if error is critical (ECONNRESET, EPIPE, ERR_STREAM_DESTROYED)
- Exit process if critical, otherwise continue

**Uncaught Exceptions**
- Log exception details
- Exit process with code 1
- Allow PM2 to restart

**Unhandled Rejections**
- Log rejection details
- Exit process with code 1
- Allow PM2 to restart

## Testing Strategy

### Unit Testing

Unit tests will verify specific behaviors and edge cases:

**Message Processing**
- Empty message buffer processing
- Single message processing
- Buffer at capacity behavior
- Malformed message handling

**State Management**
- State initialization
- State updates for each message type
- SystemId tracking
- State retrieval

**Connection Management**
- Client connection with systemId
- Client connection without systemId
- Client disconnect cleanup
- System disconnect cleanup

**Broadcast Filtering**
- Filtering by systemToWatch
- Unfiltered broadcasts
- Closed connection skipping

### Property-Based Testing

Property-based tests will verify universal properties across many inputs using a PBT library (fast-check for JavaScript):

**Message Processing Properties**
- Generate random telemetry messages and verify parsing
- Generate random message sets and verify timestamp ordering
- Generate messages to fill buffer and verify FIFO eviction
- Generate malformed messages and verify error handling

**State Management Properties**
- Generate random messages and verify state updates
- Generate random SystemIds and verify per-system storage
- Generate state updates and verify broadcasts

**Connection Management Properties**
- Generate random client connections and verify tracking
- Generate disconnects and verify cleanup
- Generate system disconnects and verify state cleanup

**Broadcast Filtering Properties**
- Generate random client configurations and verify filtering
- Generate random SystemIds and verify per-system broadcasts

**Throttling Properties**
- Generate rapid broadcasts and verify throttling
- Generate high memory conditions and verify throttling activation

### Integration Testing

Integration tests will verify end-to-end flows:

**Telemetry Flow**
- Device connects → sends telemetry → state updates → clients receive broadcasts
- Multiple devices with different SystemIds → filtered broadcasts to clients

**Memory Management Flow**
- Server starts → memory monitoring active → buffer cleaning active
- High memory → throttling activates → broadcasts slow down
- Critical memory → server exits → PM2 restarts

**Connection Management Flow**
- Client connects → waits for system → system connects → client receives data
- System disconnects → clients move to waiting → new system connects → clients reconnect

### Manual Testing

Manual testing will verify operational behavior:

**Dashboard Integration**
- Connect dashboard to server
- Verify real-time updates
- Verify system switching
- Verify graceful degradation on disconnect

**Memory Monitoring**
- Monitor server memory over time
- Verify no memory leaks
- Verify buffer cleaning effectiveness
- Verify throttling under load

**Multi-System Scenarios**
- Connect multiple devices
- Connect multiple clients
- Verify system list updates
- Verify filtered broadcasts

## Implementation Notes

### Minimal Changes to Express Server

The migration should preserve the existing Express server structure and only add new functionality:

1. **Preserve existing code**: Keep all current WebSocket handling, connection tracking, and message broadcasting
2. **Add new imports**: Import MessageParser, StateAggregator, MemoryMonitor, BufferCleaner, BroadcastThrottler
3. **Add message buffer**: Create messageBuffer array and processing interval
4. **Add telemetry handling**: Detect telemetry messages and route to processing pipeline
5. **Add state broadcasting**: Integrate state aggregator and broadcast filtered state
6. **Add memory management**: Initialize and start monitoring services
7. **Add graceful shutdown**: Enhance SIGTERM handler to clean up intervals and services

### Logging Strategy

Replace `console.log` with structured logging:

```javascript
// Before
console.log('Client disconnected');

// After
console.log('[WebSocket] Client disconnected', {
  clientId: wsClients.get(ws),
  systemId: ws.systemId,
  timestamp: new Date().toISOString()
});
```

### Performance Considerations

**Message Buffer Size**
- 100 messages provides ~2 seconds of buffering at 50 messages/second
- Adjust if higher throughput is needed

**Processing Interval**
- 50ms provides good balance between latency and CPU usage
- Adjust if latency requirements change

**Broadcast Throttling**
- 100ms normal interval = 10 broadcasts/second per system
- 500ms throttled interval = 2 broadcasts/second per system
- Adjust based on client needs and network capacity

**Memory Thresholds**
- 350MB warning threshold leaves 150MB headroom on 512MB server
- 400MB critical threshold provides safety margin before OOM
- Adjust based on actual server memory capacity

### Migration Strategy

1. **Phase 1**: Add message processing pipeline without removing existing code
2. **Phase 2**: Add state aggregation and broadcasting
3. **Phase 3**: Add memory management and throttling
4. **Phase 4**: Add enhanced diagnostics and logging
5. **Phase 5**: Test thoroughly and switch from Fastify to Express in production

### Backward Compatibility

The migrated Express server must maintain compatibility with:

- Existing dashboard clients
- Existing device connections
- Existing message formats
- Existing query parameters (systemId, type, email, device-name)

All existing functionality must continue to work without changes to clients or devices.
