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

// Main admin password hash (HMAC of 'admin123')
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
    const password = req.body.password;
    const passwordHash = createHash(password);
    
    // Check main password
    if (passwordHash === hashedPassword) {
        res.cookie('auth', password, { httpOnly: true });
        return res.sendStatus(200);
    }
    
    // Check one-time passwords
    const oneTimePasswords = readOneTimePasswords();
    const oneTimeIndex = oneTimePasswords.findIndex(hash => hash === passwordHash);
    
    if (oneTimeIndex !== -1) {
        // Remove the used one-time password
        oneTimePasswords.splice(oneTimeIndex, 1);
        writeOneTimePasswords(oneTimePasswords);
        
        // Set auth cookie
        res.cookie('auth', password, { httpOnly: true });
        return res.sendStatus(200);
    }
    
    // No valid password found
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
    
    const authHash = createHash(auth);
    
    // Check main password
    if (authHash === hashedPassword) {
        return next();
    }
    
    // Check one-time passwords
    const oneTimePasswords = readOneTimePasswords();
    if (oneTimePasswords.some(hash => hash === authHash)) {
        return next();
    }
    
    // No valid password found
    res.redirect('/login.html');
});

app.use(express.static('public'));

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('New client connected');

    ws.on('message', (data) => {
        console.log('Received:', data.toString());
        
        // Broadcast to all connected clients
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === ws.OPEN) {
                client.send(data.toString());
            }
        });
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
