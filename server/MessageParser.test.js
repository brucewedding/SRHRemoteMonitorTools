/**
 * Unit tests for MessageParser
 */
const MessageParser = require('./MessageParser');
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

function assertNotNull(value, message) {
  if (value === null || value === undefined) {
    throw new Error(message || 'Expected non-null value');
  }
}

// Create parser instance
const parser = new MessageParser();

// Test 1: Parse valid MotorCurrent message
test('should parse valid MotorCurrent message', () => {
  const rawMessage = '{"messageType":"MotorCurrent","timestampUtc":1763720006423,"source":"CAN","data":{"combinedCurrent":0.125,"phaseACurrent":0.082,"phaseBCurrent":0.01,"phaseCCurrent":0.01,"unit":"A","canId":"0x04C","pumpSide":"Right"}}';
  const result = parser.parse(rawMessage);
  
  assertNotNull(result, 'Parse result should not be null');
  assertEqual(result.messageType, 'MotorCurrent', 'messageType should be MotorCurrent');
  assertEqual(result.timestampUtc, 1763720006423, 'timestampUtc should match');
  assertEqual(result.source, 'CAN', 'source should be CAN');
  assertNotNull(result.data, 'data should not be null');
  assertEqual(result.data.combinedCurrent, 0.125, 'combinedCurrent should match');
});

// Test 2: Parse valid Accelerometer message
test('should parse valid Accelerometer message', () => {
  const rawMessage = '{"messageType":"Accelerometer","timestampUtc":1763720006375,"source":"CAN","data":{"xAxis":0.229,"yAxis":0.128,"zAxis":1.374,"unit":"g","canId":"0x058","pumpSide":"Left"}}';
  const result = parser.parse(rawMessage);
  
  assertNotNull(result, 'Parse result should not be null');
  assertEqual(result.messageType, 'Accelerometer', 'messageType should be Accelerometer');
  assertEqual(result.source, 'CAN', 'source should be CAN');
});

// Test 3: Parse valid UDP StrokewisePressure message
test('should parse valid UDP StrokewisePressure message', () => {
  const rawMessage = '{"messageType":"StrokewisePressure","timestampUtc":1763720009068,"source":"UDP","data":{"leftAtrial":null,"rightAtrial":null,"leftVentricular":null,"rightVentricular":null,"aortic":null,"pulmonaryArterial":{"average":-2572.003952055066,"max":2.2250738585072014e-308,"min":-2572.3710656166077,"unit":"mmHg"},"dataType":"Strokewise"}}';
  const result = parser.parse(rawMessage);
  
  assertNotNull(result, 'Parse result should not be null');
  assertEqual(result.messageType, 'StrokewisePressure', 'messageType should be StrokewisePressure');
  assertEqual(result.source, 'UDP', 'source should be UDP');
});

// Test 4: Handle malformed JSON
test('should return null for malformed JSON', () => {
  const rawMessage = '{invalid json}';
  const result = parser.parse(rawMessage);
  
  assertEqual(result, null, 'Parse result should be null for malformed JSON');
});

// Test 5: Handle missing messageType
test('should return null for missing messageType', () => {
  const rawMessage = '{"timestampUtc":1763720006423,"source":"CAN","data":{}}';
  const result = parser.parse(rawMessage);
  
  assertEqual(result, null, 'Parse result should be null for missing messageType');
});

// Test 6: Handle missing timestampUtc
test('should return null for missing timestampUtc', () => {
  const rawMessage = '{"messageType":"MotorCurrent","source":"CAN","data":{}}';
  const result = parser.parse(rawMessage);
  
  assertEqual(result, null, 'Parse result should be null for missing timestampUtc');
});

// Test 7: Handle missing source
test('should return null for missing source', () => {
  const rawMessage = '{"messageType":"MotorCurrent","timestampUtc":1763720006423,"data":{}}';
  const result = parser.parse(rawMessage);
  
  assertEqual(result, null, 'Parse result should be null for missing source');
});

// Test 8: Handle missing data
test('should return null for missing data', () => {
  const rawMessage = '{"messageType":"MotorCurrent","timestampUtc":1763720006423,"source":"CAN"}';
  const result = parser.parse(rawMessage);
  
  assertEqual(result, null, 'Parse result should be null for missing data');
});

// Test 9: Handle invalid source value
test('should return null for invalid source value', () => {
  const rawMessage = '{"messageType":"MotorCurrent","timestampUtc":1763720006423,"source":"INVALID","data":{}}';
  const result = parser.parse(rawMessage);
  
  assertEqual(result, null, 'Parse result should be null for invalid source');
});

// Test 10: Handle unsupported message type
test('should return null for unsupported message type', () => {
  const rawMessage = '{"messageType":"UnsupportedType","timestampUtc":1763720006423,"source":"CAN","data":{}}';
  const result = parser.parse(rawMessage);
  
  assertEqual(result, null, 'Parse result should be null for unsupported message type');
});

// Test 11: Parse all messages from sample-telemetry.json
test('should parse all messages from sample-telemetry.json', () => {
  const samplePath = path.join(__dirname, '..', 'sample-telemetry.json');
  const sampleData = fs.readFileSync(samplePath, 'utf8');
  const lines = sampleData.trim().split('\n');
  
  let successCount = 0;
  let failCount = 0;
  
  lines.forEach((line, index) => {
    const result = parser.parse(line);
    if (result) {
      successCount++;
    } else {
      failCount++;
      console.warn(`  Line ${index + 1} failed to parse`);
    }
  });
  
  console.log(`  Parsed ${successCount}/${lines.length} messages successfully`);
  assert(successCount === lines.length, `All messages should parse successfully, but ${failCount} failed`);
});

// Test 12: Validate method returns true for valid message
test('should validate valid message object', () => {
  const message = {
    messageType: 'MotorCurrent',
    timestampUtc: 1763720006423,
    source: 'CAN',
    data: { combinedCurrent: 0.125 }
  };
  
  const result = parser.validate(message);
  assertEqual(result, true, 'Validation should return true for valid message');
});

// Test 13: Validate method returns false for invalid message
test('should invalidate message with missing fields', () => {
  const message = {
    messageType: 'MotorCurrent',
    source: 'CAN'
    // missing timestampUtc and data
  };
  
  const result = parser.validate(message);
  assertEqual(result, false, 'Validation should return false for invalid message');
});

console.log('\n✓ All MessageParser tests passed!');
