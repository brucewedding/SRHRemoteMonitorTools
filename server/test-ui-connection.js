/**
 * UI Connection Test
 * 
 * This script simulates a UI client connecting to the server
 * and verifies it can receive telemetry data.
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const SERVER_URL = 'ws://127.0.0.1:3000/ws';
const SAMPLE_DATA_PATH = path.join(__dirname, '..', 'sample-telemetry.json');
const SYSTEM_ID = 'TEST-SYSTEM-001';

/**
 * Load sample telemetry
 */
function loadSampleTelemetry() {
  const data = fs.readFileSync(SAMPLE_DATA_PATH, 'utf8');
  const lines = data.trim().split('\n');
  return lines.map(line => JSON.parse(line));
}

/**
 * Test UI connection
 */
async function testUIConnection() {
  console.log('=== UI Connection Test ===\n');
  
  let deviceWs, clientWs;
  let receivedStates = 0;
  let testPassed = false;
  
  try {
    // Step 1: Connect as a device
    console.log('Step 1: Connecting as device...');
    deviceWs = new WebSocket(`${SERVER_URL}?type=device&device-name=Test Device&SystemId=${SYSTEM_ID}`);
    
    await new Promise((resolve, reject) => {
      deviceWs.on('open', resolve);
      deviceWs.on('error', reject);
      setTimeout(() => reject(new Error('Device connection timeout')), 5000);
    });
    console.log('✓ Device connected\n');
    
    // Step 2: Connect as a UI client
    console.log('Step 2: Connecting as UI client...');
    clientWs = new WebSocket(`${SERVER_URL}?email=test@realheart.se&type=client&systemId=${SYSTEM_ID}`);
    
    await new Promise((resolve, reject) => {
      clientWs.on('open', resolve);
      clientWs.on('error', reject);
      setTimeout(() => reject(new Error('Client connection timeout')), 5000);
    });
    console.log('✓ UI client connected\n');
    
    // Step 3: Set up client message handler
    clientWs.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Count state updates
        if (message.SystemId !== undefined && message.HeartRate !== undefined) {
          receivedStates++;
          
          if (receivedStates === 1) {
            console.log('✓ First state update received');
            console.log(`  - Heart Rate: ${message.HeartRate} bpm`);
            console.log(`  - Left Cardiac Output: ${message.LeftHeart.CardiacOutput.toFixed(2)} L/min`);
            console.log(`  - Right Cardiac Output: ${message.RightHeart.CardiacOutput.toFixed(2)} L/min`);
            console.log(`  - Temperature: ${message.StatusData.Temperature.Text}`);
            console.log(`  - Voltage: ${message.StatusData.Voltage.Text}`);
            console.log(`  - CPU Load: ${message.StatusData.CPULoad.Text}`);
            console.log(`  - Accelerometer: ${message.StatusData.Accelerometer.Text}\n`);
          }
        }
      } catch (error) {
        // Ignore parse errors for non-state messages
      }
    });
    
    // Step 4: Send telemetry from device
    console.log('Step 3: Sending telemetry from device...');
    const messages = loadSampleTelemetry();
    
    for (const message of messages) {
      message.timestampUtc = Date.now();
      deviceWs.send(JSON.stringify(message));
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    console.log(`✓ Sent ${messages.length} telemetry messages\n`);
    
    // Step 5: Wait for state updates
    console.log('Step 4: Waiting for state updates...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (receivedStates > 0) {
      console.log(`✓ Received ${receivedStates} state updates\n`);
      testPassed = true;
    } else {
      console.log('✗ No state updates received\n');
    }
    
  } catch (error) {
    console.error('✗ Test failed:', error.message);
  } finally {
    // Clean up
    if (deviceWs) deviceWs.close();
    if (clientWs) clientWs.close();
    
    // Wait a bit for connections to close
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Print result
  console.log('=== Test Result ===');
  if (testPassed) {
    console.log('✓ PASSED - UI can connect and receive telemetry data');
    console.log('\nThe UI should be able to:');
    console.log('  1. Connect to the WebSocket server');
    console.log('  2. Receive aggregated state updates');
    console.log('  3. Display all telemetry metrics');
    console.log('  4. Update charts in real-time');
    console.log('\nNext: Start the frontend and verify the UI displays data correctly');
    process.exit(0);
  } else {
    console.log('✗ FAILED - UI did not receive telemetry data');
    console.log('\nTroubleshooting:');
    console.log('  1. Verify the server is running');
    console.log('  2. Check server logs for errors');
    console.log('  3. Verify WebSocket connections are established');
    process.exit(1);
  }
}

// Run the test
testUIConnection().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
