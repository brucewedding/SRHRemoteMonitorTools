# Requirements Document

## Introduction

This document outlines the requirements for migrating the advanced telemetry processing, memory management, and broadcast optimization features from the Fastify-based WebSocket server to the existing Express-based WebSocket server. The goal is to consolidate server implementations while preserving all critical functionality including message parsing, state aggregation, memory monitoring, buffer cleaning, and broadcast throttling.

## Glossary

- **Express Server**: The HTTP server framework using the `ws` library for WebSocket connections (server/server.js)
- **Fastify Server**: The current production server with advanced telemetry features (server/fastify-server.js)
- **Telemetry Message**: A structured message containing sensor data with messageType, timestampUtc, source, and data fields
- **Message Parser**: Component that validates and parses incoming telemetry messages (MessageParser.js)
- **State Aggregator**: Component that maintains aggregated state from telemetry messages (StateAggregator.js)
- **Memory Monitor**: Component that tracks heap usage and triggers alerts at thresholds (MemoryMonitor.js)
- **Buffer Cleaner**: Component that removes stale data from circular buffers (BufferCleaner.js)
- **Broadcast Throttler**: Component that reduces broadcast frequency under memory pressure (BroadcastThrottler.js)
- **Message Buffer**: Temporary storage for ordering messages by timestamp before processing
- **System State**: Per-SystemId aggregated telemetry data stored for broadcasting
- **Circular Buffer**: Fixed-size buffer for streaming pressure data that overwrites oldest entries

## Requirements

### Requirement 1: Telemetry Message Processing

**User Story:** As a system operator, I want telemetry messages to be parsed, validated, and processed in timestamp order, so that the aggregated state accurately reflects the chronological sequence of events.

#### Acceptance Criteria

1. WHEN a telemetry message is received THEN the Express Server SHALL parse it using MessageParser
2. WHEN messages are buffered THEN the Express Server SHALL sort them by timestampUtc before processing
3. WHEN the message buffer reaches capacity THEN the Express Server SHALL remove the oldest message
4. WHEN the message buffer is full THEN the Express Server SHALL log a warning about processing delays
5. WHEN a parsing error occurs THEN the Express Server SHALL log the error and continue processing other messages

### Requirement 2: State Aggregation

**User Story:** As a monitoring client, I want to receive aggregated telemetry state updates, so that I can display current system metrics without processing raw messages.

#### Acceptance Criteria

1. WHEN a parsed message is processed THEN the Express Server SHALL update the StateAggregator with the message data
2. WHEN state is updated THEN the Express Server SHALL broadcast the aggregated state to connected clients
3. WHEN broadcasting state THEN the Express Server SHALL include a timestamp in the broadcast
4. WHEN broadcasting state THEN the Express Server SHALL preserve the SystemId for client filtering
5. WHEN a SystemId is present THEN the Express Server SHALL store the state per SystemId for later retrieval

### Requirement 3: Memory Monitoring

**User Story:** As a system administrator, I want the server to monitor memory usage and take action at critical thresholds, so that the server remains stable and restarts before running out of memory.

#### Acceptance Criteria

1. WHEN the server starts THEN the Express Server SHALL initialize MemoryMonitor with warning and critical thresholds
2. WHEN memory usage exceeds the warning threshold THEN the Express Server SHALL log a warning with diagnostic information
3. WHEN memory usage exceeds the critical threshold THEN the Express Server SHALL exit the process for PM2 restart
4. WHEN checking memory THEN the Express Server SHALL include server-specific diagnostics (buffer sizes, connection counts)
5. WHILE the server is running THEN the Express Server SHALL check memory usage every 30 seconds

### Requirement 4: Buffer Cleaning

**User Story:** As a system operator, I want stale data automatically removed from circular buffers, so that memory usage remains bounded and clients receive only recent data.

#### Acceptance Criteria

1. WHEN the server starts THEN the Express Server SHALL initialize BufferCleaner with a timeout threshold
2. WHEN the cleaning interval triggers THEN the Express Server SHALL remove data older than the timeout from circular buffers
3. WHEN data is removed THEN the Express Server SHALL log the number of entries cleaned per channel
4. WHILE the server is running THEN the Express Server SHALL run buffer cleaning every 60 seconds

### Requirement 5: Connection Cleanup

**User Story:** As a system administrator, I want disconnected clients properly cleaned up from all tracking structures, so that memory leaks are prevented and system state remains accurate.

#### Acceptance Criteria

1. WHEN a client disconnects THEN the Express Server SHALL remove the client from wsClients map
2. WHEN a system disconnects THEN the Express Server SHALL remove empty system entries from connectedSystems
3. WHEN a client disconnects THEN the Express Server SHALL remove the client from all system watcher sets
4. WHEN iterating over clients THEN the Express Server SHALL skip closed connections without storing references
5. WHEN a system disconnects THEN the Express Server SHALL delete stored state for that SystemId

