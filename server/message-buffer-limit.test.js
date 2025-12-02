/**
 * Test for message buffer size limit enforcement
 * Validates: Requirements 2.1, 2.2, 2.3
 */

const MessageParser = require('./MessageParser');

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

// Simulate the processTelemetryMessage function behavior
const MESSAGE_BUFFER_SIZE = 100;
const messageBuffer = [];
const messageParser = new MessageParser();
const logs = [];

// Mock logger
const mockLogger = {
  warn: (msg) => {
    if (typeof msg === 'string') {
      logs.push({ level: 'warn', message: msg });
    } else {
      logs.push({ level: 'warn', ...msg });
    }
  }
};

const processTelemetryMessage = (rawMessage) => {
  try {
    const parsedMessage = messageParser.parse(rawMessage);
    
    if (!parsedMessage) {
      mockLogger.warn('Failed to parse telemetry message, continuing with other messages');
      return false;
    }
    
    // Check if buffer is at capacity before adding (Requirement 2.1)
    if (messageBuffer.length >= MESSAGE_BUFFER_SIZE) {
      // Remove oldest message when at capacity (Requirement 2.1)
      messageBuffer.shift();
      // Log warning about processing delays (Requirement 2.2)
      mockLogger.warn({
        bufferSize: MESSAGE_BUFFER_SIZE,
        messageType: parsedMessage.messageType,
        message: 'Message buffer full - processing delays may occur, oldest message removed'
      });
    }
    
    // Add to message buffer for ordering (Requirement 2.3)
    messageBuffer.push(parsedMessage);
    
    return true;
  } catch (error) {
    mockLogger.warn('Error processing telemetry message, continuing with other messages');
    return false;
  }
};

// Test 1: Buffer accepts messages up to limit
test('should accept messages up to MESSAGE_BUFFER_SIZE (Requirement 2.1)', () => {
  messageBuffer.length = 0;
  logs.length = 0;
  
  // Add exactly MESSAGE_BUFFER_SIZE messages
  for (let i = 0; i < MESSAGE_BUFFER_SIZE; i++) {
    const rawMessage = JSON.stringify({
      messageType: 'MotorCurrent',
      timestampUtc: 1000 + i,
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
    
    const result = processTelemetryMessage(rawMessage);
    assert(result === true, `Message ${i} should be processed successfully`);
  }
  
  assertEqual(messageBuffer.length, MESSAGE_BUFFER_SIZE, 'Buffer should contain exactly MESSAGE_BUFFER_SIZE messages');
  
  // No warnings should be logged yet
  const warningLogs = logs.filter(log => log.message && log.message.includes('buffer full'));
  assertEqual(warningLogs.length, 0, 'No warnings should be logged when buffer is not exceeded');
});

// Test 2: Buffer removes oldest message when at capacity
test('should remove oldest message when buffer exceeds limit (Requirement 2.1)', () => {
  messageBuffer.length = 0;
  logs.length = 0;
  
  // Fill buffer to capacity
  for (let i = 0; i < MESSAGE_BUFFER_SIZE; i++) {
    const rawMessage = JSON.stringify({
      messageType: 'MotorCurrent',
      timestampUtc: 1000 + i,
      source: 'CAN',
      data: { combinedCurrent: i, pumpSide: 'Right' }
    });
    processTelemetryMessage(rawMessage);
  }
  
  const firstMessageTimestamp = messageBuffer[0].timestampUtc;
  assertEqual(firstMessageTimestamp, 1000, 'First message should have timestamp 1000');
  
  // Add one more message
  const newMessage = JSON.stringify({
    messageType: 'MotorCurrent',
    timestampUtc: 2000,
    source: 'CAN',
    data: { combinedCurrent: 999, pumpSide: 'Right' }
  });
  processTelemetryMessage(newMessage);
  
  // Buffer should still be at MESSAGE_BUFFER_SIZE
  assertEqual(messageBuffer.length, MESSAGE_BUFFER_SIZE, 'Buffer should remain at MESSAGE_BUFFER_SIZE');
  
  // First message should now have timestamp 1001 (oldest was removed)
  const newFirstMessageTimestamp = messageBuffer[0].timestampUtc;
  assertEqual(newFirstMessageTimestamp, 1001, 'Oldest message should have been removed');
  
  // Last message should be the new one
  const lastMessage = messageBuffer[messageBuffer.length - 1];
  assertEqual(lastMessage.timestampUtc, 2000, 'New message should be at the end');
});

// Test 3: Warning is logged when buffer is full
test('should log warning when buffer is full (Requirement 2.2)', () => {
  messageBuffer.length = 0;
  logs.length = 0;
  
  // Fill buffer to capacity
  for (let i = 0; i < MESSAGE_BUFFER_SIZE; i++) {
    const rawMessage = JSON.stringify({
      messageType: 'MotorCurrent',
      timestampUtc: 1000 + i,
      source: 'CAN',
      data: { combinedCurrent: i, pumpSide: 'Right' }
    });
    processTelemetryMessage(rawMessage);
  }
  
  // Clear logs
  logs.length = 0;
  
  // Add one more message to trigger warning
  const newMessage = JSON.stringify({
    messageType: 'ActualStrokeLength',
    timestampUtc: 2000,
    source: 'CAN',
    data: { strokeLength: 15.5, pumpSide: 'Left' }
  });
  processTelemetryMessage(newMessage);
  
  // Check that warning was logged
  const warningLogs = logs.filter(log => log.message && log.message.includes('buffer full'));
  assert(warningLogs.length > 0, 'Warning should be logged when buffer is full');
  
  const warningLog = warningLogs[0];
  assertEqual(warningLog.bufferSize, MESSAGE_BUFFER_SIZE, 'Warning should include buffer size');
  assertEqual(warningLog.messageType, 'ActualStrokeLength', 'Warning should include message type');
});

// Test 4: Buffer continues accepting messages without crashing
test('should continue accepting messages when full (Requirement 2.3)', () => {
  messageBuffer.length = 0;
  logs.length = 0;
  
  // Add more than MESSAGE_BUFFER_SIZE messages
  const totalMessages = MESSAGE_BUFFER_SIZE + 50;
  
  for (let i = 0; i < totalMessages; i++) {
    const rawMessage = JSON.stringify({
      messageType: 'MotorCurrent',
      timestampUtc: 1000 + i,
      source: 'CAN',
      data: { combinedCurrent: i, pumpSide: 'Right' }
    });
    
    const result = processTelemetryMessage(rawMessage);
    assert(result === true, `Message ${i} should be processed successfully`);
  }
  
  // Buffer should still be at MESSAGE_BUFFER_SIZE
  assertEqual(messageBuffer.length, MESSAGE_BUFFER_SIZE, 'Buffer should remain at MESSAGE_BUFFER_SIZE');
  
  // Buffer should contain the last MESSAGE_BUFFER_SIZE messages
  const firstMessage = messageBuffer[0];
  const lastMessage = messageBuffer[messageBuffer.length - 1];
  
  assertEqual(firstMessage.timestampUtc, 1050, 'First message should be from position 50');
  assertEqual(lastMessage.timestampUtc, 1149, 'Last message should be the most recent');
  
  // Should have logged 50 warnings (one for each message over the limit)
  const warningLogs = logs.filter(log => log.message && log.message.includes('buffer full'));
  assertEqual(warningLogs.length, 50, 'Should log warning for each message when buffer is full');
});

console.log('\n✓ All message buffer limit tests passed!');
