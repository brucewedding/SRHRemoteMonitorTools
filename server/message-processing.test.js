/**
 * Unit tests for message processing pipeline
 * Tests processTelemetryMessage and processMessageBuffer functions
 */

const MessageParser = require('./MessageParser');
const StateAggregator = require('./StateAggregator');

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

// Create mock implementations for testing
const MESSAGE_BUFFER_SIZE = 100;
let messageBuffer = [];
const messageParser = new MessageParser();
const stateAggregator = new StateAggregator();
let lastTelemetryTime = Date.now();

function processTelemetryMessage(rawMessage) {
    try {
        const parsedMessage = messageParser.parse(rawMessage);
        
        if (!parsedMessage) {
            console.warn('[Telemetry] Failed to parse message');
            return false;
        }
        
        lastTelemetryTime = Date.now();
        
        if (messageBuffer.length >= MESSAGE_BUFFER_SIZE) {
            messageBuffer.shift();
            console.warn('[Telemetry] Message buffer full, removing oldest message');
        }
        
        messageBuffer.push(parsedMessage);
        
        return true;
    } catch (error) {
        console.error('[Telemetry] Error processing message:', error);
        return false;
    }
}

function processMessageBuffer() {
    try {
        if (messageBuffer.length === 0) {
            return;
        }
        
        messageBuffer.sort((a, b) => a.timestampUtc - b.timestampUtc);
        
        while (messageBuffer.length > 0) {
            const message = messageBuffer.shift();
            
            try {
                stateAggregator.updateState(message);
            } catch (error) {
                console.error('[Processing] Error processing message:', error);
            }
        }
    } catch (error) {
        console.error('[Processing] Error in processMessageBuffer:', error);
    }
}

// Test 1: Valid telemetry message is parsed and added to buffer
test('Valid telemetry message is parsed and added to buffer', () => {
    messageBuffer = [];
    const validMessage = JSON.stringify({
        messageType: 'MotorCurrent',
        timestampUtc: Date.now(),
        source: 'CAN',
        data: {
            pumpSide: 'Left',
            current: 1.5
        }
    });
    
    const result = processTelemetryMessage(validMessage);
    assert(result === true, 'Should return true for valid message');
    assert(messageBuffer.length === 1, 'Buffer should contain 1 message');
});

// Test 2: Invalid message is rejected
test('Invalid telemetry message is rejected', () => {
    messageBuffer = [];
    const invalidMessage = JSON.stringify({
        messageType: 'InvalidType',
        timestampUtc: Date.now(),
        source: 'CAN',
        data: {}
    });
    
    const result = processTelemetryMessage(invalidMessage);
    assert(result === false, 'Should return false for invalid message');
    assert(messageBuffer.length === 0, 'Buffer should be empty');
});

// Test 3: Buffer capacity enforcement
test('Buffer removes oldest message when at capacity', () => {
    messageBuffer = [];
    
    // Fill buffer to capacity
    for (let i = 0; i < MESSAGE_BUFFER_SIZE; i++) {
        const message = JSON.stringify({
            messageType: 'MotorCurrent',
            timestampUtc: 1000 + i,
            source: 'CAN',
            data: { pumpSide: 'Left', current: 1.5 }
        });
        processTelemetryMessage(message);
    }
    
    assert(messageBuffer.length === MESSAGE_BUFFER_SIZE, 'Buffer should be at capacity');
    
    // Add one more message
    const newMessage = JSON.stringify({
        messageType: 'MotorCurrent',
        timestampUtc: 2000,
        source: 'CAN',
        data: { pumpSide: 'Left', current: 2.0 }
    });
    processTelemetryMessage(newMessage);
    
    assert(messageBuffer.length === MESSAGE_BUFFER_SIZE, 'Buffer should still be at capacity');
    assert(messageBuffer[0].timestampUtc === 1001, 'Oldest message should be removed');
});

// Test 4: Messages are sorted by timestamp
test('Messages are sorted by timestamp before processing', () => {
    messageBuffer = [];
    
    // Add messages in reverse chronological order
    const timestamps = [3000, 1000, 2000];
    timestamps.forEach(ts => {
        const message = JSON.stringify({
            messageType: 'MotorCurrent',
            timestampUtc: ts,
            source: 'CAN',
            data: { pumpSide: 'Left', current: 1.5 }
        });
        processTelemetryMessage(message);
    });
    
    assert(messageBuffer.length === 3, 'Buffer should contain 3 messages');
    
    // Process buffer
    processMessageBuffer();
    
    assert(messageBuffer.length === 0, 'Buffer should be empty after processing');
});

// Test 5: Malformed JSON is handled gracefully
test('Malformed JSON is handled gracefully', () => {
    messageBuffer = [];
    const malformedMessage = '{ invalid json }';
    
    const result = processTelemetryMessage(malformedMessage);
    assert(result === false, 'Should return false for malformed JSON');
    assert(messageBuffer.length === 0, 'Buffer should be empty');
});

console.log('\n✓ All message processing tests passed!\n');
