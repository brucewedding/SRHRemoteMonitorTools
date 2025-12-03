const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');

// Import telemetry processing components
const MessageParser = require('./MessageParser');
const StateAggregator = require('./StateAggregator');
const MemoryMonitor = require('./MemoryMonitor');
const BufferCleaner = require('./BufferCleaner');
const BroadcastThrottler = require('./BroadcastThrottler');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

// Store WebSocket to email mapping
const wsClients = new Map();

// Track connected systems and their watching clients
const connectedSystems = new Map();

// Track clients waiting for a system
const waitingClients = new Set();

// Initialize telemetry processing components
const MESSAGE_BUFFER_SIZE = 100;
const messageBuffer = [];
const messageParser = new MessageParser();
const stateAggregator = new StateAggregator();
let lastTelemetryTime = Date.now();

// Initialize broadcast throttling
const broadcastThrottler = new BroadcastThrottler({
    normalIntervalMs: 100,
    throttledIntervalMs: 500,
    memoryThresholdMB: 350
});

// Track per-system broadcast times
const lastBroadcastTime = new Map();

// Store per-system states
const systemStates = new Map();

// Track throttling state (Requirement 7.3)
let wasThrottled = false;

// Interval references for graceful shutdown (Requirement 8.1)
let messageProcessingInterval;
let lastKnownStateBroadcastInterval;
let throttlingCheckInterval;
let diagnosticLoggingInterval;

// Diagnostic counters (Requirements 11.1, 11.2, 11.3)
let messageProcessCount = 0;
let systemsListBroadcastCount = 0;
let lastKnownStateBroadcastCount = 0;

// Initialize memory monitoring (Requirements 3.1, 3.2, 3.3)
const memoryMonitor = new MemoryMonitor({
    warningThresholdMB: 350,
    criticalThresholdMB: 400,
    logger: console,
    onCritical: () => {
        console.error('[MemoryMonitor] Critical threshold exceeded, exiting process');
        process.exit(1);
    }
});

// Initialize buffer cleaning (Requirement 4.1)
const bufferCleaner = new BufferCleaner(stateAggregator, {
    timeoutMs: 300000, // 5 minutes
    logger: console
});

/**
 * Enhanced memory check with server-specific diagnostics
 * Validates: Requirement 3.4
 */
const originalCheck = memoryMonitor.check.bind(memoryMonitor);
memoryMonitor.check = function (diagnostics = {}) {
    // Add server-specific diagnostics
    const enhancedDiagnostics = {
        ...diagnostics,
        bufferSizes: {
            messageBufferSize: messageBuffer.length,
            systemStatesSize: systemStates.size,
            connectedSystemsSize: connectedSystems.size,
            wsClientsSize: wsClients.size,
            waitingClientsSize: waitingClients.size,
            lastBroadcastTimeSize: lastBroadcastTime.size
        }
    };
    
    return originalCheck(enhancedDiagnostics);
};

/**
 * Process incoming telemetry message
 * Validates: Requirements 1.1, 1.3, 1.4, 1.5
 * @param {string} rawMessage - Raw message string
 * @returns {boolean} True if message was successfully processed
 */
function processTelemetryMessage(rawMessage) {
    try {
        // Parse raw message using MessageParser (Requirement 1.1)
        const parsedMessage = messageParser.parse(rawMessage);
        
        // Handle parsing failures gracefully (Requirement 1.5)
        if (!parsedMessage) {
            console.warn('[Telemetry] Failed to parse message');
            return false;
        }
        
        // Update lastTelemetryTime on successful parse
        lastTelemetryTime = Date.now();
        
        // Check buffer capacity and remove oldest if full (Requirement 1.3)
        if (messageBuffer.length >= MESSAGE_BUFFER_SIZE) {
            messageBuffer.shift(); // Remove oldest message
            // Log warning when buffer is full (Requirement 1.4)
            console.warn('[Telemetry] Message buffer full, removing oldest message');
        }
        
        // Add parsed message to buffer
        messageBuffer.push(parsedMessage);
        
        return true;
    } catch (error) {
        // Handle errors gracefully and continue processing (Requirement 1.5)
        console.error('[Telemetry] Error processing message:', error);
        return false;
    }
}

