const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');

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
        console.log(`[Cleanup] Found ${duplicates.length} instances of system ${systemId}`);
        duplicates.slice(1).forEach(dupId => {
            connectedSystems.delete(dupId);
            console.log(`[Cleanup] Removed duplicate system: ${dupId}`);
        });
    }
};

// Helper function to broadcast available systems
const broadcastSystemsList = () => {
    // Get unique systems, sort them, and clean up duplicates
    const uniqueSystems = Array.from(new Set(Array.from(connectedSystems.keys())));
    uniqueSystems.forEach(cleanupDuplicateSystems);
    
    const systems = Array.from(connectedSystems.keys()).sort();
    console.log('\n[broadcastSystemsList] Preparing to broadcast');
    console.log('Available Systems:', systems);
    
    const message = {
        type: 'systems_list',
        systems,
        timestamp: new Date().toISOString()
    };
    
    let sentCount = 0;
    // Send to all connected clients
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
            sentCount++;
        }
    });
    
    console.log(`[broadcastSystemsList] Sent to ${sentCount} clients`);
    logServerState();
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
                console.log(`[Cleanup] Removed empty system: ${id}`);
            }
        }
    }
    
    connectedSystems.get(systemId).add(client);
    client.systemToWatch = systemId;
    waitingClients.delete(client);
    console.log(`Connected client to system: ${systemId}`);
    
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
  