### Requirement 6: State Broadcasting

**User Story:** As a monitoring client, I want to receive timely state updates with proper filtering by SystemId, so that I see only relevant data for the system I'm monitoring.

#### Acceptance Criteria

1. WHEN state is updated THEN the Express Server SHALL broadcast to all connected WebSocket clients
2. WHEN broadcasting THEN the Express Server SHALL include a timestamp in each broadcast message
3. WHEN no telemetry is received for 5 seconds THEN the Express Server SHALL broadcast the last known state
4. WHEN broadcasting THEN the Express Server SHALL preserve SystemId in the state structure
5. WHEN a client is watching a specific system THEN the Express Server SHALL only send state matching that SystemId

### Requirement 7: Broadcast Throttling

**User Story:** As a system administrator, I want broadcast frequency reduced under memory pressure, so that the server can recover from high memory usage without crashing.

#### Acceptance Criteria

1. WHEN memory usage exceeds threshold THEN the Express Server SHALL throttle broadcasts using BroadcastThrottler
2. WHEN throttling is active THEN the Express Server SHALL increase the minimum interval between broadcasts
3. WHEN throttling state changes THEN the Express Server SHALL log the state change with memory usage details
4. WHEN checking if broadcast should occur THEN the Express Server SHALL use current heap usage to determine throttling

### Requirement 8: Graceful Shutdown

**User Story:** As a system administrator, I want the server to shut down gracefully on SIGTERM, so that all intervals are cleared and monitoring services are stopped properly.

#### Acceptance Criteria

1. WHEN SIGTERM is received THEN the Express Server SHALL clear all active intervals
2. WHEN shutting down THEN the Express Server SHALL stop MemoryMonitor
3. WHEN shutting down THEN the Express Server SHALL stop BufferCleaner
4. WHEN shutting down THEN the Express Server SHALL close the WebSocket server
5. WHEN shutting down THEN the Express Server SHALL close the HTTP server and exit with code 0

### Requirement 9: Periodic Message Processing

**User Story:** As a system operator, I want buffered messages processed at regular intervals, so that state updates are timely without overwhelming the system.

#### Acceptance Criteria

1. WHEN the server starts THEN the Express Server SHALL start a message processing interval at 50ms
2. WHEN the processing interval triggers THEN the Express Server SHALL sort buffered messages by timestamp
3. WHEN processing messages THEN the Express Server SHALL update state for each message in order
4. WHEN processing messages THEN the Express Server SHALL broadcast state after each update
5. WHEN an error occurs during processing THEN the Express Server SHALL log the error and continue with remaining messages

### Requirement 10: System Filtering

**User Story:** As a monitoring client, I want to receive only telemetry for the system I'm watching, so that I don't process irrelevant data from other systems.

#### Acceptance Criteria

1. WHEN a client connects with a systemId parameter THEN the Express Server SHALL associate that client with the specified system
2. WHEN broadcasting state THEN the Express Server SHALL filter by the client's systemToWatch property
3. WHEN a client has no systemToWatch THEN the Express Server SHALL send all state updates to that client
4. WHEN a system disconnects THEN the Express Server SHALL move watching clients to the waiting list
5. WHEN a new system connects THEN the Express Server SHALL connect waiting clients to that system

### Requirement 11: Diagnostic Logging

**User Story:** As a system administrator, I want periodic diagnostic logs about server activity, so that I can monitor performance and identify issues.

#### Acceptance Criteria

1. WHEN 30 seconds elapse THEN the Express Server SHALL log message processing statistics
2. WHEN 30 seconds elapse THEN the Express Server SHALL log systems list broadcast count
3. WHEN 30 seconds elapse THEN the Express Server SHALL log last known state broadcast count
4. WHEN sampling broadcasts THEN the Express Server SHALL log serialized state size periodically
5. WHEN logging diagnostics THEN the Express Server SHALL include buffer sizes and connection counts

### Requirement 12: Broadcast Optimization

**User Story:** As a system operator, I want broadcasts throttled per system to prevent excessive updates, so that network bandwidth and client processing are optimized.

#### Acceptance Criteria

1. WHEN broadcasting state THEN the Express Server SHALL enforce a minimum 100ms interval per SystemId
2. WHEN a broadcast is attempted too soon THEN the Express Server SHALL skip that broadcast
3. WHEN tracking broadcast times THEN the Express Server SHALL maintain a map of last broadcast time per SystemId
4. WHEN a system disconnects THEN the Express Server SHALL remove that system's broadcast time tracking