/**
 * Broadcast aggregated state to all connected clients
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 10.2, 7.1, 7.2
 */
const broadcastAggregatedState = () => {
  try {
    // Get live state (still contains CircularBuffers)
    const rawState = stateAggregator.getState();

    // Get SystemId first to check throttling per system
    const systemId = rawState.SystemId;
    if (!systemId) {
      return; // No system ID, skip broadcast
    }

    // Throttle broadcasts per system to prevent excessive updates
    const now = Date.now();
    const lastBroadcast = lastBroadcastTime.get(systemId) || 0;
    if (now - lastBroadcast < MIN_BROADCAST_INTERVAL) {
      return; // Skip this broadcast, too soon since last one
    }
    lastBroadcastTime.set(systemId, now);

    // Check memory usage for throttling (Requirements 7.1, 7.2)
    const heapUsageMB = process.memoryUsage().heapUsed / 1024 / 1024;

    // Check if we should broadcast now based on throttling (Requirement 7.1)
    if (!broadcastThrottler.shouldBroadcastNow(heapUsageMB)) {
      return; // Skip this broadcast due to throttling
    }

    // --------- Build SEND-ONLY snapshot with arrays ---------
    const sendState = { ...rawState };

    if (rawState.StreamingPressure) {
      const sp = { ...rawState.StreamingPressure };

      const channels = [
        'leftAtrial',
        'rightAtrial',
        'leftVentricular',
        'rightVentricular',
        'aortic',
        'pulmonaryArterial'
      ];

      channels.forEach(channel => {
        const buf = rawState.StreamingPressure[channel];
        if (buf && typeof buf.toArray === 'function') {
          sp[channel] = buf.toArray(); // convert to plain array for JSON
        }
      });

      sendState.StreamingPressure = sp;
    }

    // Include timestamp in broadcast (Requirement 6.2)
    sendState.Timestamp = now;

    // --------- Store TRIMMED state for last-known broadcasts ---------
    if (systemId && connectedSystems.has(systemId)) {
      // Keep a shallow copy without the heavy streaming arrays
      const { StreamingPressure, ...stateWithoutStreaming } = rawState;

      // Optional: keep tiny summary instead of full buffers
      if (rawState.StreamingPressure) {
        const { sampleRate, unit, lastUpdate } = rawState.StreamingPressure;
        stateWithoutStreaming.StreamingPressure = { sampleRate, unit, lastUpdate };
      }

      systemStates.set(systemId, stateWithoutStreaming);
    }

    const stateMessage = JSON.stringify(sendState);

    // Send to all connected WebSocket clients (Requirement 6.1)
    // Filter broadcasts by SystemId for each client (Requirement 10.2)
    // Skip closed connections without retaining references (Requirement 5.4)
    if (fastify.websocketServer) {
      fastify.websocketServer.clients.forEach(client => {
        // Only process open connections (Requirement 5.4)
        if (client.readyState === 1) { // WebSocket.OPEN = 1
          try {
            // Filter by SystemId if client is watching a specific system
            if (client.systemToWatch) {
              // Only send if state matches the system the client is watching
              if (systemId === client.systemToWatch) {
                client.send(stateMessage);
              }
            } else {
              // If client is not watching a specific system, send all states
              client.send(stateMessage);
            }
          } catch (error) {
            fastify.log.error({ error }, 'Error sending state to client');
          }
        }
        // Closed connections (readyState !== 1) are skipped without storing references
      });
    }

    // Record that broadcast occurred (Requirement 7.1)
    broadcastThrottler.recordBroadcast();
  } catch (error) {
    fastify.log.error({ error }, 'Error broadcasting aggregated state');
  }
};

/**
 * Broadcast last known state when no telemetry received
 * Validates: Requirements 6.3, 11.3
 */
