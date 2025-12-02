# Design Document

## Overview

This design document addresses critical memory management issues in the cardiac monitoring telemetry system. After 30 minutes of operation, the server exceeds its 400MB memory threshold due to unbounded growth of streaming pressure data buffers. The root cause is the `StreamingPressureHandler` which stores pressure arrays without size limits, causing memory exhaustion over time.

The solution implements:

1. **Circular buffers** for streaming pressure data with fixed 1000-point limits
2. **Message buffer size enforcement** to prevent processing delays from causing memory issues
3. **Memory monitoring** with automatic warnings and graceful restart triggers
4. **Periodic cleanup** of stale streaming data
5. **Connection tracking cleanup** to prevent WebSocket reference leaks
6. **Adaptive broadcast throttling** during memory pressure

## Architecture

### Memory Management Components

```
┌─────────────────────────────────────┐
│   Telemetry Message Flow            │
│                                      │
│   StreamingPressure Message          │
│            │                         │
│            ▼                         │
│   ┌──────────────────────┐          │
│   │ CircularBuffer       │          │
│   │ (1000 point limit)   │          │
│   └──────────────────────┘          │
│            │                         │
│            ▼                         │
│   StateAggregator.state              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│   Memory Monitoring                  │
│                                      │
│   Every 30 seconds:                  │
│   ┌──────────────────────┐          │
│   │ Check heap usage     │          │
│   └──────────┬───────────┘          │
│              │                       │
│              ├─> < 350MB: OK         │
│              ├─> 350-400MB: Warning  │
│              └─> > 400MB: Restart    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│   Cleanup & Throttling               │
│                                      │
│   Every 5 minutes:                   │
│   - Clear stale streaming buffers    │
│                                      │
│   On memory pressure:                │
│   - Reduce broadcast frequency       │
│   - Continue critical processing     │
└─────────────────────────────────────┘
```

## Components and Interfaces

### CircularBuffer Class

**Responsibility**: Maintain fixed-size buffer for streaming data with automatic oldest-data removal

**Interface**:
```javascript
class CircularBuffer {
  /**
   * Create a circular buffer with fixed capacity
   * @param {number} capacity - Maximum number of elements
   */
  constructor(capacity)
  
  /**
   * Add element to buffer, removing oldest if at capacity
   * @param {*} element - Element to add
   */
  push(element)
  
  /**
   * Get all elements in order (oldest to newest)
   * @returns {Array} Array of elements
   */
  toArray()
  
  /**
   * Get current number of elements
   * @returns {number} Current size
   */
  size()
  
  /**
   * Clear all elements
   */
  clear()
  
  /**
   * Check if buffer is at capacity
   * @returns {boolean} True if full
   */
  isFull()
}
```

### StreamingPressureHandler (Modified)

**Changes**:
- Replace direct array assignment with CircularBuffer
- Initialize buffers only for non-null channels
- Limit each channel to 1000 data points

**Updated Interface**:
```javascript
class StreamingPressureHandler extends MessageTypeHandler {
  /**
   * Handle StreamingPressure message with bounded buffers
   * @param {Object} data - Message data field
   * @param {Object} aggregator - State aggregator instance
   */
  handle(data, aggregator)
  
  /**
   * Initialize circular buffer for a pressure channel
   * @param {Object} state - Current state
   * @param {string} channel - Channel name (e.g., 'leftAtrial')
   * @private
   */
  initializeChannelBuffer(state, channel)
  
  /**
   * Add data to channel buffer using circular buffer
   * @param {Object} state - Current state
   * @param {string} channel - Channel name
   * @param {Array} data - Pressure data array
   * @private
   */
  addToChannelBuffer(state, channel, data)
}
```

### MemoryMonitor Class

**Responsibility**: Monitor heap usage and trigger warnings/restarts

**Interface**:
```javascript
class MemoryMonitor {
  /**
   * Create memory monitor with thresholds
   * @param {Object} options - Configuration options
   * @param {number} options.warningThresholdMB - Warning threshold (default: 350)
   * @param {number} options.criticalThresholdMB - Critical threshold (default: 400)
   * @param {Function} options.logger - Logger function
   * @param {Function} options.onCritical - Callback for critical threshold
   */
  constructor(options)
  
  /**
   * Check current memory usage and take action if needed
   * @param {Object} diagnostics - Additional diagnostic info (buffer sizes, etc.)
   * @returns {Object} Memory status
   */
  check(diagnostics)
  
  /**
   * Get current heap usage in MB
   * @returns {number} Heap usage in megabytes
   */
  getHeapUsageMB()
  
  /**
   * Start periodic monitoring
   * @param {number} intervalMs - Check interval in milliseconds (default: 30000)
   */
  startMonitoring(intervalMs)
  
  /**
   * Stop periodic monitoring
   */
  stopMonitoring()
}
```

