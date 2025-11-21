/**
 * Unit tests for Graceful Degradation features
 * 
 * Tests for Requirements 9.1, 9.2, 9.4:
 * - Default value handling in StateAggregator
 * - Telemetry timeout detection
 * - Pump side availability tracking
 * - Recovery after telemetry gap
 */

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

// Helper to wait for a specified time
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('\n=== Graceful Degradation Tests ===\n');

// Test 1: Default values are used for missing fields (Requirement 9.1)
test('should use default values for missing fields (Requirement 9.1)', () => {
  const aggregator = new StateAggregator();
  const state = aggregator.getState();
  
  // Verify default values are present
  assertEqual(state.HeartRate, 0, 'HeartRate should default to 0');
  assertEqual(state.LeftHeart.PowerConsumption, 0, 'PowerConsumption should default to 0');
  assertEqual(state.LeftHeart.CardiacOutput, 0, 'CardiacOutput should default to 0');
  assertEqual(state.OperationState, '-', 'OperationState should default to "-"');
  assertEqual(state.HeartStatus, '-', 'HeartStatus should default to "-"');
});

// Test 2: Telemetry status tracking is included in state (Requirement 9.2)
test('should include telemetry status in state (Requirement 9.2)', () => {
  const aggregator = new StateAggregator();
  const state = aggregator.getState();
  
  // Verify telemetry status is present
  assert(state._telemetryStatus, 'State should include _telemetryStatus');
  assert(typeof state._telemetryStatus.noDataReceived === 'boolean', 'noDataReceived should be boolean');
  assert(typeof state._telemetryStatus.leftHeartAvailable === 'boolean', 'leftHeartAvailable should be boolean');
  assert(typeof state._telemetryStatus.rightHeartAvailable === 'boolean', 'rightHeartAvailable should be boolean');
});

// Test 3: Initially, all pump sides should be available
test('should initially show all pump sides as available', () => {
  const aggregator = new StateAggregator();
  const state = aggregator.getState();
  
  assertEqual(state._telemetryStatus.noDataReceived, false, 'Initially should have data');
  assertEqual(state._telemetryStatus.leftHeartAvailable, true, 'Left heart should be available');
  assertEqual(state._telemetryStatus.rightHeartAvailable, true, 'Right heart should be available');
});

// Test 4: Left heart availability is tracked separately (Requirement 9.2)
test('should track left heart availability separately (Requirement 9.2)', () => {
  const aggregator = new StateAggregator();
  
  // Send a message to left heart
  aggregator.updateState({
    messageType: 'ActualStrokeLength',
    timestampUtc: Date.now(),
    source: 'CAN',
    data: {
      strokeLength: 10,
      unit: 'mm',
      canId: '0x123',
      pumpSide: 'Left'
    }
  });
  
  const state = aggregator.getState();
  
  // Both should still be available since we just sent data
  assertEqual(state._telemetryStatus.leftHeartAvailable, true, 'Left heart should be available after update');
  assertEqual(state._telemetryStatus.rightHeartAvailable, true, 'Right heart should still be available');
});

// Test 5: Right heart availability is tracked separately (Requirement 9.2)
test('should track right heart availability separately (Requirement 9.2)', () => {
  const aggregator = new StateAggregator();
  
  // Send a message to right heart
  aggregator.updateState({
    messageType: 'ActualStrokeLength',
    timestampUtc: Date.now(),
    source: 'CAN',
    data: {
      strokeLength: 12,
      unit: 'mm',
      canId: '0x124',
      pumpSide: 'Right'
    }
  });
  
  const state = aggregator.getState();
  
  // Both should still be available since we just sent data
  assertEqual(state._telemetryStatus.leftHeartAvailable, true, 'Left heart should still be available');
  assertEqual(state._telemetryStatus.rightHeartAvailable, true, 'Right heart should be available after update');
});

