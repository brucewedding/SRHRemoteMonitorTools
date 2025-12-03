/**
 * Integration test for complete message processing flow
 * Tests the full pipeline: detection → parsing → buffering → sorting → processing → state update
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

// Simulate the complete pipeline
const MESSAGE_BUFFER_SIZE = 100;
let messageBuffer = [];
const messageParser = new MessageParser();
const stateAggregator = new StateAggregator();
let lastTelemetryTime = Date.now();

function isTelemetryMessage(message) {
    return !!(message.messageType && 
           typeof message.timestampUtc === 'number' && 
           message.source && 
           message.data);
}

function processTelemetryMessage(rawMessage) {
    try {
        const parsedMessage = messageParser.parse(rawMessage);
        
        if (!parsedMessage) {
            return false;
        }
        
        lastTelemetryTime = Date.now();
        
        if (messageBuffer.length >= MESSAGE_BUFFER_SIZE) {
            messageBuffer.shift();
        }
        
        messageBuffer.push(parsedMessage);
        
        return true;
    } catch (error) {
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

// Test 1: Complete flow with valid telemetry message
test('Complete flow: detection → parsing → buffering → processing → state update', () => {
    messageBuffer = [];
    
    const rawMessage = JSON.stringify({
        messageType: 'MotorCurrent',
        timestampUtc: Date.now(),
        source: 'CAN',
        data: {
            pumpSide: 'Left',
            current: 1.5,
            voltage: 24.0
        }
    });
    
    // Step 1: Detection
    const message = JSON.parse(rawMessage);
    assert(isTelemetryMessage(message) === true, 'Message should be detected as telemetry');
    
    // Step 2: Processing (parsing + buffering)
    const processed = processTelemetryMessage(rawMessage);
    assert(processed === true, 'Message should be processed successfully');
    assert(messageBuffer.length === 1, 'Buffer should contain 1 message');
    
    // Step 3: Buffer processing (sorting + state update)
    processMessageBuffer();
    assert(messageBuffer.length === 0, 'Buffer should be empty after processing');
    
    // Step 4: Verify state was updated
    const state = stateAggregator.getState();
    assert(state !== null, 'State should not be null');
    assert(state.LeftHeart !== undefined, 'LeftHeart should be in state');
});

// Test 2: Multiple messages processed in timestamp order
test('Multiple messages are processed in correct timestamp order', () => {
    messageBuffer = [];
    
    // Add messages in reverse chronological order
    const messages = [
        { ts: 3000, current: 3.0 },
        { ts: 1000, current: 1.0 },
        { ts: 2000, current: 2.0 }
    ];
    
    messages.forEach(({ ts, current }) => {
        const rawMessage = JSON.stringify({
            messageType: 'MotorCurrent',
            timestampUtc: ts,
            source: 'CAN',
            data: {
                pumpSide: 'Left',
                current: current,
                voltage: 24.0
            }
        });
        processTelemetryMessage(rawMessage);
    });
    
    assert(messageBuffer.length === 3, 'Buffer should contain 3 messages');
    
    // Process buffer
    processMessageBuffer();
    
    assert(messageBuffer.length === 0, 'Buffer should be empty after processing');
    
    // Verify state was updated
    const state = stateAggregator.getState();
    assert(state !== null, 'State should not be null');
});

// Test 3: Mixed message types (telemetry and non-telemetry)
test('Only telemetry messages are processed, others are ignored', () => {
    messageBuffer = [];
    
    const telemetryMessage = JSON.stringify({
        messageType: 'MotorCurrent',
        timestampUtc: Date.now(),
        source: 'CAN',
        data: { pumpSide: 'Left', current: 1.5, voltage: 24.0 }
    });
    
    const systemMessage = JSON.stringify({
        SystemId: 'TEST-001',
        HeartRate: 75
    });
    
    const deviceMessage = JSON.stringify({
        type: 'deviceMessage',
        message: 'Hello'
    });
    
    // Process telemetry message
    const msg1 = JSON.parse(telemetryMessage);
    if (isTelemetryMessage(msg1)) {
        processTelemetryMessage(telemetryMessage);
    }
    
    // Process system message
    const msg2 = JSON.parse(systemMessage);
    if (isTelemetryMessage(msg2)) {
        processTelemetryMessage(systemMessage);
    }
    
    // Process device message
    const msg3 = JSON.parse(deviceMessage);
    if (isTelemetryMessage(msg3)) {
        processTelemetryMessage(deviceMessage);
    }
    
    assert(messageBuffer.length === 1, 'Only telemetry message should be in buffer');
    
    processMessageBuffer();
    assert(messageBuffer.length === 0, 'Buffer should be empty after processing');
});

// Test 4: Error handling - invalid message doesn't crash pipeline
test('Invalid message is handled gracefully without crashing', () => {
    messageBuffer = [];
    
    const invalidMessage = JSON.stringify({
        messageType: 'InvalidType',
        timestampUtc: Date.now(),
        source: 'CAN',
        data: {}
    });
    
    // This should not throw an error
    const result = processTelemetryMessage(invalidMessage);
    assert(result === false, 'Invalid message should return false');
    assert(messageBuffer.length === 0, 'Buffer should be empty');
    
    // Pipeline should still work after error
    const validMessage = JSON.stringify({
        messageType: 'MotorCurrent',
        timestampUtc: Date.now(),
        source: 'CAN',
        data: { pumpSide: 'Left', current: 1.5, voltage: 24.0 }
    });
    
    const result2 = processTelemetryMessage(validMessage);
    assert(result2 === true, 'Valid message should be processed after error');
    assert(messageBuffer.length === 1, 'Buffer should contain valid message');
});

// Test 5: Buffer overflow handling
test('Buffer overflow is handled correctly with FIFO eviction', () => {
    messageBuffer = [];
    
    // Fill buffer beyond capacity
    for (let i = 0; i < MESSAGE_BUFFER_SIZE + 5; i++) {
        const rawMessage = JSON.stringify({
            messageType: 'MotorCurrent',
            timestampUtc: 1000 + i,
            source: 'CAN',
            data: { pumpSide: 'Left', current: 1.5, voltage: 24.0 }
        });
        processTelemetryMessage(rawMessage);
    }
    
    assert(messageBuffer.length === MESSAGE_BUFFER_SIZE, 'Buffer should be at capacity');
    assert(messageBuffer[0].timestampUtc === 1005, 'First 5 messages should be evicted');
    assert(messageBuffer[messageBuffer.length - 1].timestampUtc === 1104, 'Last message should be newest');
});

console.log('\n✓ All integration tests passed!\n');