### BufferCleaner Class

**Responsibility**: Periodically clean stale streaming data

**Interface**:
```javascript
class BufferCleaner {
  /**
   * Create buffer cleaner
   * @param {Object} stateAggregator - State aggregator instance
   * @param {Object} options - Configuration options
   * @param {number} options.timeoutMs - Timeout before cleanup (default: 300000)
   * @param {Function} options.logger - Logger function
   */
  constructor(stateAggregator, options)
  
  /**
   * Check if streaming buffers should be cleared
   * @returns {boolean} True if cleanup performed
   */
  checkAndClean()
  
  /**
   * Clear streaming pressure buffers while preserving other data
   */
  clearStreamingBuffers()
  
  /**
   * Start periodic cleanup checks
   * @param {number} intervalMs - Check interval in milliseconds
   */
  startCleaning(intervalMs)
  
  /**
   * Stop periodic cleanup
   */
  stopCleaning()
}
```

### BroadcastThrottler Class

**Responsibility**: Reduce broadcast frequency during memory pressure

**Interface**:
```javascript
class BroadcastThrottler {
  /**
   * Create broadcast throttler
   * @param {Object} options - Configuration options
   * @param {number} options.normalIntervalMs - Normal broadcast interval (default: 100)
   * @param {number} options.throttledIntervalMs - Throttled interval (default: 500)
   * @param {number} options.memoryThresholdMB - Threshold to trigger throttling (default: 350)
   */
  constructor(options)
  
  /**
   * Check if broadcast should be throttled based on memory
   * @param {number} heapUsageMB - Current heap usage in MB
   * @returns {boolean} True if should throttle
   */
  shouldThrottle(heapUsageMB)
  
  /**
   * Get current broadcast interval
   * @returns {number} Interval in milliseconds
   */
  getCurrentInterval()
  
  /**
   * Check if enough time has passed since last broadcast
   * @returns {boolean} True if should broadcast now
   */
  shouldBroadcastNow()
  
  /**
   * Record that a broadcast occurred
   */
  recordBroadcast()
}
```

## Data Models

### CircularBuffer Internal Structure

```javascript
{
  buffer: Array,        // Fixed-size array
  capacity: number,     // Maximum size
  head: number,         // Index of oldest element
  tail: number,         // Index where next element goes
  count: number         // Current number of elements
}
```

### StreamingPressure State (Modified)

```javascript
{
  StreamingPressure: {
    leftAtrial: CircularBuffer | null,          // Max 1000 points
    rightAtrial: CircularBuffer | null,         // Max 1000 points
    leftVentricular: CircularBuffer | null,     // Max 1000 points
    rightVentricular: CircularBuffer | null,    // Max 1000 points
    aortic: CircularBuffer | null,              // Max 1000 points
    pulmonaryArterial: CircularBuffer | null,   // Max 1000 points
    sampleRate: number,
    unit: string,
    lastUpdate: number                          // Timestamp for cleanup
  }
}
```

### Memory Diagnostics

