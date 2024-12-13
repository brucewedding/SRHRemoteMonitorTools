const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());
app.use(cookieParser());

// Secret key for HMAC - this should match the key in the C# program
const secretKey = 'SRHMonitorSecretKey2024';

// Main admin credentials
const adminUsername = 'admin';
const hashedPassword = 'a9698e619ff9ba20a5e9c8005bc247d85cc60b7e38c4d9bee21baa254ac101b3';

// File to store one-time password hashes
const passwordsFile = path.join(__dirname, 'passwords.hash');

// Function to create HMAC hash
function createHash(password) {
    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(password);
    return hmac.digest('hex');
}

// Function to read passwords from file
function readOneTimePasswords() {
    try {
        if (fs.existsSync(passwordsFile)) {
            const content = fs.readFileSync(passwordsFile, 'utf8');
            return content.split('\n').filter(line => line.trim());
        }
    } catch (err) {
        console.error('Error reading passwords file:', err);
    }
    return [];
}

// Function to write passwords to file
function writeOneTimePasswords(passwords) {
    try {
        fs.writeFileSync(passwordsFile, passwords.join('\n'));
    } catch (err) {
        console.error('Error writing passwords file:', err);
    }
}

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const passwordHash = createHash(password);
    
    // Check main admin credentials
    if (username === adminUsername && passwordHash === hashedPassword) {
        // Set auth cookie with both username and password
        res.cookie('auth', JSON.stringify({ username, password }), { httpOnly: true });
        return res.sendStatus(200);
    }
    
    // Check one-time passwords (these will use the provided username)
    const oneTimePasswords = readOneTimePasswords();
    const oneTimeIndex = oneTimePasswords.findIndex(hash => hash === passwordHash);
    
    if (oneTimeIndex !== -1) {
        // Remove the used one-time password
        oneTimePasswords.splice(oneTimeIndex, 1);
        writeOneTimePasswords(oneTimePasswords);
        
        // Set auth cookie with both username and password
        res.cookie('auth', JSON.stringify({ username, password }), { httpOnly: true });
        return res.sendStatus(200);
    }
    
    // No valid credentials found
    res.sendStatus(401);
});

app.use((req, res, next) => {
    // Allow access to login page and login endpoint
    if (req.path === '/login' || req.path === '/login.html') {
        return next();
    }
    
    const auth = req.cookies.auth;
    if (!auth) {
        return res.redirect('/login.html');
    }
    
    try {
        const { username, password } = JSON.parse(auth);
        const authHash = createHash(password);
        
        // Check main admin credentials
        if (username === adminUsername && authHash === hashedPassword) {
            return next();
        }
        
        // Check one-time passwords
        const oneTimePasswords = readOneTimePasswords();
        if (oneTimePasswords.some(hash => hash === authHash)) {
            return next();
        }
    } catch (err) {
        console.error('Auth cookie parsing error:', err);
    }
    
    // No valid credentials found
    res.redirect('/login.html');
});

// Serve static files from dist directory first (production build)
app.use(express.static('dist'));
// Then fallback to public directory for any files not in dist
app.use(express.static('public'));

// Store WebSocket to username mapping
const wsClients = new Map();

// WebSocket connection handling
wss.on('connection', (ws, req) => {
    console.log('New client connected');

    // Extract username from cookie
    const cookies = req.headers.cookie;
    if (cookies) {
        const authCookie = cookies.split(';').find(c => c.trim().startsWith('auth='));
        if (authCookie) {
            try {
                const authData = JSON.parse(decodeURIComponent(authCookie.split('=')[1]));
                wsClients.set(ws, authData.username);
            } catch (err) {
                console.error('Error parsing auth cookie:', err);
            }
        }
    }

    ws.on('message', (data) => {
        console.log('Raw message received:', data);  // Add this line

        try {
            const message = JSON.parse(data.toString());
            console.log('Just Received:', message);  // Use comma instead of +
            console.log('Username:', wsClients.get(ws) || 'Unknown User');  // Use comma instead of +
            console.log('Timestamp:', new Date().toISOString());  // Use comma instead of +
            // Handle device messages differently from data updates
            if (message.type === 'deviceMessage') {
                // Create formatted message with username and timestamp
                const broadcastMessage = {
                    type: 'deviceMessage',
                    timestamp: new Date().toISOString(),
                    username: wsClients.get(ws) || 'Unknown User',
                    message: message.message
                };
                
                const broadcastString = JSON.stringify(broadcastMessage);
                
                // Send to ALL clients INCLUDING the sender
                wss.clients.forEach((client) => {
                    if (client.readyState === ws.OPEN) {
                        client.send(broadcastString);
                    }
                });
            } else {
                // Handle regular data updates (broadcast to other clients only)
                wss.clients.forEach((client) => {
                    if (client !== ws && client.readyState === ws.OPEN) {
                        client.send(data.toString());
                    }
                });
            }
        } catch (error) {
            console.error('Error processing message:', error);
            // Don't forward raw messages on parse error
            // Instead, try to handle it as a device message if possible
            try {
                const username = wsClients.get(ws) || 'Unknown User';
                const broadcastMessage = {
                    type: 'deviceMessage',
                    timestamp: new Date().toISOString(),
                    username: username,
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