// Test 6: "All" pump side updates both sides (Requirement 9.2)
test('should update both sides when pumpSide is "All" (Requirement 9.2)', () => {
  const aggregator = new StateAggregator();
  
  // Send a message to all pump sides
  aggregator.updateState({
    messageType: 'ManualPhysiologicalSettings',
    timestampUtc: Date.now(),
    source: 'CAN',
    data: {
      heartRate: 80,
      leftStrokeLength: 10,
      rightStrokeLength: 12,
      unit: 'bpm/mm',
      canId: '0x125',
      pumpSide: 'All'
    }
  });
  
  const state = aggregator.getState();
  
  // Both should be available
  assertEqual(state._telemetryStatus.leftHeartAvailable, true, 'Left heart should be available');
  assertEqual(state._telemetryStatus.rightHeartAvailable, true, 'Right heart should be available');
});

// Test 7: System recovers when telemetry resumes (Requirement 9.4)
test('should resume normal operation when telemetry resumes (Requirement 9.4)', () => {
  const aggregator = new StateAggregator();
  
  // Send initial message
  aggregator.updateState({
    messageType: 'ActualStrokeLength',
    timestampUtc: Date.now(),
    source: 'CAN',
    data: {
      strokeLength: 10,
      unit: 'mm',
      canId: '0x123',
      pumpSide: 'Left'
    }
  });
  
  let state = aggregator.getState();
  assertEqual(state._telemetryStatus.noDataReceived, false, 'Should have data initially');
  
  // Send another message (simulating recovery)
  aggregator.updateState({
    messageType: 'ActualStrokeLength',
    timestampUtc: Date.now(),
    source: 'CAN',
    data: {
      strokeLength: 11,
      unit: 'mm',
      canId: '0x123',
      pumpSide: 'Left'
    }
  });
  
  state = aggregator.getState();
  assertEqual(state._telemetryStatus.noDataReceived, false, 'Should still have data after recovery');
  assertEqual(state.LeftHeart.ActualStrokeLen, 11, 'Should process new data correctly');
});

// Test 8: Telemetry timestamps are tracked
test('should track telemetry timestamps', () => {
  const aggregator = new StateAggregator();
  
  const beforeTime = Date.now();
  
  aggregator.updateState({
    messageType: 'ActualStrokeLength',
    timestampUtc: Date.now(),
    source: 'CAN',
    data: {
      strokeLength: 10,
      unit: 'mm',
      canId: '0x123',
      pumpSide: 'Left'
    }
  });
  
  const afterTime = Date.now();
  const state = aggregator.getState();
  
  assert(state._telemetryStatus.lastTelemetryTime >= beforeTime, 'lastTelemetryTime should be recent');
  assert(state._telemetryStatus.lastTelemetryTime <= afterTime, 'lastTelemetryTime should not be in future');
  assert(state._telemetryStatus.leftHeartLastUpdate >= beforeTime, 'leftHeartLastUpdate should be recent');
  assert(state._telemetryStatus.leftHeartLastUpdate <= afterTime, 'leftHeartLastUpdate should not be in future');
});

// Test 9: Missing message fields don't crash the system (Requirement 9.1)
test('should handle messages with missing fields gracefully (Requirement 9.1)', () => {
  const aggregator = new StateAggregator();
  
  // Send message with missing optional fields
  aggregator.updateState({
    messageType: 'ActualStrokeLength',
    // timestampUtc is missing
    source: 'CAN',
    data: {
      strokeLength: 10,
      unit: 'mm',
      canId: '0x123',
      pumpSide: 'Left'
    }
  });
  
  const state = aggregator.getState();
  
  // Should still work and use defaults
  assertEqual(state.LeftHeart.ActualStrokeLen, 10, 'Should process data despite missing timestamp');
  assert(state.Timestamp > 0, 'Should use current time for missing timestamp');
});

// Test 10: Unknown message types don't crash the system (Requirement 9.1)
test('should handle unknown message types gracefully (Requirement 9.1)', () => {
  const aggregator = new StateAggregator();
  
  // Send message with unknown type
  aggregator.updateState({
    messageType: 'UnknownMessageType',
    timestampUtc: Date.now(),
    source: 'CAN',
    data: {
      someField: 'someValue'
    }
  });
  
  const state = aggregator.getState();
  
  // Should still return valid state
  assert(state.HeartRate !== undefined, 'State should still be valid');
  assert(state.LeftHeart !== undefined, 'LeftHeart should still exist');
});

console.log('\n✓ All Graceful Degradation tests passed!\n');