// Optional: Handle SIGTERM signal
process.on('SIGTERM', () => 
{
    console.info('SIGTERM signal received');
    
    // Close WebSocket server gracefully
    wss.close(() => {
      console.log('WebSocket server closed');
      
      // Close HTTP server gracefully
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });
    
    // Force exit if graceful shutdown fails
    setTimeout(() => 
    {
      console.error('Forced shutdown');
      process.exit(1);
    }, 10000); // Force shutdown after 10 seconds
});

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
    const connectionMessage = {
        type: 'deviceMessage',
        timestamp: new Date().toISOString(),
        username: displayName,
        message: `${displayName} just connected`
    };
    
    wss.clients.forEach((client) => {
        if (client.readyState === ws.OPEN) {
            client.send(JSON.stringify(connectionMessage));
        }
    });

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            console.log('\n[WebSocket Message]', {
                type: message.type,
                SystemId: message.SystemId,
                messageSize: data.toString().length
            });

            // Track system if SystemId is present in any message
            if (message.SystemId) {
                const systemId = message.SystemId;
                console.log('[System Message]', {
                    systemId,
                    isNewSystem: !connectedSystems.has(systemId),
                    existingSystems: Array.from(connectedSystems.keys())
                });

                // Clean up any duplicates before adding new system
                cleanupDuplicateSystems(systemId);

                // Add or update system connection if not already tracked
                if (!connectedSystems.has(systemId)) {
                    connectedSystems.set(systemId, new Set());
                    console.log(`[New System] ${systemId}`);
                    logServerState();
                    
                    // Connect all waiting clients to this system
                    if (waitingClients.size > 0) {
                        console.log(`[Connecting Waiting Clients] Count: ${waitingClients.size}`);
                        waitingClients.forEach(client => {
                            if (client.readyState === ws.OPEN) {
                                connectClientToSystem(client, systemId);
                            } else {
                                waitingClients.delete(client);
                            }
                        });
                    }
                }
                
                // Mark this connection as the system if not already marked
                if (!ws.isSystem) {
                    ws.isSystem = true;
                    ws.systemId = systemId;
                    console.log(`[Marking System] ${systemId}`);
                    // Broadcast updated systems list after marking as system
                    broadcastSystemsList();
                }
            }

            // Handle device messages differently from data updates
            if (message?.type === 'deviceMessage') 
            {
                // Format the display name from the email
                const displayName = formatDisplayName(message.email);
                
                // Send to all clients, marking the message as "self" for the sender
                wss.clients.forEach((client) => {
                    if (client.readyState === ws.OPEN) {
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
            else if (message?.type === 'deviceData')
            {
                // Forward the original data to other clients
                wss.clients.forEach((client) => {
                    if (client !== ws && client.readyState === ws.OPEN) {
                        // Send the original data first
                        client.send(data.toString());
                        
                        // If there are messages in the data, send them separately
                        if (message.Messages && Array.isArray(message.Messages)) {
                            message.Messages.forEach(msg => {
                                const systemMessage = {
                                    type: 'systemMessage',
                                    message: msg.Message,
                                    messageType: msg.MessageType, 
                                    source: msg.Source,
                                    timestamp: msg.Timestamp
                                };
                                client.send(JSON.stringify(systemMessage));
                            });
                        }
                    }
                });
            }
            else if (message.type === 'system_data') {
                // Handle other data updates (broadcast to watching clients only)
                if (ws.systemId) {
                    const watchingClients = connectedSystems.get(ws.systemId) || new Set();
                    watchingClients.forEach((client) => {
                        if (client.readyState === ws.OPEN) {
                            // Ensure UseMedicalSensor is boolean before sending
                            let dataToSend = data.toString();
                            if (message.UseMedicalSensor !== undefined) {
                                const modifiedMessage = { ...message };
                                modifiedMessage.UseMedicalSensor = modifiedMessage.UseMedicalSensor === true || modifiedMessage.UseMedicalSensor === 'true';
                                dataToSend = JSON.stringify(modifiedMessage);
                            }
                            // Send the data
                            client.send(dataToSend);
                        }
                    });
                }
            }
            else 
            {
                // Handle other data updates (broadcast to other clients only)
                wss.clients.forEach((client) => {
                    if (client !== ws && client.readyState === ws.OPEN) {
                        // Ensure UseMedicalSensor is boolean before sending
                        let dataToSend = data.toString();
                        if (message.UseMedicalSensor !== undefined) {
                            const modifiedMessage = { ...message };
                            modifiedMessage.UseMedicalSensor = modifiedMessage.UseMedicalSensor === true || modifiedMessage.UseMedicalSensor === 'true';
                            dataToSend = JSON.stringify(modifiedMessage);
                        }
                        // Send the data
                        client.send(dataToSend);
                        
                        // If there are messages in the data, send them separately
                        if (message.Messages && Array.isArray(message.Messages)) {
                            message.Messages.forEach(msg => {
                                const systemMessage = {
                                    type: 'systemMessage',
                                    message: msg.Message,
                                    messageType: msg.MessageType, 
                                    source: msg.Source,
                                    timestamp: msg.Timestamp
                                };
                                client.send(JSON.stringify(systemMessage));
                            });
                        }
                    }
                });
            }
        } 
        catch (error) 
        {
            console.error('Error processing message:', error);
            // Don't forward raw messages on parse error
            // Instead, try to handle it as a device message if possible
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
                wss.clients.forEach((client) => {
                    if (client.readyState === ws.OPEN) {
                        client.send(broadcastString);
                    }
                });
            } 
            catch (innerError) 
            {
                console.error('Error broadcasting message:', innerError);
            }
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        wsClients.delete(ws);
        waitingClients.delete(ws);
        
        // If this was a system connection, remove it from tracking
        if (ws.isSystem && ws.systemId) {
            connectedSystems.delete(ws.systemId);
            console.log(`System ${ws.systemId} disconnected`);
            
            // If this was the last system and there are clients, move them to waiting
            if (connectedSystems.size === 0) {
                const clients = connectedSystems.get(ws.systemId) || new Set();
                clients.forEach(client => {
                    if (client.readyState === ws.OPEN) {
                        waitingClients.add(client);
                        client.systemToWatch = null;
                    }
                });
                console.log(`Moved ${waitingClients.size} clients to waiting list`);
            }
            
            // Broadcast updated systems list
            broadcastSystemsList();
        }
    });
});

server.listen(3000, () => {
    console.log('Server is running on port 3000');
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