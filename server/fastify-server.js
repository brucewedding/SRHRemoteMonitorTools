const Fastify = require('fastify');
const websocket = require('@fastify/websocket');
const cors = require('@fastify/cors');
const MessageParser = require('./MessageParser');
const StateAggregator = require('./StateAggregator');

// Create Fastify instance with logging configuration
const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  }
});

// Initialize message parser and state aggregator
const messageParser = new MessageParser();
const stateAggregator = new StateAggregator();

// Message buffer for ordering by timestamp (Requirement 1.2)
const messageBuffer = [];
const MESSAGE_BUFFER_SIZE = 100; // Maximum messages to buffer
const MESSAGE_PROCESSING_INTERVAL = 50; // Process messages every 50ms

// Store WebSocket to email mapping (preserved from Express server)
const wsClients = new Map();

// Track connected systems and their watching clients (preserved from Express server)
const connectedSystems = new Map();

// Track clients waiting for a system (preserved from Express server)
const waitingClients = new Set();

// Track state per SystemId for broadcast filtering (Requirement 10.2)
const systemStates = new Map();

// Timeout configuration for broadcasting last known state (Requirement 6.3)
const BROADCAST_TIMEOUT_MS = 5000; // 5 seconds without telemetry
const BROADCAST_INTERVAL_MS = 100; // Broadcast every 100ms
let lastTelemetryTime = Date.now();

// Debug function to log current state
const logServerState = () => {
  fastify.log.info('=== Server State ===');
  fastify.log.info(`Connected Systems: ${Array.from(connectedSystems.keys())}`);
  fastify.log.info(`Systems Map Size: ${connectedSystems.size}`);
  fastify.log.info(`Waiting Clients: ${waitingClients.size}`);
  fastify.log.info('==================');
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
  fastify.websocketServer.clients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN = 1
      client.send(JSON.stringify(message));
    }
  });
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

/**
 * Process telemetry message through parser and aggregator
 * Validates: Requirements 1.1, 1.2, 1.5
 * @param {string} rawMessage - Raw telemetry message string
 * @returns {boolean} True if message was processed successfully
 */
const processTelemetryMessage = (rawMessage) => {
  try {
    // Parse the message (Requirement 1.1)
    const parsedMessage = messageParser.parse(rawMessage);
    
    // If parsing failed, log and continue (Requirement 1.5)
    if (!parsedMessage) {
      fastify.log.warn('Failed to parse telemetry message, continuing with other messages');
      return false;
    }
    
    // Update last telemetry time for timeout logic (Requirement 6.3)
    lastTelemetryTime = Date.now();
    
    // Add to message buffer for ordering (Requirement 1.2)
    messageBuffer.push(parsedMessage);
    
    // Limit buffer size to prevent memory issues
    if (messageBuffer.length > MESSAGE_BUFFER_SIZE) {
      messageBuffer.shift(); // Remove oldest message
    }
    
    return true;
  } catch (error) {
    // Handle errors gracefully (Requirement 1.5)
    fastify.log.error({ error }, 'Error processing telemetry message, continuing with other messages');
    return false;
  }
};

/**
 * Process buffered messages in timestamp order
 * Validates: Requirement 1.2
 */
const processMessageBuffer = () => {
  if (messageBuffer.length === 0) {
    return;
  }
  
  try {
    // Sort messages by timestampUtc (Requirement 1.2)
    messageBuffer.sort((a, b) => a.timestampUtc - b.timestampUtc);
    
    // Process all buffered messages
    while (messageBuffer.length > 0) {
      const message = messageBuffer.shift();
      
      try {
        // Update state with the message
        stateAggregator.updateState(message);
        
        // Broadcast updated state to all connected clients
        broadcastAggregatedState();
      } catch (error) {
        // Log error but continue processing (Requirement 1.5)
        fastify.log.error({ error, messageType: message.messageType }, 'Error updating state from message, continuing');
      }
    }
  } catch (error) {
    // Handle errors gracefully (Requirement 1.5)
    fastify.log.error({ error }, 'Error processing message buffer, continuing');
  }
};

