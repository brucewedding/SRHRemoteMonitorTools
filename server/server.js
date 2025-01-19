const express = require('express');
const { WebSocketServer, WebSocket } = require('ws');
const http = require('http');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

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
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
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
        type: 'chatMessage',
        timestamp: new Date().toISOString(),
        username: displayName,
        message: `${displayName} just connected`
    };
    
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(connectionMessage));
        }
    });

    ws.on('message', async (data) => {
        try {
            const rawData = data.toString();
            const message = JSON.parse(rawData);

            //console.log('Received message:', message);
            
            // Log the message
            await appendToLog(message).catch(err => console.error('Failed to log message:', err));

            // Handle array of system messages
            if (Array.isArray(message) && message.length > 0 && message[0].Type === 'systemMessage') {
                //console.log('Received system messages:', message);
                if (ws.systemId) {
                    const watchingClients = connectedSystems.get(ws.systemId);
                    if (watchingClients) {
                        message.forEach(msg => {
                            console.log('Processing message:', msg);
                            const systemMessage = {
                                type: 'systemMessage',
                                message: msg.Message,
                                messageType: msg.MessageType,
                                source: msg.Source || wsClients.get(ws) || 'Unknown User',
                                timestamp: msg.Timestamp
                            };
                            //console.log('Sending formatted message:', systemMessage);
                            
                            watchingClients.forEach(client => {
                                if (client !== ws && client.readyState === WebSocket.OPEN) {
                                    client.send(JSON.stringify(systemMessage));
                                }
                            });
                        });
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
                        // Broadcast updated systems list after marking as system
                        broadcastSystemsList();
                    }

                    // Forward status update to watching clients
                    const watchingClients = connectedSystems.get(systemId);
                    if (watchingClients) {
                        // Forward the status update
                        watchingClients.forEach(client => {
                            if (client !== ws && client.readyState === WebSocket.OPEN) {
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
                                    timestamp: msg.Timestamp,
                                    username: wsClients.get(ws) || 'Unknown User'
                                };
                                
                                watchingClients.forEach(client => {
                                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                                        client.send(JSON.stringify(systemMessage));
                                    }
                                });
                            });
                        }
                    }
                }

                // Handle device messages
                else if (message?.type === 'deviceMessage' || message?.type === 'chatMessage') {
                    // Get the display name from message or stored client info
                    const displayName = message.username || wsClients.get(ws) || 'Unknown User';
                    
                    // Send to all clients, marking the message as "self" for the sender
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            const broadcastMessage = {
                                type: 'chatMessage',
                                timestamp: message.timestamp || new Date().toISOString(),
                                username: displayName,
                                message: message.message,
                                self: client === ws
                            };
                            client.send(JSON.stringify(broadcastMessage));
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error processing message:', error);
            // Don't forward raw messages on parse error
            try {
                const email = wsClients.get(ws) || 'Unknown User';
                const broadcastMessage = {
                    type: 'chatMessage',
                    timestamp: new Date().toISOString(),
                    username: formatDisplayName(email),
                    message: data.toString()
                };
                
                const broadcastString = JSON.stringify(broadcastMessage);
                
                // Send to ALL clients INCLUDING the sender
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
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
                    if (client.readyState === WebSocket.OPEN) {
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

const LOG_FILE = path.join(__dirname, 'logdata.json');
/** @type {Array<{timestamp: string, type: string, data: any}>} */
let messageLog = [];
/** @type {fs.WriteStream} */
let logStream;

/**
 * Initialize the log file and create write stream
 * @returns {Promise<void>}
 */
async function initializeLogFile() {
    try {
        await fs.access(LOG_FILE);
        const data = await fs.readFile(LOG_FILE, 'utf8');
        messageLog = JSON.parse(data);
    } catch {
        await fs.writeFile(LOG_FILE, JSON.stringify([], null, 2));
    }
    
    // Create write stream in append mode
    logStream = fsSync.createWriteStream(LOG_FILE, { 
        flags: 'a',
        encoding: 'utf8'
    });
    
    // Handle stream errors
    logStream.on('error', (error) => {
        console.error('Error writing to log file:', error);
    });
    
    console.log('Log file initialized');
}

/**
 * Append message to log file using write stream
 * @param {any} message - The message to log
 * @returns {Promise<void>}
 */
async function appendToLog(message) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        type: Array.isArray(message) ? 'systemMessages' : 'message',
        data: message
    };
    messageLog.push(logEntry);
    
    // Write to stream with newline for easier reading
    return new Promise((resolve, reject) => {
        logStream.write(JSON.stringify(logEntry) + '\n', (error) => {
            if (error) reject(error);
            else resolve();
        });
    });
}

// Clean up write stream when server exits
process.on('SIGINT', () => {
    if (logStream) {
        logStream.end(() => {
            console.log('Log file stream closed');
            process.exit(0);
        });
    }
});

// Initialize log file when server starts
console.log('Opening Log file...');

initializeLogFile().catch(console.error);

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