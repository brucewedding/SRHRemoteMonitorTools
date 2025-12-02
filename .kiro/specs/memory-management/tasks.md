# Implementation Plan

- [x] 1. Implement CircularBuffer class





  - Create server/CircularBuffer.js with ring buffer implementation
  - Implement constructor with capacity parameter
  - Implement push() method with O(1) complexity
  - Implement toArray() method to get elements in order
  - Implement size(), clear(), and isFull() helper methods
  - _Requirements: 1.1, 1.2, 1.3_

- [ ]* 1.1 Write property test for circular buffer size limit
  - **Property 1: Streaming buffer size is bounded**
  - **Validates: Requirements 1.1**

- [ ]* 1.2 Write property test for oldest data removal
  - **Property 2: Circular buffer removes oldest data**
  - **Validates: Requirements 1.2**

- [ ]* 1.3 Write property test for unbounded growth prevention
  - **Property 3: Circular buffer prevents unbounded growth**
  - **Validates: Requirements 1.3**

- [x] 2. Update StreamingPressureHandler to use CircularBuffer





  - Modify StreamingPressureHandler.handle() to use CircularBuffer instead of direct arrays
  - Implement initializeChannelBuffer() to create CircularBuffer instances
  - Implement addToChannelBuffer() to add data using circular buffer
  - Only initialize buffers for non-null channels
  - Set buffer capacity to 1000 points per channel
  - Update lastUpdate timestamp when buffers are modified
  - _Requirements: 1.1, 1.4, 1.5_

- [ ]* 2.1 Write property test for null channel handling
  - **Property 4: Null channels don't allocate buffers**
  - **Validates: Requirements 1.5**

- [x] 3. Enforce message buffer size limit





  - Update processTelemetryMessage() in fastify-server.js
  - Check if messageBuffer.length >= MESSAGE_BUFFER_SIZE before adding
  - Remove oldest message (shift) when at capacity
  - Log warning when buffer is full about processing delays
  - _Requirements: 2.1, 2.2, 2.3_

- [ ]* 3.1 Write property test for message buffer size limit
  - **Property 5: Message buffer size is bounded**
  - **Validates: Requirements 2.1**

- [ ]* 3.2 Write property test for message buffer resilience
  - **Property 6: Message buffer continues accepting messages**
  - **Validates: Requirements 2.3**

- [ ]* 3.3 Write property test for message buffer clearing
  - **Property 7: Message processing clears buffer**
  - **Validates: Requirements 2.4**

- [x] 4. Implement MemoryMonitor class





  - Create server/MemoryMonitor.js
  - Implement constructor with warning and critical thresholds
  - Implement getHeapUsageMB() to calculate current heap usage
  - Implement check() method to evaluate memory and take action
  - Collect diagnostic information (buffer sizes, connection counts)
  - Implement startMonitoring() and stopMonitoring() for periodic checks
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 5. Integrate MemoryMonitor into server





  - Create MemoryMonitor instance in fastify-server.js
  - Set warningThresholdMB to 350 and criticalThresholdMB to 400
  - Pass fastify.log as logger
  - Set onCritical callback to log error and call process.exit(1)
  - Start monitoring with 30-second interval
  - Remove existing checkCriticalConditions() function
  - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [x] 6. Implement BufferCleaner class





  - Create server/BufferCleaner.js
  - Implement constructor with stateAggregator and timeout configuration
  - Implement checkAndClean() to check if cleanup is needed
  - Implement clearStreamingBuffers() to clear only streaming pressure buffers
  - Preserve all other telemetry data during cleanup
  - Implement startCleaning() and stopCleaning() for periodic checks
  - Log cleanup actions when performed
  - _Requirements: 4.1, 4.2, 4.3_

- [ ]* 6.1 Write property test for selective buffer cleanup
  - **Property 8: Buffer cleanup preserves other data**
  - **Validates: Requirements 4.2**

- [ ]* 6.2 Write property test for buffer recovery
  - **Property 9: Telemetry recovery rebuilds buffers**
  - **Validates: Requirements 4.4**