/**
 * Broadcast aggregated state to all connected clients
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 10.2
 */
const broadcastAggregatedState = () => {
  try {
    const state = stateAggregator.getState();
    
    // Include timestamp in broadcast (Requirement 6.2)
    state.Timestamp = Date.now();
    
    // Preserve SystemId for client filtering (Requirement 6.4)
    // SystemId is already part of the state structure
    
    // Store state per SystemId for filtering (Requirement 10.2)
    if (state.SystemId) {
      systemStates.set(state.SystemId, state);
    }
    
    const stateMessage = JSON.stringify(state);
    
    // Send to all connected WebSocket clients (Requirement 6.1)
    // Filter broadcasts by SystemId for each client (Requirement 10.2)
    if (fastify.websocketServer) {
      fastify.websocketServer.clients.forEach(client => {
        if (client.readyState === 1) { // WebSocket.OPEN = 1
          try {
            // Filter by SystemId if client is watching a specific system
            if (client.systemToWatch) {
              // Only send if state matches the system the client is watching
              if (state.SystemId === client.systemToWatch) {
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
      });
    }
  } catch (error) {
    fastify.log.error({ error }, 'Error broadcasting aggregated state');
  }
};

/**
 * Broadcast last known state when no telemetry received
 * Validates: Requirement 6.3
 */
const broadcastLastKnownState = () => {
  try {
    const now = Date.now();
    const timeSinceLastTelemetry = now - lastTelemetryTime;
    
    // If timeout exceeded, broadcast last known state (Requirement 6.3)
    if (timeSinceLastTelemetry >= BROADCAST_TIMEOUT_MS) {
      // Broadcast all stored system states
      systemStates.forEach((state, systemId) => {
        // Update timestamp to current time (Requirement 6.2)
        state.Timestamp = now;
        const stateMessage = JSON.stringify(state);
        
        // Filter broadcasts by SystemId (Requirement 10.2)
        if (fastify.websocketServer) {
          fastify.websocketServer.clients.forEach(client => {
            if (client.readyState === 1) { // WebSocket.OPEN = 1
              try {
                // Only send if state matches the system the client is watching
                if (client.systemToWatch === systemId) {
                  client.send(stateMessage);
                }
              } catch (error) {
                fastify.log.error({ error }, 'Error sending last known state to client');
              }
            }
          });
        }
      });
    }
  } catch (error) {
    fastify.log.error({ error }, 'Error broadcasting last known state');
  }
};

// Start periodic message buffer processing (Requirement 1.2)
setInterval(processMessageBuffer, MESSAGE_PROCESSING_INTERVAL);

// Start periodic broadcast of last known state (Requirement 6.3)
setInterval(broadcastLastKnownState, BROADCAST_INTERVAL_MS);

function isCriticalError(error) {
  const criticalErrors = [
    'ECONNRESET',
    'EPIPE',
    'ERR_STREAM_DESTROYED'
  ];
  
  return criticalErrors.includes(error.code);
}

// Register CORS plugin
fastify.register(cors, {
  origin: true // Allow all origins for now, can be configured later
});

// Register WebSocket plugin
fastify.register(websocket, {
  options: {
    maxPayload: 1048576 // 1MB max payload
  }
});

// WebSocket route handler
fastify.register(async function (fastify) {
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    // In Fastify WebSocket, connection is the WebSocket itself
    const socket = connection.socket || connection;
    
    fastify.log.info('[New WebSocket Connection]');
    
    // Parse SystemId from URL query parameters
    const systemToWatchParam = req.query.systemId;
    let systemToWatch = systemToWatchParam;
    const connectionType = req.query.type;
    
    fastify.log.info({
      systemToWatch,
      connectionType,
      url: req.url
    }, 'Connection Query Params');
    
    // Only add UI clients to waiting list, not devices
    if (connectionType !== 'device') {
      // If no system specified, use first available or wait
      if (!systemToWatch) {
        systemToWatch = getFirstAvailableSystem();
        if (!systemToWatch) {
          waitingClients.add(socket);
          fastify.log.info('No systems available, client added to waiting list');
        }
      }
    }

    let displayName;
    
    fastify.log.info('Query parameters:', req.query);
    
    if (connectionType === 'device') {
      // Get raw device name and clean it up
      const rawDeviceName = req.query['device-name'] || 'Unknown Device';
      // Remove any query parameters and decode URI components
      displayName = decodeURIComponent(rawDeviceName).split('?')[0].trim();
      
      // Store the SystemId in wsClients map
      const deviceSystemId = req.query.SystemId;
      fastify.log.info(`Device SystemId from query: ${deviceSystemId}`);
      wsClients.set(socket, deviceSystemId);
      
      // Mark this socket as a device and store its SystemId
      socket.isDevice = true;
      socket.deviceSystemId = deviceSystemId;
      socket.isSystem = true;
      socket.systemId = deviceSystemId;
      
      // Set SystemId in state aggregator for this device (Requirement 6.4)
      if (deviceSystemId) {
        stateAggregator.state.SystemId = deviceSystemId;
        
        // Register this device as an available system
        if (!connectedSystems.has(deviceSystemId)) {
          connectedSystems.set(deviceSystemId, new Set());
        }
        
        fastify.log.info(`Device registered as system: ${deviceSystemId}`);
        
        // Connect any waiting clients to this new system
        if (waitingClients.size > 0) {
          fastify.log.info(`Connecting ${waitingClients.size} waiting clients to ${deviceSystemId}`);
          waitingClients.forEach(client => {
            if (client.readyState === 1) { // WebSocket.OPEN
              connectClientToSystem(client, deviceSystemId);
            }
          });
          waitingClients.clear();
        }
      }
    } else {
      displayName = formatDisplayName(req.query.email);
      // Store the email in wsClients map
      wsClients.set(socket, req.query.email);
    }

    if (systemToWatch) {
      connectClientToSystem(socket, systemToWatch);
    }

    // Send initial systems list to new client
    fastify.log.info('[Initial Systems Broadcast]');
    broadcastSystemsList();

    // Handle WebSocket errors
    socket.on('error', (error) => {
      fastify.log.error({ error }, 'WebSocket error');
      if (isCriticalError(error)) {
        process.exit(1);
      }
    });
    
    // Broadcast connection message
    const connectionMessage = {
      type: 'deviceMessage',
      timestamp: new Date().toISOString(),
      username: displayName,
      message: `${displayName} just connected`
    };
    
    fastify.websocketServer.clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN = 1
        client.send(JSON.stringify(connectionMessage));
      }
    });

    // Handle incoming messages
    socket.on('message', (data) => {
      try {
        const rawData = data.toString();
        const message = JSON.parse(rawData);

        // Check if this is a telemetry message (has messageType, timestampUtc, source, data fields)
        // Validates: Requirements 1.1, 1.2, 1.5
        if (message.messageType && message.timestampUtc !== undefined && message.source && message.data) {
          fastify.log.debug({ messageType: message.messageType }, 'Received telemetry message');
          
          // Process telemetry message through parser and aggregator
          processTelemetryMessage(rawData);
          return;
        }

        // Handle array of system messages
        if (Array.isArray(message) && message.length > 0 && message[0].Type === 'systemMessage') {
          if (socket.systemId) {
            const watchingClients = connectedSystems.get(socket.systemId);
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
                  if (client !== socket && client.readyState === 1) {
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
          if (!socket.isSystem) {
            socket.isSystem = true;
            socket.systemId = systemId;
            // Broadcast updated systems list after marking as system
            broadcastSystemsList();
          }

          // Forward status update to watching clients
          const watchingClients = connectedSystems.get(systemId);
          if (watchingClients) {
            // Forward the status update
            watchingClients.forEach(client => {
              if (client !== socket && client.readyState === 1) {
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
                  if (client !== socket && client.readyState === 1) {
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
          fastify.websocketServer.clients.forEach((client) => {
            if (client.readyState === 1) {
              const broadcastMessage = {
                type: 'deviceMessage',
                timestamp: new Date().toISOString(),
                username: displayName,
                message: message.message,
                self: client === socket
              };
              client.send(JSON.stringify(broadcastMessage));
            }
          });
        }
      } catch (error) {
        fastify.log.error({ error }, 'Error processing message');
        // Don't forward raw messages on parse error
        try {
          const email = wsClients.get(socket) || 'Unknown User';
          const broadcastMessage = {
            type: 'deviceMessage',
            timestamp: new Date().toISOString(),
            username: formatDisplayName(email),
            message: data.toString()
          };
          
          const broadcastString = JSON.stringify(broadcastMessage);
          
          // Send to ALL clients INCLUDING the sender
          fastify.websocketServer.clients.forEach((client) => {
            if (client.readyState === 1) {
              client.send(broadcastString);
            }
          });
        } catch (innerError) {
          fastify.log.error({ error: innerError }, 'Error broadcasting message');
        }
      }
    });

    // Handle connection close
    socket.on('close', () => {
      fastify.log.info('Client disconnected');
      wsClients.delete(socket);
      waitingClients.delete(socket);
      
      // If this was a system connection, remove it from tracking
      if (socket.isSystem && socket.systemId) {
        connectedSystems.delete(socket.systemId);
        fastify.log.info(`System ${socket.systemId} disconnected`);
        
        // If this was the last system and there are clients, move them to waiting
        if (connectedSystems.size === 0) {
          const clients = connectedSystems.get(socket.systemId) || new Set();
          clients.forEach(client => {
            if (client.readyState === 1) {
              waitingClients.add(client);
              client.systemToWatch = null;
            }
          });
          fastify.log.info(`Moved ${waitingClients.size} clients to waiting list`);
        }
        
        // Broadcast updated systems list
        broadcastSystemsList();
      }
    });
  });
});

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error({ error, request: request.url }, 'Request error');
  reply.status(500).send({ error: 'Internal Server Error' });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  fastify.log.error({ err }, 'Uncaught Exception');
  process.exit(1); // This will trigger PM2 to restart the process
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  fastify.log.error({ reason, promise }, 'Unhandled Rejection');
  process.exit(1);
});

// Handle SIGTERM signal for graceful shutdown
process.on('SIGTERM', async () => {
  fastify.log.info('SIGTERM signal received');
  
  try {
    await fastify.close();
    fastify.log.info('Server closed gracefully');
    process.exit(0);
  } catch (err) {
    fastify.log.error({ err }, 'Error during graceful shutdown');
    process.exit(1);
  }
});

// Check critical conditions periodically
function checkCriticalConditions() {
  // Check memory usage
  const usedMemory = process.memoryUsage().heapUsed / 1024 / 1024;
  if (usedMemory > 400) { // More than 400MB since server only has 512MB RAM
    fastify.log.error('Memory threshold exceeded');
    process.exit(1);
  }
  
  // Check WebSocket connections
  const clientCount = fastify.websocketServer ? fastify.websocketServer.clients.size : 0;
  if (clientCount > 100) { // Too many connections
    fastify.log.error('Too many WebSocket connections');
    process.exit(1);
  }
}

// Run checks periodically
setInterval(checkCriticalConditions, 60000);

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    fastify.log.info(`Server is running on port 3000`);
  } catch (err) {
    fastify.log.error({ err }, 'Error starting server');
    process.exit(1);
  }
};

start();
