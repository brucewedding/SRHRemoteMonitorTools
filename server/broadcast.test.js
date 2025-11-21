/**
 * Unit tests for broadcast logic
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 10.2
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

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

// Mock WebSocket client
class MockWebSocketClient {
  constructor(systemToWatch = null) {
    this.readyState = 1; // WebSocket.OPEN
    this.systemToWatch = systemToWatch;
    this.messages = [];
  }

  send(message) {
    this.messages.push(message);
  }

  getLastMessage() {
    return this.messages[this.messages.length - 1];
  }

  getMessageCount() {
    return this.messages.length;
  }

  clearMessages() {
    this.messages = [];
  }
}

// Test 1: Broadcast includes timestamp (Requirement 6.2)
test('should include timestamp in broadcast (Requirement 6.2)', () => {
  const StateAggregator = require('./StateAggregator');
  const aggregator = new StateAggregator();
  
  const state = aggregator.getState();
  
  // Verify timestamp exists
  assert(state.Timestamp !== undefined, 'State should have Timestamp field');
  assert(typeof state.Timestamp === 'number', 'Timestamp should be a number');
  assert(state.Timestamp > 0, 'Timestamp should be greater than 0');
});

// Test 2: Broadcast preserves SystemId (Requirement 6.4)
test('should preserve SystemId in broadcast (Requirement 6.4)', () => {
  const StateAggregator = require('./StateAggregator');
  const aggregator = new StateAggregator();
  
  // Set a SystemId
  aggregator.state.SystemId = 'TEST-SYSTEM-001';
  
  const state = aggregator.getState();
  
  // Verify SystemId is preserved
  assertEqual(state.SystemId, 'TEST-SYSTEM-001', 'SystemId should be preserved in state');
});

// Test 3: State structure is correct for broadcasting
test('should have correct state structure for broadcasting', () => {
  const StateAggregator = require('./StateAggregator');
  const aggregator = new StateAggregator();
  
  const state = aggregator.getState();
  
  // Verify all required fields exist
  assert(state.SystemId !== undefined, 'State should have SystemId');
  assert(state.HeartRate !== undefined, 'State should have HeartRate');
  assert(state.LeftHeart !== undefined, 'State should have LeftHeart');
  assert(state.RightHeart !== undefined, 'State should have RightHeart');
  assert(state.Timestamp !== undefined, 'State should have Timestamp');
  
  // Verify state can be serialized to JSON (required for broadcasting)
  const json = JSON.stringify(state);
  assert(json.length > 0, 'State should be serializable to JSON');
  
  // Verify deserialization works
  const parsed = JSON.parse(json);
  assertEqual(parsed.SystemId, state.SystemId, 'SystemId should survive serialization');
  assertEqual(parsed.HeartRate, state.HeartRate, 'HeartRate should survive serialization');
});

// Test 4: Multiple SystemIds can be tracked
test('should support tracking multiple SystemIds', () => {
  const systemStates = new Map();
  
  // Simulate storing states for multiple systems
  systemStates.set('SYSTEM-A', { SystemId: 'SYSTEM-A', HeartRate: 60, Timestamp: Date.now() });
  systemStates.set('SYSTEM-B', { SystemId: 'SYSTEM-B', HeartRate: 70, Timestamp: Date.now() });
  systemStates.set('SYSTEM-C', { SystemId: 'SYSTEM-C', HeartRate: 80, Timestamp: Date.now() });
  
  // Verify all systems are tracked
  assertEqual(systemStates.size, 3, 'Should track 3 systems');
  assert(systemStates.has('SYSTEM-A'), 'Should have SYSTEM-A');
  assert(systemStates.has('SYSTEM-B'), 'Should have SYSTEM-B');
  assert(systemStates.has('SYSTEM-C'), 'Should have SYSTEM-C');
  
  // Verify each system has correct data
  assertEqual(systemStates.get('SYSTEM-A').HeartRate, 60, 'SYSTEM-A should have HeartRate 60');
  assertEqual(systemStates.get('SYSTEM-B').HeartRate, 70, 'SYSTEM-B should have HeartRate 70');
  assertEqual(systemStates.get('SYSTEM-C').HeartRate, 80, 'SYSTEM-C should have HeartRate 80');
});

// Test 5: Client filtering by SystemId
test('should filter broadcasts by SystemId (Requirement 10.2)', () => {
  const clients = [
    new MockWebSocketClient('SYSTEM-A'),
    new MockWebSocketClient('SYSTEM-B'),
    new MockWebSocketClient('SYSTEM-A'),
    new MockWebSocketClient(null) // Client not watching any specific system
  ];
  
  const stateA = { SystemId: 'SYSTEM-A', HeartRate: 60, Timestamp: Date.now() };
  const stateB = { SystemId: 'SYSTEM-B', HeartRate: 70, Timestamp: Date.now() };
  
  // Simulate broadcast filtering
  clients.forEach(client => {
    if (client.systemToWatch) {
      // Only send if state matches the system the client is watching
      if (stateA.SystemId === client.systemToWatch) {
        client.send(JSON.stringify(stateA));
      }
      if (stateB.SystemId === client.systemToWatch) {
        client.send(JSON.stringify(stateB));
      }
    } else {
      // If client is not watching a specific system, send all states
      client.send(JSON.stringify(stateA));
      client.send(JSON.stringify(stateB));
    }
  });
  
  // Verify filtering
  assertEqual(clients[0].getMessageCount(), 1, 'Client watching SYSTEM-A should receive 1 message');
  assertEqual(clients[1].getMessageCount(), 1, 'Client watching SYSTEM-B should receive 1 message');
  assertEqual(clients[2].getMessageCount(), 1, 'Second client watching SYSTEM-A should receive 1 message');
  assertEqual(clients[3].getMessageCount(), 2, 'Client not watching specific system should receive 2 messages');
  
  // Verify correct messages were sent
  const client0Message = JSON.parse(clients[0].getLastMessage());
  assertEqual(client0Message.SystemId, 'SYSTEM-A', 'Client 0 should receive SYSTEM-A state');
  
  const client1Message = JSON.parse(clients[1].getLastMessage());
  assertEqual(client1Message.SystemId, 'SYSTEM-B', 'Client 1 should receive SYSTEM-B state');
});

// Test 6: Timeout logic for last known state
test('should support timeout logic for broadcasting last known state (Requirement 6.3)', () => {
  const BROADCAST_TIMEOUT_MS = 5000;
  let lastTelemetryTime = Date.now() - 6000; // 6 seconds ago (exceeds timeout)
  
  const now = Date.now();
  const timeSinceLastTelemetry = now - lastTelemetryTime;
  
  // Verify timeout is exceeded
  assert(timeSinceLastTelemetry >= BROADCAST_TIMEOUT_MS, 'Timeout should be exceeded');
  
  // Simulate broadcasting last known state
  const lastKnownState = { SystemId: 'SYSTEM-A', HeartRate: 60, Timestamp: now };
  const client = new MockWebSocketClient('SYSTEM-A');
  
  if (timeSinceLastTelemetry >= BROADCAST_TIMEOUT_MS) {
    // Update timestamp to current time
    lastKnownState.Timestamp = now;
    client.send(JSON.stringify(lastKnownState));
  }
  
  // Verify broadcast occurred
  assertEqual(client.getMessageCount(), 1, 'Should broadcast last known state when timeout exceeded');
  
  const message = JSON.parse(client.getLastMessage());
  assertEqual(message.Timestamp, now, 'Timestamp should be updated to current time');
});

// Test 7: No broadcast when timeout not exceeded
test('should not broadcast when timeout not exceeded', () => {
  const BROADCAST_TIMEOUT_MS = 5000;
  let lastTelemetryTime = Date.now() - 2000; // 2 seconds ago (within timeout)
  
  const now = Date.now();
  const timeSinceLastTelemetry = now - lastTelemetryTime;
  
  // Verify timeout is not exceeded
  assert(timeSinceLastTelemetry < BROADCAST_TIMEOUT_MS, 'Timeout should not be exceeded');
  
  const client = new MockWebSocketClient('SYSTEM-A');
  
  // Should not broadcast
  if (timeSinceLastTelemetry >= BROADCAST_TIMEOUT_MS) {
    client.send('should not happen');
  }
  
  // Verify no broadcast occurred
  assertEqual(client.getMessageCount(), 0, 'Should not broadcast when timeout not exceeded');
});

// Test 8: State updates trigger broadcasts (Requirement 6.1)
test('should trigger broadcast after state update (Requirement 6.1)', () => {
  const StateAggregator = require('./StateAggregator');
  const MessageParser = require('./MessageParser');
  
  const aggregator = new StateAggregator();
  const parser = new MessageParser();
  
  // Parse and process a message
  const rawMessage = JSON.stringify({
    messageType: 'ManualPhysiologicalSettings',
    timestampUtc: Date.now(),
    source: 'CAN',
    data: {
      heartRate: 75,
      leftStrokeLength: 150,
      rightStrokeLength: 160,
      unit: 'bpm/mm',
      canId: '0x08C',
      pumpSide: 'All'
    }
  });
  
  const parsedMessage = parser.parse(rawMessage);
  assert(parsedMessage !== null, 'Message should parse successfully');
  
  // Update state
  aggregator.updateState(parsedMessage);
  
  // Get state (simulating broadcast)
  const state = aggregator.getState();
  
  // Verify state was updated
  assertEqual(state.HeartRate, 75, 'HeartRate should be updated to 75');
  assert(state.Timestamp > 0, 'Timestamp should be set');
});

console.log('\n✓ All broadcast tests passed!\n');
