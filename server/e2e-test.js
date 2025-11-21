/**
 * End-to-End Test for Telemetry Conversion
 * 
 * This test:
 * 1. Starts the Fastify server
 * 2. Connects as a WebSocket client
 * 3. Sends sample telemetry messages
 * 4. Verifies the aggregated state is correct
 * 5. Checks all requirements are met
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Test configuration
const SERVER_URL = 'ws://127.0.0.1:3000/ws';
const SAMPLE_DATA_PATH = path.join(__dirname, '..', 'sample-telemetry.json');
const TEST_TIMEOUT = 30000; // 30 seconds

// Test results tracking
const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

/**
 * Add test result
 */
function addResult(category, message) {
  testResults[category].push(message);
  const prefix = category === 'passed' ? '✓' : category === 'failed' ? '✗' : '⚠';
  console.log(`${prefix} ${message}`);
}

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
 * Wait for a condition with timeout
 */
function waitFor(condition, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      if (condition()) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - startTime > timeout) {
        clearInterval(interval);
        reject(new Error('Timeout waiting for condition'));
      }
    }, 100);
  });
}

/**
 * Main test function
 */
async function runE2ETest() {
  console.log('\n=== Starting End-to-End Telemetry Test ===\n');
  
  let ws;
  let receivedStates = [];
  let lastState = null;
  
  try {
    // Connect to WebSocket server
    console.log('Connecting to WebSocket server...');
    ws = new WebSocket(SERVER_URL + '?email=test@realheart.se&type=client');
    
    await new Promise((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
    
    addResult('passed', 'Connected to WebSocket server');
    
    // Set up message handler
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Filter out non-state messages
        if (message.SystemId !== undefined && message.HeartRate !== undefined) {
          receivedStates.push(message);
          lastState = message;
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });
    
    // Load and send sample telemetry
    console.log('\nLoading sample telemetry...');
    const telemetryMessages = loadSampleTelemetry();
    addResult('passed', `Loaded ${telemetryMessages.length} telemetry messages`);
    
    console.log('\nSending telemetry messages...');
    for (const message of telemetryMessages) {
      ws.send(JSON.stringify(message));
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay between messages
    }
    
    addResult('passed', 'Sent all telemetry messages');
    
    // Wait for state updates
    console.log('\nWaiting for state updates...');
    await waitFor(() => receivedStates.length > 0, 5000);
    addResult('passed', `Received ${receivedStates.length} state updates`);
    
    // Wait a bit more to ensure all messages are processed
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (!lastState) {
      addResult('failed', 'No state received from server');
      return;
    }
    
    console.log('\n=== Verifying Aggregated State ===\n');
    
    // Requirement 3.1: Check LeftHeart and RightHeart structure
    if (lastState.LeftHeart && lastState.RightHeart) {
      const leftHeart = lastState.LeftHeart;
      const rightHeart = lastState.RightHeart;
      
      const requiredFields = ['PowerConsumption', 'AtrialPressure', 'CardiacOutput', 'TargetStrokeLen', 'ActualStrokeLen'];
      const leftHasFields = requiredFields.every(field => field in leftHeart);
      const rightHasFields = requiredFields.every(field => field in rightHeart);
      
      if (leftHasFields && rightHasFields) {
        addResult('passed', 'Requirement 3.1: LeftHeart and RightHeart have required fields');
      } else {
        addResult('failed', 'Requirement 3.1: Missing required heart fields');
      }
    } else {
      addResult('failed', 'Requirement 3.1: Missing LeftHeart or RightHeart objects');
    }
    
    // Requirement 3.2: Check HeartRate is numeric
    if (typeof lastState.HeartRate === 'number') {
      addResult('passed', `Requirement 3.2: HeartRate is numeric (${lastState.HeartRate} bpm)`);
    } else {
      addResult('failed', 'Requirement 3.2: HeartRate is not numeric');
    }
    
    // Requirement 3.3: Check sensor objects
    const sensors = ['CVPSensor', 'PAPSensor', 'AoPSensor', 'ArtPressSensor'];
    const sensorsValid = sensors.every(sensor => {
      return lastState[sensor] && 
             'PrimaryValue' in lastState[sensor] && 
             'unit' in lastState[sensor];
    });
    
    if (sensorsValid) {
      addResult('passed', 'Requirement 3.3: Sensor objects have PrimaryValue and unit fields');
    } else {
      addResult('failed', 'Requirement 3.3: Sensor objects missing required fields');
    }
    
    // Requirement 3.4: Check SystemId
    if (lastState.SystemId !== undefined) {
      addResult('passed', 'Requirement 3.4: SystemId field present');
    } else {
      addResult('failed', 'Requirement 3.4: SystemId field missing');
    }
    
    // Requirement 3.5: Check StatusData
    if (lastState.StatusData && 
        lastState.StatusData.Temperature && 
        lastState.StatusData.Voltage && 
        lastState.StatusData.CPULoad) {
      addResult('passed', 'Requirement 3.5: StatusData has system health indicators');
    } else {
      addResult('failed', 'Requirement 3.5: StatusData missing health indicators');
    }
    
    // Requirement 6.2: Check timestamp in broadcast
    if (lastState.Timestamp && typeof lastState.Timestamp === 'number') {
      addResult('passed', 'Requirement 6.2: Broadcasts include timestamp');
    } else {
      addResult('failed', 'Requirement 6.2: Timestamp missing or invalid');
    }
    
    // Check specific data from sample telemetry
    console.log('\n=== Verifying Specific Data Values ===\n');
    
    // Heart rate should be 100 from ManualPhysiologicalSettings
    if (lastState.HeartRate === 100) {
      addResult('passed', 'Heart rate correctly set to 100 bpm');
    } else {
      addResult('warnings', `Heart rate is ${lastState.HeartRate}, expected 100`);
    }
    
    // Stroke lengths should be set
    if (lastState.LeftHeart.TargetStrokeLen === 160) {
      addResult('passed', 'Left heart target stroke length correctly set to 160 mm');
    } else {
      addResult('warnings', `Left stroke length is ${lastState.LeftHeart.TargetStrokeLen}, expected 160`);
    }
    
    if (lastState.RightHeart.TargetStrokeLen === 170) {
      addResult('passed', 'Right heart target stroke length correctly set to 170 mm');
    } else {
      addResult('warnings', `Right stroke length is ${lastState.RightHeart.TargetStrokeLen}, expected 170`);
    }
    
    // Actual stroke length for right heart
    if (lastState.RightHeart.ActualStrokeLen === 16.92) {
      addResult('passed', 'Right heart actual stroke length correctly set to 16.92 mm');
    } else {
      addResult('warnings', `Right actual stroke length is ${lastState.RightHeart.ActualStrokeLen}, expected 16.92`);
    }
    
    // Cardiac output should be calculated
    if (lastState.LeftHeart.CardiacOutput > 0) {
      addResult('passed', `Left heart cardiac output calculated: ${lastState.LeftHeart.CardiacOutput.toFixed(2)} L/min`);
    } else {
      addResult('warnings', 'Left heart cardiac output is 0');
    }
    
    if (lastState.RightHeart.CardiacOutput > 0) {
      addResult('passed', `Right heart cardiac output calculated: ${lastState.RightHeart.CardiacOutput.toFixed(2)} L/min`);
    } else {
      addResult('warnings', 'Right heart cardiac output is 0');
    }
    
    // Temperature data
    if (lastState.StatusData.Temperature.Text !== '-') {
      addResult('passed', `Temperature data present: ${lastState.StatusData.Temperature.Text}`);
    } else {
      addResult('warnings', 'Temperature data not set');
    }
    
    // Voltage data
    if (lastState.StatusData.Voltage.Text !== '-') {
      addResult('passed', `Voltage data present: ${lastState.StatusData.Voltage.Text}`);
    } else {
      addResult('warnings', 'Voltage data not set');
    }
    
    // CPU load
    if (lastState.StatusData.CPULoad.Text !== '-') {
      addResult('passed', `CPU load data present: ${lastState.StatusData.CPULoad.Text}`);
    } else {
      addResult('warnings', 'CPU load data not set');
    }
    
    // Accelerometer
    if (lastState.StatusData.Accelerometer.Text !== '-') {
      addResult('passed', `Accelerometer data present: ${lastState.StatusData.Accelerometer.Text}`);
    } else {
      addResult('warnings', 'Accelerometer data not set');
    }
    
    // Atrial pressure
    if (lastState.LeftHeart.AtrialPressure > 0) {
      addResult('passed', `Left atrial pressure: ${lastState.LeftHeart.AtrialPressure} mmHg`);
    } else {
      addResult('warnings', 'Left atrial pressure not set');
    }
    
    if (lastState.RightHeart.AtrialPressure > 0) {
      addResult('passed', `Right atrial pressure: ${lastState.RightHeart.AtrialPressure} mmHg`);
    } else {
      addResult('warnings', 'Right atrial pressure not set');
    }
    
    // Print final state for inspection
    console.log('\n=== Final Aggregated State ===\n');
    console.log(JSON.stringify(lastState, null, 2));
    
  } catch (error) {
    addResult('failed', `Test error: ${error.message}`);
    console.error(error);
  } finally {
    if (ws) {
      ws.close();
    }
  }
  
  // Print summary
  console.log('\n=== Test Summary ===\n');
  console.log(`Passed: ${testResults.passed.length}`);
  console.log(`Failed: ${testResults.failed.length}`);
  console.log(`Warnings: ${testResults.warnings.length}`);
  
  if (testResults.failed.length > 0) {
    console.log('\nFailed tests:');
    testResults.failed.forEach(msg => console.log(`  - ${msg}`));
  }
  
  if (testResults.warnings.length > 0) {
    console.log('\nWarnings:');
    testResults.warnings.forEach(msg => console.log(`  - ${msg}`));
  }
  
  // Exit with appropriate code
  process.exit(testResults.failed.length > 0 ? 1 : 0);
}

// Run the test
runE2ETest().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