function broadcastLastKnownState() {
    try {
        // Check time since last telemetry (Requirement 6.3)
        const timeSinceLastTelemetry = Date.now() - lastTelemetryTime;
        
        // If timeout exceeded (5 seconds), broadcast stored states
        if (timeSinceLastTelemetry > 5000) {
            // Iterate over stored system states
            for (const [systemId, state] of systemStates.entries()) {
                // Check if clients are watching each system before broadcasting
                const hasWatchingClients = Array.from(wss.clients).some(client => {
                    return client.readyState === 1 && 
                           (!client.systemToWatch || client.systemToWatch === systemId);
                });
                
                if (!hasWatchingClients) {
                    continue;
                }
                
                // Update timestamp to current time
                const updatedState = {
                    ...state,
                    Timestamp: Date.now()
                };
                
                // Serialize state to JSON
                const stateJson = JSON.stringify(updatedState);
                
                // Filter broadcasts by SystemId and skip closed connections
                wss.clients.forEach(client => {
                    try {
                        // Skip closed connections
                        if (client.readyState !== 1) {
                            return;
                        }
                        
                        // Filter by SystemId
                        if (client.systemToWatch) {
                            if (systemId === client.systemToWatch) {
                                client.send(stateJson);
                            }
                        } else {
                            // No filter - send to clients without systemToWatch
                            client.send(stateJson);
                        }
                    } catch (error) {
                        console.error('[LastKnownState] Error sending to client:', error);
                    }
                });
                
                // Track last known state broadcast count (Requirement 11.3)
                lastKnownStateBroadcastCount++;
            }
        }
    } catch (error) {
        console.error('[LastKnownState] Error broadcasting last known state:', error);
    }
}

/**
 * Process buffered messages in timestamp order
 * Validates: Requirements 1.2, 2.1, 2.2, 9.2, 9.3, 9.4, 9.5, 11.1
 */
function processMessageBuffer() {
    try {
        // Return early if buffer is empty
        if (messageBuffer.length === 0) {
            return;
        }
        
        // Sort buffered messages by timestampUtc (Requirements 1.2, 9.2)
        messageBuffer.sort((a, b) => a.timestampUtc - b.timestampUtc);
        
        // Process each message in order (Requirement 9.3)
        while (messageBuffer.length > 0) {
            const message = messageBuffer.shift();
            
            try {
                // Update state aggregator for each message (Requirement 2.1)
                stateAggregator.updateState(message);
                
                // Broadcast state after each update (Requirements 2.2, 9.4)
                broadcastAggregatedState();
                
                // Track message processing count (Requirement 11.1)
                messageProcessCount++;
            } catch (error) {
                // Handle errors gracefully and continue processing (Requirements 1.5, 9.5)
                console.error('[Processing] Error processing message:', error);
                // Continue with next message
            }
        }
    } catch (error) {
        // Handle errors gracefully (Requirement 9.5)
        console.error('[Processing] Error in processMessageBuffer:', error);
    }
}

// Debug function to log current state
const logServerState = () => {
    console.log('\n=== Server State ===');
    console.log('Connected Systems:', Array.from(connectedSystems.keys()));
    console.log('Systems Map Size:', connectedSystems.size);
    console.log('Waiting Clients:', waitingClients.size);
    console.log('Total WebSocket Clients:', wss.clients.size);
    console.log('==================\n');
};

// Helper function to get first available system
const getFirstAvailableSystem = () => {
    return Array.from(connectedSystems.keys())[0];
};

// Helper function to clean up duplicate systems
const cleanupDuplicateSystems = (systemId) => {
    const duplicates = [];
    for (const [id, watchers] of connectedSystems.entries()) {
        if (id === systemId && duplicates.indexOf(id) === -1) {
            duplicates.push(id);
        }
    }
    
    // Keep only the first instance and remove others
    if (duplicates.length > 1) {
        duplicates.slice(1).forEach(dupId => {
            connectedSystems.delete(dupId);
        });
    }
};

