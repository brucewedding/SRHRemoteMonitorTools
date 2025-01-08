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

// WebSocket connection handling
wss.on('connection', (ws, req) => {
    // Get email from URL parameters
    const url = new URL(req.url, `http://${req.headers.host}`);
    const email = url.searchParams.get('email');
    const displayName = formatDisplayName(email);
    console.log(`${displayName} just connected`);

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
            
            // Handle device messages differently from data updates
            if (message.type === 'deviceMessage') 
            {
                // Format the display name from the email
                const displayName = formatDisplayName(message.email);
                console.log('\n[Chat Message Processing]');
                console.log('Email:', message.email);
                console.log('Formatted name:', displayName);
                
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
                        
                        console.log('\n[Broadcasting Message]');
                        console.log('To client:', client === ws ? 'sender' : 'other');
                        console.log('Message:', JSON.stringify(broadcastMessage, null, 2));
                        
                        client.send(JSON.stringify(broadcastMessage));
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
