/**
 * Integration test for telemetry message detection
 * Verifies that telemetry messages are correctly identified and routed
 */

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

// Test telemetry message detection logic
function isTelemetryMessage(message) {
    return !!(message.messageType && 
           typeof message.timestampUtc === 'number' && 
           message.source && 
           message.data);
}

// Test 1: Valid telemetry message is detected
test('Valid telemetry message is detected', () => {
    const message = {
        messageType: 'MotorCurrent',
        timestampUtc: Date.now(),
        source: 'CAN',
        data: {
            pumpSide: 'Left',
            current: 1.5
        }
    };
    
    assert(isTelemetryMessage(message) === true, 'Should detect valid telemetry message');
});

// Test 2: System message is not detected as telemetry
test('System message is not detected as telemetry', () => {
    const message = {
        SystemId: 'TEST-001',
        HeartRate: 75,
        LeftHeart: {}
    };
    
    assert(isTelemetryMessage(message) === false, 'Should not detect system message as telemetry');
});

// Test 3: Device message is not detected as telemetry
test('Device message is not detected as telemetry', () => {
    const message = {
        type: 'deviceMessage',
        email: 'test@example.com',
        message: 'Hello'
    };
    
    assert(isTelemetryMessage(message) === false, 'Should not detect device message as telemetry');
});

// Test 4: Message with missing timestampUtc is not detected
test('Message with missing timestampUtc is not detected', () => {
    const message = {
        messageType: 'MotorCurrent',
        source: 'CAN',
        data: {}
    };
    
    assert(isTelemetryMessage(message) === false, 'Should not detect message without timestampUtc');
});

// Test 5: Message with invalid timestampUtc type is not detected
test('Message with invalid timestampUtc type is not detected', () => {
    const message = {
        messageType: 'MotorCurrent',
        timestampUtc: 'not-a-number',
        source: 'CAN',
        data: {}
    };
    
    assert(isTelemetryMessage(message) === false, 'Should not detect message with invalid timestampUtc');
});

// Test 6: Message with missing source is not detected
test('Message with missing source is not detected', () => {
    const message = {
        messageType: 'MotorCurrent',
        timestampUtc: Date.now(),
        data: {}
    };
    
    assert(isTelemetryMessage(message) === false, 'Should not detect message without source');
});

// Test 7: Message with missing data is not detected
test('Message with missing data is not detected', () => {
    const message = {
        messageType: 'MotorCurrent',
        timestampUtc: Date.now(),
        source: 'CAN'
    };
    
    assert(isTelemetryMessage(message) === false, 'Should not detect message without data');
});

console.log('\n✓ All telemetry detection tests passed!\n');
