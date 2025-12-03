# Implementation Plan: Express Server Migration

- [x] 1. Set up imports and initialize core components





  - Import MessageParser, StateAggregator, MemoryMonitor, BufferCleaner, BroadcastThrottler
  - Initialize message parser and state aggregator instances
  - Create message buffer array with size constant
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 7.1_

- [x] 2. Implement message processing pipeline





  - [x] 2.1 Create processTelemetryMessage function


    - Parse raw message using MessageParser
    - Handle parsing failures gracefully
    - Update lastTelemetryTime on successful parse
    - Check buffer capacity and remove oldest if full
    - Log warning when buffer is full
    - Add parsed message to buffer
    - _Requirements: 1.1, 1.3, 1.4, 1.5_
  
  - [x] 2.2 Create processMessageBuffer function


    - Sort buffered messages by timestampUtc
    - Process each message in order
    - Update state aggregator for each message
    - Broadcast state after each update
    - Handle errors gracefully and continue processing
    - _Requirements: 1.2, 2.1, 2.2, 9.2, 9.3, 9.4, 9.5_
  
  - [x] 2.3 Start message processing interval


    - Create interval to call processMessageBuffer every 50ms
    - Store interval reference for cleanup
    - _Requirements: 9.1_
  
  - [ ]* 2.4 Write property test for message parsing
    - **Property 1: Telemetry message parsing**
    - **Validates: Requirements 1.1**
  
  - [ ]* 2.5 Write property test for timestamp ordering
    - **Property 2: Timestamp-ordered processing**
    - **Validates: Requirements 1.2, 9.2**
  
  - [ ]* 2.6 Write property test for buffer capacity
    - **Property 3: Buffer capacity enforcement**
    - **Validates: Requirements 1.3**
  
  - [ ]* 2.7 Write property test for error resilience
    - **Property 4: Error resilience**
    - **Validates: Requirements 1.5, 9.5**
-

- [x] 3. Implement state broadcasting with filtering




  - [x] 3.1 Create broadcastAggregatedState function


    - Get SystemId from state
    - Check per-system throttling (100ms minimum interval)
    - Check memory-based throttling using BroadcastThrottler
    - Get state from aggregator
    - Add current timestamp to state
    - Store state in systemStates map for connected systems
    - Serialize state to JSON
    - Iterate over WebSocket clients
    - Skip closed connections (readyState !== 1)
    - Filter by client's systemToWatch property
    - Send to matching clients
    - Record broadcast time per SystemId
    - Handle broadcast errors gracefully
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 6.1, 6.2, 6.4, 6.5, 10.2, 12.1, 12.2, 12.3_
  
  - [x] 3.2 Create broadcastLastKnownState function


    - Check time since last telemetry
    - If timeout exceeded (5 seconds), broadcast stored states
    - Check if clients are watching each system before broadcasting
    - Update timestamp to current time
    - Filter broadcasts by SystemId
    - Skip closed connections
    - _Requirements: 6.3_
  
  - [x] 3.3 Start last known state broadcast interval


    - Create interval to call broadcastLastKnownState every 100ms
    - Store interval reference for cleanup
    - _Requirements: 6.3_
  
  - [ ]* 3.4 Write property test for state update propagation
    - **Property 5: State update propagation**
    - **Validates: Requirements 2.1**
  
  - [ ]* 3.5 Write property test for broadcast on state update
    - **Property 6: Broadcast on state update**
    - **Validates: Requirements 2.2, 9.4**
  
  - [ ]* 3.6 Write property test for broadcast timestamp
    - **Property 7: Broadcast timestamp inclusion**
    - **Validates: Requirements 2.3, 6.2**
  
  - [ ]* 3.7 Write property test for SystemId preservation
    - **Property 8: SystemId preservation**
    - **Validates: Requirements 2.4, 6.4**
  
  - [ ]* 3.8 Write property test for per-system state storage
    - **Property 9: Per-system state storage**
    - **Validates: Requirements 2.5**
  
  - [ ]* 3.9 Write property test for broadcast to all clients
    - **Property 16: Broadcast to all clients**
    - **Validates: Requirements 6.1**
  
  - [ ]* 3.10 Write property test for SystemId filtering
    - **Property 17: SystemId filtering**
    - **Validates: Requirements 6.5, 10.2**
  
  - [ ]* 3.11 Write property test for unfiltered broadcasts
    - **Property 18: Unfiltered client broadcasts**
    - **Validates: Requirements 10.3**