// Helper function to broadcast available systems
// Validates: Requirement 11.2, 5.4
const broadcastSystemsList = () => {
    // Get unique systems, sort them, and clean up duplicates
    const uniqueSystems = Array.from(new Set(Array.from(connectedSystems.keys())));
    uniqueSystems.forEach(cleanupDuplicateSystems);
    
    const systems = Array.from(connectedSystems.keys()).sort();
    
    const message = {
        type: 'systems_list',
        systems,
        timestamp: new Date().toISOString()
    };
    
    // Send to all connected clients
    // Check readyState === 1 before sending (Requirement 5.4)
    // Skip closed connections without storing references (Requirement 5.4)
    wss.clients.forEach(client => {
        if (client.readyState === 1) {
            client.send(JSON.stringify(message));
        }
    });
    
    // Track systems list broadcast count (Requirement 11.2)
    systemsListBroadcastCount++;
};

// Helper function to connect client to system
const connectClientToSystem = (client, systemId) => {
    // Clean up any duplicates before connecting
    cleanupDuplicateSystems(systemId);
    
    if (!connectedSystems.has(systemId)) {
        connectedSystems.set(systemId, new Set());
    }
    
    // Remove client from any other system's watchers
    for (const [id, watchers] of connectedSystems.entries()) {
        if (id !== systemId) {
            watchers.delete(client);
            // Clean up empty system entries
            if (watchers.size === 0) {
                connectedSystems.delete(id);
            }
        }
    }
    
    connectedSystems.get(systemId).add(client);
    client.systemToWatch = systemId;
    waitingClients.delete(client);
    
    // Broadcast updated list after connection
    broadcastSystemsList();
};

// Format display name from email
const formatDisplayName = (email) => {
    if (!email) return 'Someone';
    
    if (email.endsWith('@realheart.se')) {
        const [name] = email.split('@');
        const [firstName, lastName] = name.split('.');
        if (firstName && lastName) {
            return `${firstName.charAt(0).toUpperCase() + firstName.slice(1)} ${lastName.charAt(0).toUpperCase() + lastName.slice(1)}`;
        }
    }
    return email;
};