- [x] 7. Integrate BufferCleaner into server




  - Create BufferCleaner instance in fastify-server.js
  - Set timeout to 300000ms (5 minutes)
  - Pass fastify.log as logger
  - Start cleaning with 60-second check interval
  - _Requirements: 4.1, 4.4_

- [x] 8. Implement BroadcastThrottler class





  - Create server/BroadcastThrottler.js
  - Implement constructor with normal and throttled interval configuration
  - Implement shouldThrottle() to check if memory exceeds threshold
  - Implement getCurrentInterval() to return appropriate interval
  - Implement shouldBroadcastNow() to check if enough time has passed
  - Implement recordBroadcast() to track last broadcast time
  - _Requirements: 7.1, 7.2_

- [ ]* 8.1 Write property test for broadcast throttling
  - **Property 14: Throttling reduces broadcast frequency**
  - **Validates: Requirements 7.1**

- [ ]* 8.2 Write property test for throttling recovery
  - **Property 15: Normal memory restores broadcast frequency**
  - **Validates: Requirements 7.2**

- [ ]* 8.3 Write property test for critical processing preservation
  - **Property 16: Memory pressure preserves critical processing**
  - **Validates: Requirements 7.4**

- [x] 9. Integrate BroadcastThrottler into server






  - Create BroadcastThrottler instance in fastify-server.js
  - Set normalIntervalMs to 100 and throttledIntervalMs to 500
  - Set memoryThresholdMB to 350
  - Modify broadcastAggregatedState() to check shouldBroadcastNow()
  - Call recordBroadcast() after each broadcast
  - Log when throttling is activated or deactivated
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 10. Improve WebSocket connection cleanup





  - Review socket.on('close') handler in fastify-server.js
  - Ensure wsClients.delete(socket) is called
  - Ensure waitingClients.delete(socket) is called
  - Remove socket from all system watcher sets in connectedSystems
  - Remove empty system entries from connectedSystems
  - Verify no references to closed sockets are retained during broadcast
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ]* 10.1 Write property test for connection cleanup
  - **Property 10: Connection cleanup removes all references**
  - **Validates: Requirements 5.1**

- [ ]* 10.2 Write property test for empty system removal
  - **Property 11: Empty system entries are removed**
  - **Validates: Requirements 5.2**

- [ ]* 10.3 Write property test for client cleanup
  - **Property 12: Disconnected clients are fully cleaned**
  - **Validates: Requirements 5.3**

- [ ]* 10.4 Write property test for broadcast cleanup
  - **Property 13: Broadcast skips closed connections**
  - **Validates: Requirements 5.4**

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Run 30-minute memory leak test
  - Start server with memory monitoring enabled
  - Send continuous telemetry for 30 minutes using send-sample-telemetry.js
  - Monitor heap usage logs every 30 seconds
  - Verify heap usage stays below 400MB
  - Verify no memory threshold errors occur
  - Verify streaming buffer sizes remain at 1000 points
  - Document peak memory usage and buffer sizes
  - _Requirements: All_

- [ ]* 12.1 Write integration test for memory leak prevention
  - Simulate 30 minutes of telemetry data
  - Verify heap usage remains below 400MB
  - Verify buffer sizes never exceed limits

- [ ] 13. Test buffer cleanup behavior
  - Start server and send telemetry for 1 minute
  - Stop sending telemetry for 6 minutes
  - Verify streaming buffers are cleared after 5 minutes
  - Verify other telemetry data is preserved
  - Resume sending telemetry
  - Verify buffers rebuild correctly
  - _Requirements: 4.1, 4.2, 4.4_

- [ ] 14. Test broadcast throttling under memory pressure
  - Start server with normal operation
  - Simulate high memory usage (mock or actual)
  - Verify broadcast interval increases to 500ms
  - Verify message processing continues
  - Reduce memory usage
  - Verify broadcast interval returns to 100ms
  - _Requirements: 7.1, 7.2, 7.4_

- [ ] 15. Final checkpoint - Verify production readiness
  - Ensure all tests pass, ask the user if questions arise.
