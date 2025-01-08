const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { useUser } = require('@clerk/clerk-react');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

// Set proper MIME types for JavaScript modules before any other middleware
app.use((req, res, next) => {
    if (req.path.endsWith('.js')) {
        res.type('application/javascript');
    }
    next();
});

// Serve static files from dist directory first (production build)
app.use(express.static('dist', {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

// Then fallback to public directory for any files not in dist
app.use(express.static('public', {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

// Store WebSocket to email mapping
const wsClients = new Map();

// WebSocket connection handling
wss.on('connection', (ws, req) => {

    // Get user email from Clerk
    const user = req.auth?.userId;
    if (user && user.emailAddresses && user.emailAddresses.length > 0) {
        wsClients.set(ws, user.emailAddresses[0].emailAddress);
    } else {
        wsClients.set(ws, 'Unknown User');
    }
    console.log(`${wsClients.get(ws)} just connected`);

    ws.on('message', (data) => {
        console.log('Raw message received:', data);  

        try {
            const message = JSON.parse(data.toString());
            console.log('Timestamp:', new Date().toISOString());  
            // Handle device messages differently from data updates
            if (message.type === 'deviceMessage') 
            {
                // Create formatted message with email and timestamp
                const broadcastMessage = {
                    type: 'deviceMessage',
                    timestamp: new Date().toISOString(),
                    email: wsClients.get(ws) || 'Unknown User',
                    message: message.message
                };
                
                const broadcastString = JSON.stringify(broadcastMessage);
                
                wss.clients.forEach((client) => {
                    if (client.readyState === ws.OPEN) {
                        client.send(broadcastString);
                    }
                });
            }
            else 
            {
                // Handle regular data updates (broadcast to other clients only)
                wss.clients.forEach((client) => 
                {
                    if (client !== ws && client.readyState === ws.OPEN) 
                    {
                        client.send(data.toString());
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
                    email: email,
                    message: data.toString()
                };
                
                const broadcastString = JSON.stringify(broadcastMessage);
                
                // Send to ALL clients INCLUDING the sender
                wss.clients.forEach((client) => {
                    if (client.readyState === ws.OPEN) {
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
    });
});

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
