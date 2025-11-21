/**
 * Unit tests for StateAggregator
 * 
 * Tests for the StateAggregator class that maintains aggregated state
 * from individual telemetry messages.
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

function assertNotNull(value, message) {
  if (value === null || value === undefined) {
    throw new Error(message || 'Expected non-null value');
  }
}

function assertHasProperty(obj, prop, message) {
  if (!obj.hasOwnProperty(prop)) {
    throw new Error(message || `Expected object to have property ${prop}`);
  }
}

function assertType(value, type, message) {
  if (typeof value !== type) {
    throw new Error(message || `Expected type ${type}, got ${typeof value}`);
  }
}

// Test 1: Create aggregator with initial state
test('should create aggregator with initial state', () => {
  const aggregator = new StateAggregator();
  const state = aggregator.getState();
  
  assertNotNull(state, 'State should not be null');
  assertEqual(state.SystemId, '', 'SystemId should be empty string');
  assertEqual(state.HeartRate, 0, 'HeartRate should be 0');
  assert(state.Timestamp > 0, 'Timestamp should be greater than 0');
});

// Test 2: LeftHeart and RightHeart objects (Requirement 3.1)
test('should have LeftHeart and RightHeart objects with required fields (Requirement 3.1)', () => {
  const aggregator = new StateAggregator();
  const state = aggregator.getState();
  
  assertNotNull(state.LeftHeart, 'LeftHeart should not be null');
  assertNotNull(state.RightHeart, 'RightHeart should not be null');
  
  // Verify required fields for LeftHeart
  assertHasProperty(state.LeftHeart, 'PowerConsumption', 'LeftHeart should have PowerConsumption');
  assertHasProperty(state.LeftHeart, 'AtrialPressure', 'LeftHeart should have AtrialPressure');
  assertHasProperty(state.LeftHeart, 'CardiacOutput', 'LeftHeart should have CardiacOutput');
  assertHasProperty(state.LeftHeart, 'TargetStrokeLen', 'LeftHeart should have TargetStrokeLen');
  assertHasProperty(state.LeftHeart, 'ActualStrokeLen', 'LeftHeart should have ActualStrokeLen');
  
  // Verify required fields for RightHeart
  assertHasProperty(state.RightHeart, 'PowerConsumption', 'RightHeart should have PowerConsumption');
  assertHasProperty(state.RightHeart, 'AtrialPressure', 'RightHeart should have AtrialPressure');
  assertHasProperty(state.RightHeart, 'CardiacOutput', 'RightHeart should have CardiacOutput');
  assertHasProperty(state.RightHeart, 'TargetStrokeLen', 'RightHeart should have TargetStrokeLen');
  assertHasProperty(state.RightHeart, 'ActualStrokeLen', 'RightHeart should have ActualStrokeLen');
});

// Test 3: HeartRate as top-level numeric field (Requirement 3.2)
test('should have HeartRate as top-level numeric field (Requirement 3.2)', () => {
  const aggregator = new StateAggregator();
  const state = aggregator.getState();
  
  assertHasProperty(state, 'HeartRate', 'State should have HeartRate property');
  assertType(state.HeartRate, 'number', 'HeartRate should be a number');
});

// Test 4: Sensor objects with PrimaryValue and unit (Requirement 3.3)
test('should have sensor objects with PrimaryValue and unit (Requirement 3.3)', () => {
  const aggregator = new StateAggregator();
  const state = aggregator.getState();
  
  const sensors = ['CVPSensor', 'PAPSensor', 'AoPSensor', 'ArtPressSensor', 'IvcPressSensor'];
  
  sensors.forEach(sensorName => {
    assertNotNull(state[sensorName], `${sensorName} should not be null`);
    assertHasProperty(state[sensorName], 'PrimaryValue', `${sensorName} should have PrimaryValue`);
    assertHasProperty(state[sensorName], 'unit', `${sensorName} should have unit`);
    assertHasProperty(state[sensorName], 'Name', `${sensorName} should have Name`);
  });
});

// Test 5: SystemId field (Requirement 3.4)
test('should have SystemId field (Requirement 3.4)', () => {
  const aggregator = new StateAggregator();
  const state = aggregator.getState();
  
  assertHasProperty(state, 'SystemId', 'State should have SystemId property');
  assertType(state.SystemId, 'string', 'SystemId should be a string');
});

// Test 6: StatusData with system health indicators (Requirement 3.5)
test('should have StatusData with system health indicators (Requirement 3.5)', () => {
  const aggregator = new StateAggregator();
  const state = aggregator.getState();
  
  assertHasProperty(state, 'StatusData', 'State should have StatusData');
  assertHasProperty(state.StatusData, 'Temperature', 'StatusData should have Temperature');
  assertHasProperty(state.StatusData, 'Voltage', 'StatusData should have Voltage');
  assertHasProperty(state.StatusData, 'CPULoad', 'StatusData should have CPULoad');
  assertHasProperty(state.StatusData, 'Accelerometer', 'StatusData should have Accelerometer');
  
  // Verify structure of health indicators
  assertHasProperty(state.StatusData.Temperature, 'Text', 'Temperature should have Text');
  assertHasProperty(state.StatusData.Temperature, 'Color', 'Temperature should have Color');
  assertHasProperty(state.StatusData.Voltage, 'Text', 'Voltage should have Text');
  assertHasProperty(state.StatusData.Voltage, 'Color', 'Voltage should have Color');
});

// Test 7: getState() returns current aggregated state
test('should return current aggregated state', () => {
  const aggregator = new StateAggregator();
  const state = aggregator.getState();
  
  assertNotNull(state, 'State should not be null');
  assertHasProperty(state, 'SystemId', 'State should have SystemId');
  assertHasProperty(state, 'HeartRate', 'State should have HeartRate');
  assertHasProperty(state, 'LeftHeart', 'State should have LeftHeart');
  assertHasProperty(state, 'RightHeart', 'State should have RightHeart');
});

// Test 8: getState() returns a copy (not reference)
test('should return a copy of state (not reference)', () => {
  const aggregator = new StateAggregator();
  const state1 = aggregator.getState();
  const state2 = aggregator.getState();
  
  // Modify state1
  state1.HeartRate = 100;
  
  // state2 should not be affected
  assertEqual(state2.HeartRate, 0, 'state2.HeartRate should still be 0');
});

// Test 9: reset() resets state to defaults
test('should reset state to defaults', () => {
  const aggregator = new StateAggregator();
  
  // Modify state
  aggregator.state.HeartRate = 100;
  aggregator.state.SystemId = 'TEST-123';
  
  // Reset
  aggregator.reset();
  
  // Verify reset
  const resetState = aggregator.getState();
  assertEqual(resetState.HeartRate, 0, 'HeartRate should be reset to 0');
  assertEqual(resetState.SystemId, '', 'SystemId should be reset to empty string');
});

// Test 10: reset() resets all heart data fields
test('should reset all heart data fields', () => {
  const aggregator = new StateAggregator();
  
  // Modify heart data
  aggregator.state.LeftHeart.PowerConsumption = 50;
  aggregator.state.RightHeart.CardiacOutput = 5.5;
  
  // Reset
  aggregator.reset();
  
  // Verify reset
  const state = aggregator.getState();
  assertEqual(state.LeftHeart.PowerConsumption, 0, 'LeftHeart.PowerConsumption should be reset to 0');
  assertEqual(state.RightHeart.CardiacOutput, 0, 'RightHeart.CardiacOutput should be reset to 0');
});

// Test 11: reset() resets all sensor data
test('should reset all sensor data', () => {
  const aggregator = new StateAggregator();
  
  // Modify sensor data
  aggregator.state.CVPSensor.PrimaryValue = 10;
  aggregator.state.PAPSensor.PrimaryValue = 20;
  
  // Reset
  aggregator.reset();
  
  // Verify reset
  const state = aggregator.getState();
  assertEqual(state.CVPSensor.PrimaryValue, 0, 'CVPSensor.PrimaryValue should be reset to 0');
  assertEqual(state.PAPSensor.PrimaryValue, 0, 'PAPSensor.PrimaryValue should be reset to 0');
});

// Test 12: updateState() updates timestamp
test('should update timestamp when message is processed', () => {
  const aggregator = new StateAggregator();
  const oldTimestamp = aggregator.state.Timestamp;
  
  const futureTimestamp = Date.now() + 1000;
  
  aggregator.updateState({
    messageType: 'Test',
    timestampUtc: futureTimestamp,
    source: 'CAN',
    data: {}
  });
  
  assertEqual(aggregator.state.Timestamp, futureTimestamp, 'Timestamp should be updated');
  assert(aggregator.state.Timestamp !== oldTimestamp, 'Timestamp should be different from old timestamp');
});

// Test 13: updateState() uses current time if timestampUtc is missing
test('should use current time if timestampUtc is missing', () => {
  const aggregator = new StateAggregator();
  const beforeTime = Date.now();
  
  aggregator.updateState({
    messageType: 'Test',
    source: 'CAN',
    data: {}
  });
  
  const afterTime = Date.now();
  
  assert(aggregator.state.Timestamp >= beforeTime, 'Timestamp should be >= beforeTime');
  assert(aggregator.state.Timestamp <= afterTime, 'Timestamp should be <= afterTime');
});

// Test 14: Maintain consistent structure after multiple operations
test('should maintain consistent structure after multiple operations', () => {
  const aggregator = new StateAggregator();
  
  // Perform multiple operations
  aggregator.reset();
  aggregator.updateState({ timestampUtc: 1000, data: {} });
  const state1 = aggregator.getState();
  aggregator.reset();
  const state2 = aggregator.getState();
  
  // Verify structure is consistent
  const keys1 = Object.keys(state1).sort();
  const keys2 = Object.keys(state2).sort();
  assertEqual(keys1.length, keys2.length, 'State should have same number of keys');
  
  for (let i = 0; i < keys1.length; i++) {
    assertEqual(keys1[i], keys2[i], `Key at index ${i} should match`);
  }
});

// Test 15: Have all required top-level fields
test('should have all required top-level fields', () => {
  const aggregator = new StateAggregator();
  const state = aggregator.getState();
  
  const requiredFields = [
    'SystemId',
    'HeartRate',
    'LeftHeart',
    'RightHeart',
    'CVPSensor',
    'PAPSensor',
    'AoPSensor',
    'ArtPressSensor',
    'IvcPressSensor',
    'StatusData',
    'OperationState',
    'HeartStatus',
    'Timestamp'
  ];
  
  requiredFields.forEach(field => {
    assertHasProperty(state, field, `State should have ${field} property`);
  });
});

// Test 16: Pump side routing - Left
test('should route messages with pumpSide="Left" to LeftHeart (Requirement 1.4)', () => {
  const aggregator = new StateAggregator();
  
  const message = {
    messageType: 'InstantaneousAtrialPressure',
    timestampUtc: 1234567890,
    source: 'CAN',
    data: {
      averagePressure: 10.5,
      pumpSide: 'Left'
    }
  };
  
  aggregator.updateState(message);
  
  assertEqual(aggregator.state.LeftHeart.AtrialPressure, 10.5, 'Left heart should be updated');
  assertEqual(aggregator.state.RightHeart.AtrialPressure, 0, 'Right heart should not be updated');
});

// Test 17: Pump side routing - Right
test('should route messages with pumpSide="Right" to RightHeart (Requirement 1.4)', () => {
  const aggregator = new StateAggregator();
  
  const message = {
    messageType: 'InstantaneousAtrialPressure',
    timestampUtc: 1234567890,
    source: 'CAN',
    data: {
      averagePressure: 8.2,
      pumpSide: 'Right'
    }
  };
  
  aggregator.updateState(message);
  
  assertEqual(aggregator.state.LeftHeart.AtrialPressure, 0, 'Left heart should not be updated');
  assertEqual(aggregator.state.RightHeart.AtrialPressure, 8.2, 'Right heart should be updated');
});

// Test 18: Pump side routing - All (applies to both sides)
test('should route messages with pumpSide="All" to both LeftHeart and RightHeart (Requirement 1.4)', () => {
  const aggregator = new StateAggregator();
  
  const message = {
    messageType: 'InstantaneousAtrialPressure',
    timestampUtc: 1234567890,
    source: 'CAN',
    data: {
      averagePressure: 12.0,
      pumpSide: 'All'
    }
  };
  
  aggregator.updateState(message);
  
  assertEqual(aggregator.state.LeftHeart.AtrialPressure, 12.0, 'Left heart should be updated');
  assertEqual(aggregator.state.RightHeart.AtrialPressure, 12.0, 'Right heart should be updated');
});

// Test 19: Pump side routing - All with ActualStrokeLength
test('should route ActualStrokeLength with pumpSide="All" to both sides (Requirement 1.4)', () => {
  const aggregator = new StateAggregator();
  
  const message = {
    messageType: 'ActualStrokeLength',
    timestampUtc: 1234567890,
    source: 'CAN',
    data: {
      strokeLength: 25.5,
      pumpSide: 'All'
    }
  };
  
  aggregator.updateState(message);
  
  assertEqual(aggregator.state.LeftHeart.ActualStrokeLen, 25.5, 'Left heart actual stroke length should be updated');
  assertEqual(aggregator.state.RightHeart.ActualStrokeLen, 25.5, 'Right heart actual stroke length should be updated');
});

// Test 20: Pump side routing - All with StrokewiseAtrialPressure
test('should route StrokewiseAtrialPressure with pumpSide="All" to both sides (Requirement 1.4)', () => {
  const aggregator = new StateAggregator();
  
  const message = {
    messageType: 'StrokewiseAtrialPressure',
    timestampUtc: 1234567890,
    source: 'CAN',
    data: {
      averagePressure: 15.0,
      minPressure: 10.0,
      maxPressure: 20.0,
      pumpSide: 'All'
    }
  };
  
  aggregator.updateState(message);
  
  // Check left heart
  assertEqual(aggregator.state.LeftHeart.IntPressure, 15.0, 'Left heart avg pressure should be updated');
  assertEqual(aggregator.state.LeftHeart.IntPressureMin, 10.0, 'Left heart min pressure should be updated');
  assertEqual(aggregator.state.LeftHeart.IntPressureMax, 20.0, 'Left heart max pressure should be updated');
  
  // Check right heart
  assertEqual(aggregator.state.RightHeart.IntPressure, 15.0, 'Right heart avg pressure should be updated');
  assertEqual(aggregator.state.RightHeart.IntPressureMin, 10.0, 'Right heart min pressure should be updated');
  assertEqual(aggregator.state.RightHeart.IntPressureMax, 20.0, 'Right heart max pressure should be updated');
});

// Test 21: Pump side routing - All with MotorCurrent
test('should route MotorCurrent with pumpSide="All" to both sides (Requirement 1.4)', () => {
  const aggregator = new StateAggregator();
  
  const message = {
    messageType: 'MotorCurrent',
    timestampUtc: 1234567890,
    source: 'CAN',
    data: {
      combinedCurrent: 5.0,
      pumpSide: 'All'
    }
  };
  
  aggregator.updateState(message);
  
  // Both sides should have power consumption updated (5A * 12V = 60W)
  assertEqual(aggregator.state.LeftHeart.PowerConsumption, 60.0, 'Left heart power should be updated');
  assertEqual(aggregator.state.RightHeart.PowerConsumption, 60.0, 'Right heart power should be updated');
});

console.log('\n✓ All StateAggregator tests passed!');