// Handle uncaught exceptions
process.on('uncaughtException', (err) => 
{
    console.error('Uncaught Exception:', err);
    process.exit(1); // This will trigger PM2 to restart the process
  });
  
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => 
{
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
  
// Graceful shutdown handler
// Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5
function gracefulShutdown(signal) {
    console.log(`${signal} signal received`);
    
    // Clear message processing interval (Requirement 8.1)
    if (messageProcessingInterval) {
        clearInterval(messageProcessingInterval);
        console.log('[Telemetry] Message processing interval cleared');
    }
    
    // Clear last known state broadcast interval (Requirement 8.1)
    if (lastKnownStateBroadcastInterval) {
        clearInterval(lastKnownStateBroadcastInterval);
        console.log('[Telemetry] Last known state broadcast interval cleared');
    }
    
    // Clear throttling check interval (Requirement 8.1)
    if (throttlingCheckInterval) {
        clearInterval(throttlingCheckInterval);
        console.log('[BroadcastThrottler] Throttling check interval cleared');
    }
    
    // Clear diagnostic logging interval (Requirement 8.1)
    if (diagnosticLoggingInterval) {
        clearInterval(diagnosticLoggingInterval);
        console.log('[Diagnostics] Diagnostic logging interval cleared');
    }
    
    // Stop memory monitor (Requirement 8.2)
    memoryMonitor.stopMonitoring();
    console.log('[MemoryMonitor] Memory monitoring stopped');
    
    // Stop buffer cleaner (Requirement 8.3)
    bufferCleaner.stopCleaning();
    console.log('[BufferCleaner] Buffer cleaning stopped');
    
    // Close WebSocket server gracefully (Requirement 8.4)
    wss.close(() => {
        console.log('WebSocket server closed');
        
        // Close HTTP server gracefully (Requirement 8.4)
        server.close(() => {
            console.log('HTTP server closed');
            process.exit(0); // Exit with code 0 (Requirement 8.5)
        });
    });
    
    // Force exit if graceful shutdown fails
    setTimeout(() => {
        console.error('Forced shutdown');
        process.exit(1);
    }, 10000); // Force shutdown after 10 seconds
}

// Handle SIGTERM signal (for PM2 and Unix systems)
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle SIGINT signal (for Ctrl+C and Windows compatibility)
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

function isCriticalError(error) 
{
    const criticalErrors = [
      'ECONNRESET',
      'EPIPE',
      'ERR_STREAM_DESTROYED'
    ];
    
    return criticalErrors.includes(error.code);
  }

// WebSocket connection handling
wss.on('connection', (ws, req) => 
{
    console.log('\n[New WebSocket Connection]');
    // Parse SystemId from URL query parameters
    const url = new URL(req.url, `http://${req.headers.host}`);
    let systemToWatch = url.searchParams.get('systemId');
    console.log('Connection Query Params:', {
        systemToWatch,
        url: req.url
    });
    
    // If no system specified, use first available or wait
    if (!systemToWatch) {
        systemToWatch = getFirstAvailableSystem();
        if (!systemToWatch) {
            waitingClients.add(ws);
            console.log('No systems available, client added to waiting list');
        }
    }

    let displayName;
    const connectionType = url.searchParams.get('type');
    if (connectionType === 'device') {
        // Get raw device name and clean it up
        const rawDeviceName = url.searchParams.get('device-name') || 'Unknown Device';
        // Remove any query parameters and decode URI components
        displayName = decodeURIComponent(rawDeviceName).split('?')[0].trim();
        
        // Store the SystemId in wsClients map
        wsClients.set(ws, url.searchParams.get('SystemId'));
    } else {
        displayName = formatDisplayName(url.searchParams.get('email'));
        // Store the email in wsClients map
        wsClients.set(ws, url.searchParams.get('email'));
    }

    if (systemToWatch) {
        connectClientToSystem(ws, systemToWatch);
    }

    // Send initial systems list to new client
    console.log('[Initial Systems Broadcast]');
    broadcastSystemsList();

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        if (isCriticalError(error)) 
        {
          process.exit(1);
        }
      });
    
    // Broadcast connection message
    // Check readyState === 1 before sending (Requirement 5.4)
    // Skip closed connections without storing references (Requirement 5.4)
    const connectionMessage = {
        type: 'deviceMessage',
        timestamp: new Date().toISOString(),
        username: displayName,
        message: `${displayName} just connected`
    };
    
    wss.clients.forEach((client) => {
        if (client.readyState === 1) {
            client.send(JSON.stringify(connectionMessage));
        }
    });

    ws.on('message', (data) => {
        try {
            const rawData = data.toString();
            const message = JSON.parse(rawData);

            // Detect and route telemetry messages (Requirement 1.1)
            // Telemetry messages have: messageType, timestampUtc, source, and data fields
            if (message.messageType && 
                typeof message.timestampUtc === 'number' && 
                message.source && 
                message.data) {
                // Route to telemetry processing pipeline
                processTelemetryMessage(rawData);
                return; // Skip existing message handling
            }

            // Handle array of system messages
            if (Array.isArray(message) && message.length > 0 && message[0].Type === 'systemMessage') {
                if (ws.systemId) {
                    const watchingClients = connectedSystems.get(ws.systemId);
                    if (watchingClients) {
                        message.forEach(msg => {
                            const systemMessage = {
                                type: 'systemMessage',
                                message: msg.Message,
                                messageType: msg.MessageType,
                                source: msg.Source,
                                timestamp: msg.Timestamp
                            };
                            
                            watchingClients.forEach(client => {
                                if (client !== ws && client.readyState === 1) {
                                    client.send(JSON.stringify(systemMessage));
                                }
                            });
                        });
                    }
                }
                return;
            }

            // Track system if SystemId is present in message
            if (message.SystemId) {
                const systemId = message.SystemId;

                // Clean up any duplicates before adding new system
                cleanupDuplicateSystems(systemId);

                // Add or update system connection if not already tracked
                if (!connectedSystems.has(systemId)) {
                    connectedSystems.set(systemId, new Set());
                }
                
                // Mark this connection as the system if not already marked
                if (!ws.isSystem) {
                    ws.isSystem = true;
                    ws.systemId = systemId;
                    
                    // Set SystemId in state aggregator (Requirement 6.4)
                    stateAggregator.setSystemId(systemId);
                    
                    // Connect waiting clients to new system (Requirement 10.5)
                    const clientsToConnect = Array.from(waitingClients);
                    clientsToConnect.forEach(client => {
                        if (client.readyState === 1) { // WebSocket.OPEN
                            connectClientToSystem(client, systemId);
                            console.log(`[System] Connected waiting client to system ${systemId}`);
                        }
                    });
                    
                    // Broadcast updated systems list after marking as system
                    broadcastSystemsList();
                    
                    console.log(`[System] Device registered as system ${systemId}, connected ${clientsToConnect.length} waiting clients`);
                }

                // Forward status update to watching clients
                const watchingClients = connectedSystems.get(systemId);
                if (watchingClients) {
                    // Forward the status update
                    watchingClients.forEach(client => {
                        if (client !== ws && client.readyState === 1) {
                            client.send(rawData);
                        }
                    });

                    // Process any messages in the status update
                    if (message.Messages && Array.isArray(message.Messages)) {
                        message.Messages.forEach(msg => {
                            const systemMessage = {
                                type: 'systemMessage',
                                message: msg.Message,
                                messageType: msg.MessageType,
                                source: msg.Source,
                                timestamp: msg.Timestamp
                            };
                            
                            watchingClients.forEach(client => {
                                if (client !== ws && client.readyState === 1) {
                                    client.send(JSON.stringify(systemMessage));
                                }
                            });
                        });
                    }
                }
            }

            // Handle device messages
            else if (message?.type === 'deviceMessage') {
                // Format the display name from the email
                const displayName = formatDisplayName(message.email);
                
                // Send to all clients, marking the message as "self" for the sender
                // Check readyState === 1 before sending (Requirement 5.4)
                // Skip closed connections without storing references (Requirement 5.4)
                wss.clients.forEach((client) => {
                    if (client.readyState === 1) {
                        const broadcastMessage = {
                            type: 'deviceMessage',
                            timestamp: new Date().toISOString(),
                            username: displayName,
                            message: message.message,
                            self: client === ws
                        };
                        client.send(JSON.stringify(broadcastMessage));
                    }
                });
            }
        } catch (error) {
            console.error('Error processing message:', error);
            // Don't forward raw messages on parse error
            try {
                const email = wsClients.get(ws) || 'Unknown User';
                const broadcastMessage = {
                    type: 'deviceMessage',
                    timestamp: new Date().toISOString(),
                    username: formatDisplayName(email),
                    message: data.toString()
                };
                
                const broadcastString = JSON.stringify(broadcastMessage);
                
                // Send to ALL clients INCLUDING the sender
                // Check readyState === 1 before sending (Requirement 5.4)
                // Skip closed connections without storing references (Requirement 5.4)
                wss.clients.forEach((client) => {
                    if (client.readyState === 1) {
                        client.send(broadcastString);
                    }
                });
            } catch (innerError) {
                console.error('Error broadcasting message:', innerError);
            }
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        
        // Ensure client removed from wsClients (Requirement 5.1)
        wsClients.delete(ws);
        
        // Ensure client removed from waitingClients (Requirement 5.1)
        waitingClients.delete(ws);
        
        // Remove client from all system watcher sets (Requirement 5.3)
        for (const [systemId, watchers] of connectedSystems.entries()) {
            watchers.delete(ws);
            
            // Remove empty system entries from connectedSystems (Requirement 5.2)
            if (watchers.size === 0) {
                connectedSystems.delete(systemId);
                console.log(`[Cleanup] Removed empty system entry: ${systemId}`);
            }
        }
        
        // If this was a system connection, perform additional cleanup
        if (ws.isSystem && ws.systemId) {
            const systemId = ws.systemId;
            console.log(`System ${systemId} disconnected`);
            
            // Get watching clients before cleanup
            const watchingClients = connectedSystems.get(systemId) || new Set();
            
            // Delete from systemStates (Requirement 5.5)
            if (systemStates.has(systemId)) {
                systemStates.delete(systemId);
                console.log(`[Cleanup] Deleted system state for ${systemId}`);
            }
            
            // Delete from lastBroadcastTime (Requirement 12.4)
            if (lastBroadcastTime.has(systemId)) {
                lastBroadcastTime.delete(systemId);
                console.log(`[Cleanup] Deleted broadcast time tracking for ${systemId}`);
            }
            
            // Remove system from connectedSystems
            connectedSystems.delete(systemId);
            
            // Move watching clients to waitingClients on system disconnect (Requirement 10.4)
            watchingClients.forEach(client => {
                if (client.readyState === 1) { // WebSocket.OPEN
                    waitingClients.add(client);
                    client.systemToWatch = null;
                    console.log(`[Cleanup] Moved client to waiting list`);
                }
            });
            
            if (watchingClients.size > 0) {
                console.log(`[Cleanup] Moved ${watchingClients.size} clients to waiting list`);
            }
            
            // Broadcast updated systems list
            broadcastSystemsList();
        }
    });
});

