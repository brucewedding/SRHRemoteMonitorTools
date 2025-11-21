/**
 * Unit tests for Cardiac Output Calculation
 * 
 * Tests for cardiac output calculation functionality in StateAggregator
 * Validates: Requirements 4.1, 4.2, 4.3
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

function assertClose(actual, expected, tolerance, message) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(message || `Expected ${expected} ± ${tolerance}, got ${actual}`);
  }
}

// Test 1: Cardiac output calculation with valid data (Requirement 4.1)
test('should calculate cardiac output correctly with valid data (Requirement 4.1)', () => {
  const aggregator = new StateAggregator();
  
  // Set heart rate
  aggregator.state.HeartRate = 80; // bpm
  
  // Set stroke length for left heart
  aggregator.state.LeftHeart.ActualStrokeLen = 30; // mm
  
  // Calculate cardiac output
  aggregator.updateCardiacOutput();
  
  // Expected: (80 * 30 * 5.0) / 1000 = 12.0 L/min
  assertClose(aggregator.state.LeftHeart.CardiacOutput, 12.0, 0.01, 
    'Left heart cardiac output should be 12.0 L/min');
});

// Test 2: Cardiac output routes to correct side (Requirement 4.2)
test('should route cardiac output to correct side (Requirement 4.2)', () => {
  const aggregator = new StateAggregator();
  
  // Set heart rate
  aggregator.state.HeartRate = 70; // bpm
  
  // Set different stroke lengths for each side
  aggregator.state.LeftHeart.ActualStrokeLen = 25; // mm
  aggregator.state.RightHeart.ActualStrokeLen = 20; // mm
  
  // Calculate cardiac output
  aggregator.updateCardiacOutput();
  
  // Expected left: (70 * 25 * 5.0) / 1000 = 8.75 L/min
  assertClose(aggregator.state.LeftHeart.CardiacOutput, 8.75, 0.01, 
    'Left heart cardiac output should be 8.75 L/min');
  
  // Expected right: (70 * 20 * 5.0) / 1000 = 7.0 L/min
  assertClose(aggregator.state.RightHeart.CardiacOutput, 7.0, 0.01, 
    'Right heart cardiac output should be 7.0 L/min');
});

// Test 3: Missing heart rate preserves previous value (Requirement 4.3)
test('should preserve previous value when heart rate is missing (Requirement 4.3)', () => {
  const aggregator = new StateAggregator();
  
  // Set initial values
  aggregator.state.HeartRate = 80;
  aggregator.state.LeftHeart.ActualStrokeLen = 30;
  aggregator.updateCardiacOutput();
  
  const previousCardiacOutput = aggregator.state.LeftHeart.CardiacOutput;
  
  // Clear heart rate
  aggregator.state.HeartRate = 0;
  aggregator.updateCardiacOutput();
  
  // Should preserve previous value
  assertEqual(aggregator.state.LeftHeart.CardiacOutput, previousCardiacOutput,
    'Cardiac output should preserve previous value when heart rate is missing');
});

// Test 4: Missing stroke length preserves previous value (Requirement 4.3)
test('should preserve previous value when stroke length is missing (Requirement 4.3)', () => {
  const aggregator = new StateAggregator();
  
  // Set initial values
  aggregator.state.HeartRate = 80;
  aggregator.state.LeftHeart.ActualStrokeLen = 30;
  aggregator.updateCardiacOutput();
  
  const previousCardiacOutput = aggregator.state.LeftHeart.CardiacOutput;
  
  // Clear stroke length
  aggregator.state.LeftHeart.ActualStrokeLen = 0;
  aggregator.state.LeftHeart.TargetStrokeLen = 0;
  aggregator.updateCardiacOutput();
  
  // Should preserve previous value
  assertEqual(aggregator.state.LeftHeart.CardiacOutput, previousCardiacOutput,
    'Cardiac output should preserve previous value when stroke length is missing');
});

// Test 5: Uses target stroke length when actual is not available
test('should use target stroke length when actual is not available', () => {
  const aggregator = new StateAggregator();
  
  // Set heart rate and only target stroke length
  aggregator.state.HeartRate = 75;
  aggregator.state.LeftHeart.TargetStrokeLen = 28;
  aggregator.state.LeftHeart.ActualStrokeLen = 0;
  
  // Calculate cardiac output
  aggregator.updateCardiacOutput();
  
  // Expected: (75 * 28 * 5.0) / 1000 = 10.5 L/min
  assertClose(aggregator.state.LeftHeart.CardiacOutput, 10.5, 0.01, 
    'Should use target stroke length when actual is not available');
});

// Test 6: Prefers actual stroke length over target
test('should prefer actual stroke length over target', () => {
  const aggregator = new StateAggregator();
  
  // Set heart rate and both stroke lengths
  aggregator.state.HeartRate = 75;
  aggregator.state.LeftHeart.TargetStrokeLen = 28;
  aggregator.state.LeftHeart.ActualStrokeLen = 32;
  
  // Calculate cardiac output
  aggregator.updateCardiacOutput();
  
  // Expected: (75 * 32 * 5.0) / 1000 = 12.0 L/min (using actual, not target)
  assertClose(aggregator.state.LeftHeart.CardiacOutput, 12.0, 0.01, 
    'Should prefer actual stroke length over target');
});

// Test 7: Cardiac output updates automatically after message processing
test('should update cardiac output automatically after message processing', () => {
  const aggregator = new StateAggregator();
  
  // Send ManualPhysiologicalSettings message
  aggregator.updateState({
    messageType: 'ManualPhysiologicalSettings',
    timestampUtc: Date.now(),
    source: 'CAN',
    data: {
      heartRate: 85,
      leftStrokeLength: 35,
      rightStrokeLength: 30,
      pumpSide: 'All'
    }
  });
  
  // Expected left: (85 * 35 * 5.0) / 1000 = 14.875 L/min
  assertClose(aggregator.state.LeftHeart.CardiacOutput, 14.875, 0.01, 
    'Left cardiac output should be calculated automatically');
  
  // Expected right: (85 * 30 * 5.0) / 1000 = 12.75 L/min
  assertClose(aggregator.state.RightHeart.CardiacOutput, 12.75, 0.01, 
    'Right cardiac output should be calculated automatically');
});

// Test 8: Cardiac output updates when actual stroke length changes
test('should update cardiac output when actual stroke length changes', () => {
  const aggregator = new StateAggregator();
  
  // Set initial values
  aggregator.state.HeartRate = 80;
  aggregator.state.LeftHeart.TargetStrokeLen = 30;
  
  // Send ActualStrokeLength message
  aggregator.updateState({
    messageType: 'ActualStrokeLength',
    timestampUtc: Date.now(),
    source: 'CAN',
    data: {
      strokeLength: 28,
      pumpSide: 'Left'
    }
  });
  
  // Expected: (80 * 28 * 5.0) / 1000 = 11.2 L/min
  assertClose(aggregator.state.LeftHeart.CardiacOutput, 11.2, 0.01, 
    'Cardiac output should update when actual stroke length changes');
});

// Test 9: Initial cardiac output is zero
test('should have initial cardiac output of zero', () => {
  const aggregator = new StateAggregator();
  
  assertEqual(aggregator.state.LeftHeart.CardiacOutput, 0, 
    'Initial left cardiac output should be 0');
  assertEqual(aggregator.state.RightHeart.CardiacOutput, 0, 
    'Initial right cardiac output should be 0');
});

// Test 10: Cardiac output calculation with different heart rates
test('should calculate correctly with different heart rates', () => {
  const aggregator = new StateAggregator();
  
  aggregator.state.LeftHeart.ActualStrokeLen = 25;
  
  // Test with heart rate 60
  aggregator.state.HeartRate = 60;
  aggregator.updateCardiacOutput();
  assertClose(aggregator.state.LeftHeart.CardiacOutput, 7.5, 0.01, 
    'Cardiac output at 60 bpm should be 7.5 L/min');
  
  // Test with heart rate 100
  aggregator.state.HeartRate = 100;
  aggregator.updateCardiacOutput();
  assertClose(aggregator.state.LeftHeart.CardiacOutput, 12.5, 0.01, 
    'Cardiac output at 100 bpm should be 12.5 L/min');
});

console.log('\n✓ All Cardiac Output tests passed!');