```javascript
{
  heapUsedMB: number,
  heapTotalMB: number,
  bufferSizes: {
    messageBuffer: number,
    streamingPressure: {
      leftAtrial: number,
      rightAtrial: number,
      leftVentricular: number,
      rightVentricular: number,
      aortic: number,
      pulmonaryArterial: number
    }
  },
  connectionCount: number,
  systemCount: number
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Streaming buffer size is bounded
*For any* sequence of StreamingPressure messages, each pressure array should never exceed 1000 data points
**Validates: Requirements 1.1**

### Property 2: Circular buffer removes oldest data
*For any* circular buffer at capacity, adding a new element should remove the oldest element
**Validates: Requirements 1.2**

### Property 3: Circular buffer prevents unbounded growth
*For any* number of elements added to a circular buffer, the buffer size should never exceed its capacity
**Validates: Requirements 1.3**

### Property 4: Null channels don't allocate buffers
*For any* StreamingPressure message with null channel data, no buffer should be allocated for that channel
**Validates: Requirements 1.5**

### Property 5: Message buffer size is bounded
*For any* sequence of messages added to the message buffer, the buffer size should never exceed 100 messages
**Validates: Requirements 2.1**

### Property 6: Message buffer continues accepting messages
*For any* message buffer at capacity, adding new messages should succeed without throwing errors
**Validates: Requirements 2.3**

### Property 7: Message processing clears buffer
*For any* message buffer with messages, processing all messages should result in an empty buffer
**Validates: Requirements 2.4**

### Property 8: Buffer cleanup preserves other data
*For any* state with streaming buffers and other telemetry data, clearing streaming buffers should leave other data unchanged
**Validates: Requirements 4.2**

### Property 9: Telemetry recovery rebuilds buffers
*For any* state with cleared buffers, receiving new StreamingPressure messages should rebuild buffers normally
**Validates: Requirements 4.4**

### Property 10: Connection cleanup removes all references
*For any* WebSocket connection, closing it should remove the connection from all tracking structures (wsClients, connectedSystems, waitingClients)
**Validates: Requirements 5.1**

### Property 11: Empty system entries are removed
*For any* system with no watching clients, the system entry should be removed from connectedSystems
**Validates: Requirements 5.2**

### Property 12: Disconnected clients are fully cleaned
*For any* client disconnection, the client should be removed from wsClients, waitingClients, and all system watcher sets
**Validates: Requirements 5.3**

### Property 13: Broadcast skips closed connections
*For any* broadcast to a set of connections including closed ones, closed connections should be skipped without storing new references
**Validates: Requirements 5.4**

### Property 14: Throttling reduces broadcast frequency
*For any* memory usage above 350MB, the broadcast interval should increase from 100ms to 500ms
**Validates: Requirements 7.1**

### Property 15: Normal memory restores broadcast frequency
*For any* memory usage that returns below 350MB after being high, the broadcast interval should return to 100ms
**Validates: Requirements 7.2**

### Property 16: Memory pressure preserves critical processing
*For any* memory pressure condition, telemetry message processing should continue without interruption
**Validates: Requirements 7.4**

## Error Handling

### Memory Exhaustion

1. **Warning Level (350-400MB)**
   - Log warning with diagnostic information
   - Enable broadcast throttling
   - Continue normal operation
   - Increase monitoring frequency

2. **Critical Level (>400MB)**
   - Log critical error with full diagnostics
   - Trigger graceful restart via process.exit(1)
   - PM2 will automatically restart the process
   - New process starts with clean memory

3. **Recovery After Restart**
   - Clients automatically reconnect via WebSocket
   - State rebuilds from incoming telemetry
   - No data loss for real-time monitoring

### Buffer Overflow Prevention

1. **Streaming Pressure Buffers**
   - Circular buffer automatically removes oldest data
   - No errors thrown on overflow
   - Continuous operation maintained

2. **Message Buffer**
   - Remove oldest message when at capacity
   - Log warning about processing delays
   - Continue accepting new messages

### Cleanup Failures

1. **Buffer Cleanup Errors**
   - Log error but continue operation
   - Retry on next cleanup cycle
   - Don't crash the server

2. **Connection Cleanup Errors**
   - Log error with connection details
   - Continue with other cleanup operations
   - Prevent cascading failures

## Testing Strategy

### Unit Testing

Unit tests will verify individual memory management components:

1. **CircularBuffer Tests**
   - Buffer initialization with capacity
   - Adding elements up to capacity
   - Overflow behavior (oldest removal)
   - Clear and size operations
   - Edge cases (capacity 0, capacity 1)

2. **MemoryMonitor Tests**
   - Heap usage calculation
   - Warning threshold detection
   - Critical threshold detection
   - Diagnostic information collection
   - Callback invocation

3. **BufferCleaner Tests**
   - Timeout detection
   - Selective buffer clearing
   - State preservation
   - Logging behavior

4. **BroadcastThrottler Tests**
   - Throttling activation
   - Throttling deactivation
   - Interval calculation
   - Timing behavior

### Property-Based Testing

Property-based tests will verify correctness properties across many random inputs using the `fast-check` library for JavaScript. Each test will run a minimum of 100 iterations.

**Test Configuration**:
```javascript
import fc from 'fast-check'

// Run each property test with 100 iterations
const testConfig = { numRuns: 100 }
```

**Property Test Structure**:
Each property-based test will:
1. Generate random valid inputs
2. Execute the system under test
3. Verify the correctness property holds
4. Be tagged with the property number from this design document

**Example Property Test**:
```javascript
// Feature: memory-management, Property 1: Streaming buffer size is bounded
test('Property 1: Streaming buffers never exceed 1000 points', () => {
  fc.assert(
    fc.property(
      fc.array(fc.array(fc.float()), { minLength: 0, maxLength: 5000 }),
      (dataArrays) => {
        const buffer = new CircularBuffer(1000)
        dataArrays.forEach(arr => {
          arr.forEach(val => buffer.push(val))
        })
        return buffer.size() <= 1000
      }
    ),
    testConfig
  )
})
```

### Integration Testing

Integration tests will verify memory management in the full system:

1. **Memory Leak Tests**
   - Run server for 30 minutes with continuous telemetry
   - Verify heap usage stays below 400MB
   - Verify buffer sizes remain bounded
   - Measure memory before and after

2. **Cleanup Integration Tests**
   - Simulate 5-minute telemetry gap
   - Verify streaming buffers are cleared
   - Verify other state is preserved
   - Verify recovery after gap

3. **Throttling Integration Tests**
   - Simulate high memory usage
   - Verify broadcast frequency reduces
   - Verify message processing continues
   - Verify recovery when memory normalizes

### Load Testing

Load tests will verify system stability under stress:

1. **High Message Rate**
   - Send 1000 messages/second for 30 minutes
   - Verify memory stays bounded
   - Verify no message loss
   - Verify system remains responsive

2. **Large Streaming Arrays**
   - Send StreamingPressure with 10000-point arrays
   - Verify buffers limit to 1000 points
   - Verify oldest data is removed
   - Verify no memory exhaustion

3. **Many Concurrent Connections**
   - Connect 50 WebSocket clients
   - Run for 30 minutes
   - Verify connection tracking doesn't leak
   - Verify memory stays bounded

## Implementation Notes

### Circular Buffer Implementation

Use a ring buffer approach for O(1) push and O(n) toArray operations:

```javascript
class CircularBuffer {
  constructor(capacity) {
    this.buffer = new Array(capacity)
    this.capacity = capacity
    this.head = 0  // Oldest element
    this.tail = 0  // Next insertion point
    this.count = 0
  }
  
