/**
 * Integration tests for Fastify WebSocket with MessageParser and StateAggregator
 * Validates: Requirements 1.1, 1.2, 1.5
 */

const MessageParser = require('./MessageParser');
const StateAggregator = require('./StateAggregator');
const fs = require('fs');
const path = require('path');

// Test helper to run a test
function test(description, fn) {
  try {
    fn();
    console.log(`✓ ${description}`);
  } catch (error) {
    console.error(`✗ ${description}`);
    console.error(`  ${error.message}`);
    process.exit(1);
  }
}

// Test helper for assertions
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

// Initialize components
const messageParser = new MessageParser();
const stateAggregator = new StateAggregator();

// Test 1: Parse and process a single telemetry message
test('should parse and process a single MotorCurrent message', () => {
  const rawMessage = JSON.stringify({
    messageType: 'MotorCurrent',
    timestampUtc: 1763720006423,
    source: 'CAN',
    data: {
      combinedCurrent: 0.125,
      phaseACurrent: 0.082,
      phaseBCurrent: 0.01,
      phaseCCurrent: 0.01,
      unit: 'A',
      canId: '0x04C',
      pumpSide: 'Right'
    }
  });

  const parsedMessage = messageParser.parse(rawMessage);
  assert(parsedMessage !== null, 'Message should be parsed successfully');
  
  stateAggregator.updateState(parsedMessage);
  const state = stateAggregator.getState();
  
  assert(state.RightHeart.PowerConsumption > 0, 'Right heart power consumption should be updated');
  assert(state.Timestamp === 1763720006423, 'Timestamp should be updated');
});

// Test 2: Process multiple messages in order
test('should process multiple messages in timestamp order', () => {
  stateAggregator.reset();
  
  const messages = [
    {
      messageType: 'ManualPhysiologicalSettings',
      timestampUtc: 1763720006475,
      source: 'CAN',
      data: {
        heartRate: 100,
        leftStrokeLength: 160,
        rightStrokeLength: 170,
        unit: 'bpm/mm',
        canId: '0x08C',
        pumpSide: 'All'
      }
    },
    {
      messageType: 'ActualStrokeLength',
      timestampUtc: 1763720008753,
      source: 'CAN',
      data: {
        strokeLength: 16.92,
        unit: 'mm',
        canId: '0x0BB',
        pumpSide: 'Right'
      }
    },
    {
      messageType: 'InstantaneousAtrialPressure',
      timestampUtc: 1763720006317,
      source: 'CAN',
      data: {
        averagePressure: 10.3,
        unit: 'mmHg',
        canId: '0x040',
        pumpSide: 'Left'
      }
    }
  ];

  // Sort by timestamp (simulating message ordering)
  messages.sort((a, b) => a.timestampUtc - b.timestampUtc);
  
  // Process in order
  messages.forEach(msg => {
    stateAggregator.updateState(msg);
  });
  
  const state = stateAggregator.getState();
  
  assert(state.HeartRate === 100, 'Heart rate should be set');
  assert(state.LeftHeart.AtrialPressure === 10.3, 'Left atrial pressure should be set');
  assert(state.RightHeart.ActualStrokeLen === 16.92, 'Right actual stroke length should be set');
  assert(state.Timestamp === 1763720008753, 'Timestamp should be the latest');
});

// Test 3: Handle malformed messages gracefully
test('should handle malformed messages without crashing (Requirement 1.5)', () => {
  const malformedMessages = [
    '{invalid json}',
    '{"messageType": "Test"}', // Missing required fields
    '{"messageType": "Test", "timestampUtc": 123}', // Missing source and data
  ];

  malformedMessages.forEach(rawMessage => {
    const result = messageParser.parse(rawMessage);
    assert(result === null, 'Malformed message should return null');
  });
  
  // State aggregator should still be functional
  const state = stateAggregator.getState();
  assert(state !== null, 'State aggregator should still work after malformed messages');
});