- [x] 4. Integrate telemetry detection in message handler




  - [x] 4.1 Detect telemetry messages in ws.on('message')


    - Check for messageType, timestampUtc, source, and data fields
    - Route telemetry messages to processTelemetryMessage
    - Return early to skip existing message handling
    - Preserve existing handling for device messages and system messages
    - _Requirements: 1.1_
  
  - [x] 4.2 Update device connection handling


    - Set SystemId in state aggregator when device connects
    - Register device as available system in connectedSystems
    - Connect waiting clients to new system
    - _Requirements: 6.4, 10.5_
  
  - [ ]* 4.3 Write property test for client-system association
    - **Property 22: Client-system association**
    - **Validates: Requirements 10.1**
  
  - [ ]* 4.4 Write property test for waiting client connection
    - **Property 23: Waiting client connection**
    - **Validates: Requirements 10.5**

- [x] 5. Initialize memory monitoring





  - [x] 5.1 Create and configure MemoryMonitor


    - Set warning threshold to 350MB
    - Set critical threshold to 400MB
    - Configure onCritical callback to exit process
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [x] 5.2 Enhance memory check with diagnostics


    - Override or wrap memoryMonitor.check
    - Add messageBufferSize diagnostic
    - Add systemStatesSize diagnostic
    - Add connectedSystemsSize diagnostic
    - Add wsClientsSize diagnostic
    - Add waitingClientsSize diagnostic
    - Add lastBroadcastTimeSize diagnostic
    - _Requirements: 3.4_
  
  - [x] 5.3 Start memory monitoring


    - Call startMonitoring with 30-second interval
    - _Requirements: 3.5_
  
  - [ ]* 5.4 Write property test for memory diagnostics
    - **Property 10: Memory diagnostic inclusion**
    - **Validates: Requirements 3.4**

- [x] 6. Initialize buffer cleaning





  - [x] 6.1 Create and configure BufferCleaner


    - Pass state aggregator instance
    - Set timeout to 300000ms (5 minutes)
    - Configure logger
    - _Requirements: 4.1_
  
  - [x] 6.2 Start buffer cleaning


    - Call startCleaning with 60-second interval
    - _Requirements: 4.4_
  
  - [ ]* 6.3 Write property test for buffer cleaning
    - **Property 11: Buffer cleaning**
    - **Validates: Requirements 4.2**

- [x] 7. Initialize broadcast throttling





  - [x] 7.1 Create and configure BroadcastThrottler

    - Set normal interval to 100ms
    - Set throttled interval to 500ms
    - Set memory threshold to 350MB
    - _Requirements: 7.1, 7.2_
  
  - [x] 7.2 Create throttling state tracking


    - Track wasThrottled state
    - Create interval to check throttling state every 5 seconds
    - Log when throttling activates with memory details
    - Log when throttling deactivates with memory details
    - Store interval reference for cleanup
    - _Requirements: 7.3_
  
  - [x] 7.3 Create lastBroadcastTime map

    - Initialize Map for tracking per-system broadcast times
    - _Requirements: 12.1, 12.3_
  
  - [ ]* 7.4 Write property test for memory-based throttling
    - **Property 19: Memory-based throttling**
    - **Validates: Requirements 7.1, 7.2, 7.4**
  
  - [ ]* 7.5 Write property test for per-system throttling
    - **Property 20: Per-system broadcast throttling**
    - **Validates: Requirements 12.1, 12.2**
  
  - [ ]* 7.6 Write property test for broadcast time tracking
    - **Property 21: Broadcast time tracking**
    - **Validates: Requirements 12.3**

