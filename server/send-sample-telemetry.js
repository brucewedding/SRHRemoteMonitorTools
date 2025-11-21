/**
 * Send Sample Telemetry Script
 * 
 * This script continuously sends sample telemetry messages to the server
 * for manual UI testing and verification.
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Configuration
const SERVER_URL = 'ws://127.0.0.1:3000/ws';
const SAMPLE_DATA_PATH = path.join(__dirname, '..', 'sample-telemetry.json');
const SYSTEM_ID = 'TEST-SYSTEM-001';
const LOOP_INTERVAL = 5000; // Send all messages every 5 seconds
const MESSAGE_DELAY = 50; // Delay between individual messages (ms)

/**
 * Load sample telemetry messages
 */
function loadSampleTelemetry() {
  try {
    const data = fs.readFileSync(SAMPLE_DATA_PATH, 'utf8');
    const lines = data.trim().split('\n');
    return lines.map(line => JSON.parse(line));
  } catch (error) {
    console.error('Failed to load sample telemetry:', error);
    process.exit(1);
  }
}

/**
 * Send telemetry messages in a loop
 */
async function sendTelemetryLoop(ws, messages) {
  console.log(`\nSending ${messages.length} telemetry messages...`);
  
  for (const message of messages) {
    // Update timestamp to current time
    message.timestampUtc = Date.now();
    
    // Send the message
    ws.send(JSON.stringify(message));
    
    // Small delay between messages
    await new Promise(resolve => setTimeout(resolve, MESSAGE_DELAY));
  }
  
  console.log('✓ All messages sent');
}

/**
 * Main function
 */
async function main() {
  console.log('=== Sample Telemetry Sender ===\n');
  console.log(`Server: ${SERVER_URL}`);
  console.log(`System ID: ${SYSTEM_ID}`);
  console.log(`Loop Interval: ${LOOP_INTERVAL}ms`);
  console.log(`Message Delay: ${MESSAGE_DELAY}ms\n`);
  
  // Load sample telemetry
  const messages = loadSampleTelemetry();
  console.log(`Loaded ${messages.length} telemetry messages\n`);
  
  // Connect as a device
  console.log('Connecting to server as device...');
  const ws = new WebSocket(`${SERVER_URL}?type=device&device-name=Test Device&SystemId=${SYSTEM_ID}`);
  
  ws.on('open', () => {
    console.log('✓ Connected to server\n');
    console.log('Press Ctrl+C to stop\n');
    
    // Send messages immediately
    sendTelemetryLoop(ws, messages);
    
    // Then send in a loop
    setInterval(() => {
      sendTelemetryLoop(ws, messages);
    }, LOOP_INTERVAL);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    process.exit(1);
  });
  
  ws.on('close', () => {
    console.log('\nConnection closed');
    process.exit(0);
  });
  
  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n\nStopping...');
    ws.close();
  });
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