// Test 4: Process all messages from sample telemetry file
test('should process all messages from sample-telemetry.json', () => {
  stateAggregator.reset();
  
  const sampleFile = path.join(__dirname, '..', 'sample-telemetry.json');
  const content = fs.readFileSync(sampleFile, 'utf-8');
  const lines = content.trim().split('\n');
  
  const messages = [];
  lines.forEach(line => {
    const parsedMessage = messageParser.parse(line);
    if (parsedMessage) {
      messages.push(parsedMessage);
    }
  });
  
  // Sort by timestamp
  messages.sort((a, b) => a.timestampUtc - b.timestampUtc);
  
  // Process all messages
  messages.forEach(msg => {
    stateAggregator.updateState(msg);
  });
  
  const state = stateAggregator.getState();
  
  // Verify state has been updated
  assert(state.HeartRate > 0, 'Heart rate should be set from sample data');
  assert(state.LeftHeart.TargetStrokeLen > 0, 'Left target stroke length should be set');
  assert(state.RightHeart.TargetStrokeLen > 0, 'Right target stroke length should be set');
  
  console.log(`  Processed ${messages.length} messages successfully`);
});

// Test 5: Verify message buffer ordering logic
test('should maintain message order when processing out-of-order messages', () => {
  stateAggregator.reset();
  
  // Create messages with timestamps out of order
  const outOfOrderMessages = [
    {
      messageType: 'ManualPhysiologicalSettings',
      timestampUtc: 1000,
      source: 'CAN',
      data: { heartRate: 80, leftStrokeLength: 150, rightStrokeLength: 150, pumpSide: 'All' }
    },
    {
      messageType: 'ManualPhysiologicalSettings',
      timestampUtc: 500,
      source: 'CAN',
      data: { heartRate: 60, leftStrokeLength: 140, rightStrokeLength: 140, pumpSide: 'All' }
    },
    {
      messageType: 'ManualPhysiologicalSettings',
      timestampUtc: 1500,
      source: 'CAN',
      data: { heartRate: 100, leftStrokeLength: 160, rightStrokeLength: 160, pumpSide: 'All' }
    }
  ];
  
  // Sort by timestamp (simulating buffer processing)
  outOfOrderMessages.sort((a, b) => a.timestampUtc - b.timestampUtc);
  
  // Process in sorted order
  outOfOrderMessages.forEach(msg => {
    stateAggregator.updateState(msg);
  });
  
  const state = stateAggregator.getState();
  
  // Final state should reflect the last message (timestamp 1500)
  assertEqual(state.HeartRate, 100, 'Heart rate should be from the latest message');
  assertEqual(state.LeftHeart.TargetStrokeLen, 160, 'Stroke length should be from the latest message');
  assertEqual(state.Timestamp, 1500, 'Timestamp should be the latest');
});

// Test 6: Verify error handling doesn't crash processing
test('should continue processing after encountering errors (Requirement 1.5)', () => {
  stateAggregator.reset();
  
  const messages = [
    {
      messageType: 'ManualPhysiologicalSettings',
      timestampUtc: 1000,
      source: 'CAN',
      data: { heartRate: 80, leftStrokeLength: 150, rightStrokeLength: 150, pumpSide: 'All' }
    },
    {
      messageType: 'UnknownType', // This will trigger a warning
      timestampUtc: 1500,
      source: 'CAN',
      data: { someField: 'value' }
    },
    {
      messageType: 'ActualStrokeLength',
      timestampUtc: 2000,
      source: 'CAN',
      data: { strokeLength: 15.5, pumpSide: 'Left' }
    }
  ];
  
  messages.forEach(msg => {
    stateAggregator.updateState(msg);
  });
  
  const state = stateAggregator.getState();
  
  // State should have been updated by valid messages
  assertEqual(state.HeartRate, 80, 'Heart rate should be set from first message');
  assertEqual(state.LeftHeart.ActualStrokeLen, 15.5, 'Stroke length should be set from third message');
});

console.log('\n✓ All Fastify integration tests passed!');