- [x] 8. Enhance connection cleanup





  - [x] 8.1 Update ws.on('close') handler


    - Ensure client removed from wsClients
    - Ensure client removed from waitingClients
    - Remove client from all system watcher sets
    - Remove empty system entries from connectedSystems
    - If system disconnects, delete from systemStates
    - If system disconnects, delete from lastBroadcastTime
    - Move watching clients to waitingClients on system disconnect
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 10.4, 12.4_
  
  - [ ]* 8.2 Write property test for client cleanup
    - **Property 12: Client cleanup on disconnect**
    - **Validates: Requirements 5.1, 5.3**
  
  - [ ]* 8.3 Write property test for empty system cleanup
    - **Property 13: Empty system cleanup**
    - **Validates: Requirements 5.2**
  
  - [ ]* 8.4 Write property test for closed connection skipping
    - **Property 14: Closed connection skipping**
    - **Validates: Requirements 5.4**
  
  - [ ]* 8.5 Write property test for system state cleanup
    - **Property 15: System state cleanup**
    - **Validates: Requirements 5.5, 12.4**
  
  - [ ]* 8.6 Write property test for client migration
    - **Property 24: Client migration on system disconnect**
    - **Validates: Requirements 10.4**

- [x] 9. Enhance graceful shutdown





  - [x] 9.1 Update SIGTERM handler


    - Clear message processing interval
    - Clear last known state broadcast interval
    - Clear throttling check interval
    - Stop memory monitor
    - Stop buffer cleaner
    - Close WebSocket server
    - Close HTTP server
    - Exit with code 0
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 10. Add diagnostic logging





  - [x] 10.1 Add message processing diagnostics


    - Track messageProcessCount
    - Log every 30 seconds with buffer size
    - _Requirements: 11.1_
  
  - [x] 10.2 Add systems list broadcast diagnostics


    - Track systemsListBroadcastCount
    - Log every 30 seconds
    - _Requirements: 11.2_
  
  - [x] 10.3 Add last known state broadcast diagnostics


    - Track lastKnownStateBroadcastCount
    - Log every 30 seconds with systemStates size and client count
    - _Requirements: 11.3_
  
  - [x] 10.4 Add state size sampling


    - Sample 1% of broadcasts
    - Log serialized state size in KB
    - Log StreamingPressure channel sizes
    - _Requirements: 11.4_
  
  - [ ]* 10.5 Write property test for diagnostic completeness
    - **Property 26: Diagnostic completeness**
    - **Validates: Requirements 11.5**

- [ ] 11. Add sequential processing property test
  - [ ]* 11.1 Write property test for sequential state updates
    - **Property 25: Sequential state updates**
    - **Validates: Requirements 9.3**

- [x] 12. Update all broadcast locations to skip closed connections





  - [x] 12.1 Update broadcastSystemsList


    - Check readyState === 1 before sending
    - Skip closed connections without storing references
    - _Requirements: 5.4_
  
  - [x] 12.2 Update connection message broadcast


    - Check readyState === 1 before sending
    - Skip closed connections without storing references
    - _Requirements: 5.4_
  
  - [x] 12.3 Update device message broadcast


    - Check readyState === 1 before sending
    - Skip closed connections without storing references
    - _Requirements: 5.4_

- [ ] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Test with real telemetry data
  - [ ] 14.1 Start Express server
    - Run server with npm run dev:express
  
  - [ ] 14.2 Connect test device
    - Use send-sample-telemetry.js to send test data
    - Verify telemetry is parsed and processed
    - Verify state is aggregated correctly
  
  - [ ] 14.3 Connect dashboard client
    - Open dashboard in browser
    - Verify real-time updates
    - Verify system filtering works
    - Verify graceful degradation on disconnect
  
  - [ ] 14.4 Monitor memory usage
    - Run server for extended period
    - Verify no memory leaks
    - Verify buffer cleaning works
    - Verify throttling activates under load
  
  - [ ] 14.5 Test multi-system scenario
    - Connect multiple test devices with different SystemIds
    - Connect multiple dashboard clients
    - Verify system list updates
    - Verify filtered broadcasts work correctly

- [ ] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