// Start message processing interval (Requirement 9.1)
// Process buffered messages every 50ms
messageProcessingInterval = setInterval(processMessageBuffer, 50);

// Start last known state broadcast interval (Requirement 6.3)
// Broadcast last known state every 100ms
lastKnownStateBroadcastInterval = setInterval(broadcastLastKnownState, 100);

// Start throttling state tracking (Requirement 7.3)
// Check throttling state every 5 seconds and log changes
throttlingCheckInterval = setInterval(() => {
    const heapUsageMB = process.memoryUsage().heapUsed / 1024 / 1024;
    const isCurrentlyThrottled = heapUsageMB >= 350; // Memory threshold
    
    // Log when throttling activates
    if (isCurrentlyThrottled && !wasThrottled) {
        console.log('[BroadcastThrottler] Throttling ACTIVATED', {
            heapUsageMB: heapUsageMB.toFixed(2),
            threshold: 350,
            timestamp: new Date().toISOString()
        });
        wasThrottled = true;
    }
    
    // Log when throttling deactivates
    if (!isCurrentlyThrottled && wasThrottled) {
        console.log('[BroadcastThrottler] Throttling DEACTIVATED', {
            heapUsageMB: heapUsageMB.toFixed(2),
            threshold: 350,
            timestamp: new Date().toISOString()
        });
        wasThrottled = false;
    }
}, 5000);

