const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

// Store WebSocket to email mapping
const wsClients = new Map();

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
    let displayName;
    
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
            let dataString = data.toString();

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