  push(element) {
    this.buffer[this.tail] = element
    this.tail = (this.tail + 1) % this.capacity
    
    if (this.count < this.capacity) {
      this.count++
    } else {
      // Buffer is full, move head forward
      this.head = (this.head + 1) % this.capacity
    }
  }
  
  toArray() {
    if (this.count === 0) return []
    
    const result = []
    for (let i = 0; i < this.count; i++) {
      const index = (this.head + i) % this.capacity
      result.push(this.buffer[index])
    }
    return result
  }
  
  size() {
    return this.count
  }
  
  clear() {
    this.head = 0
    this.tail = 0
    this.count = 0
  }
  
  isFull() {
    return this.count === this.capacity
  }
}
```

### Memory Monitoring Integration

Integrate MemoryMonitor into fastify-server.js:

```javascript
const memoryMonitor = new MemoryMonitor({
  warningThresholdMB: 350,
  criticalThresholdMB: 400,
  logger: fastify.log,
  onCritical: () => {
    fastify.log.error('Memory threshold exceeded')
    process.exit(1)
  }
})

// Start monitoring every 30 seconds
memoryMonitor.startMonitoring(30000)
```

### Broadcast Throttling Integration

Integrate BroadcastThrottler into broadcast logic:

```javascript
const throttler = new BroadcastThrottler({
  normalIntervalMs: 100,
  throttledIntervalMs: 500,
  memoryThresholdMB: 350
})

const broadcastAggregatedState = () => {
  const heapUsageMB = process.memoryUsage().heapUsed / 1024 / 1024
  
  if (!throttler.shouldBroadcastNow()) {
    return // Skip this broadcast due to throttling
  }
  
  // Perform broadcast
  // ...
  
  throttler.recordBroadcast()
}
```

### Buffer Cleanup Integration

Integrate BufferCleaner into server lifecycle:

```javascript
const bufferCleaner = new BufferCleaner(stateAggregator, {
  timeoutMs: 300000, // 5 minutes
  logger: fastify.log
})

// Check every minute
bufferCleaner.startCleaning(60000)
```

## Performance Considerations

### Memory Overhead

- CircularBuffer: Fixed overhead of capacity × element size
- 6 channels × 1000 points × 8 bytes = ~48KB per system
- Acceptable overhead for bounded memory usage

### CPU Overhead

- Circular buffer push: O(1)
- Circular buffer toArray: O(n) but only called during broadcast
- Memory monitoring: Minimal overhead every 30 seconds
- Buffer cleanup: Minimal overhead every minute

### Broadcast Performance

- Normal: 100ms interval = 10 broadcasts/second
- Throttled: 500ms interval = 2 broadcasts/second
- Reduces CPU and network load during memory pressure
- Maintains real-time monitoring capability

## Migration Strategy

### Phase 1: Add CircularBuffer
1. Implement CircularBuffer class
2. Add unit tests
3. Deploy without using yet

### Phase 2: Update StreamingPressureHandler
1. Modify handler to use CircularBuffer
2. Add property-based tests
3. Test with sample telemetry
4. Deploy to production

### Phase 3: Add Memory Monitoring
1. Implement MemoryMonitor class
2. Integrate into server
3. Monitor logs for warnings
4. Tune thresholds if needed

### Phase 4: Add Cleanup and Throttling
1. Implement BufferCleaner
2. Implement BroadcastThrottler
3. Integrate both into server
4. Run 30-minute load test
5. Deploy to production

### Phase 5: Verify
1. Monitor production for 24 hours
2. Verify no memory threshold errors
3. Verify system stability
4. Document lessons learned
