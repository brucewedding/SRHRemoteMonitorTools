const express = require('express');
const { WebSocketServer } = require('ws');
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

// Initialize logging
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
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        if (isCriticalError(error)) 
        {
          process.exit(1);
        }
      });
    
    // Get email from URL parameters
    const url = new URL(req.url, `http://${req.headers.host}`);
    const connectionType = url.searchParams.get('type');
    const displayName = connectionType === 'device' 
    ? url.searchParams.get('device-name') || 'Unknown Device'
    : formatDisplayName(url.searchParams.get('email'));

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

    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data.toString());
            let dataString = data.toString();

            // Log the message
            await appendToLog(message).catch(err => console.error('Failed to log message:', err));

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
                        client.send(dataString);
                        
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
            else 
            {
                // Handle other data updates (broadcast to other clients only)
                wss.clients.forEach((client) => {
                    if (client !== ws && client.readyState === ws.OPEN) {
                        // Ensure UseMedicalSensor is boolean before sending
                        let dataToSend = dataString;
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

// Initialize log file when server starts
console.log('Opening Log file...');
initializeLogFile().catch(console.error);