// Start diagnostic logging interval (Requirements 11.1, 11.2, 11.3, 11.5)
// Log diagnostics every 30 seconds
diagnosticLoggingInterval = setInterval(() => {
    const diagnostics = {
        messageProcessCount,
        systemsListBroadcastCount,
        lastKnownStateBroadcastCount,
        bufferSizes: {
            messageBufferSize: messageBuffer.length,
            systemStatesSize: systemStates.size
        },
        connectionCounts: {
            connectedSystemsSize: connectedSystems.size,
            wsClientsSize: wsClients.size,
            waitingClientsSize: waitingClients.size
        },
        timestamp: new Date().toISOString()
    };
    
    console.log('[Diagnostics] Periodic report:', diagnostics);
}, 30000);

server.listen(3000, () => {
    console.log('Server is running on port 3000');
    console.log('[Telemetry] Message processing interval started (50ms)');
    console.log('[Telemetry] Last known state broadcast interval started (100ms)');
    console.log('[BroadcastThrottler] Throttling check interval started (5s interval)');
    console.log('[Diagnostics] Diagnostic logging interval started (30s interval)');
    
    // Start memory monitoring with 30-second interval (Requirement 3.5)
    memoryMonitor.startMonitoring(30000);
    console.log('[MemoryMonitor] Memory monitoring started (30s interval)');
    
    // Start buffer cleaning with 60-second interval (Requirement 4.4)
    bufferCleaner.startCleaning(60000);
    console.log('[BufferCleaner] Buffer cleaning started (60s interval)');
});

function checkCriticalConditions() {
    // Example: Check memory usage
    const usedMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    if (usedMemory > 400) { // More than 400MB since server only has 512MB RAM
      console.error('Memory threshold exceeded');
      process.exit(1);
    }
    
    // Example: Check WebSocket connections
    const clientCount = wss.clients.size;
    if (clientCount > 100) { // Too many connections
      console.error('Too many WebSocket connections');
      process.exit(1);
    }
  }
  
  // Run checks periodically
  setInterval(checkCriticalConditions, 60000);