/**
 * Tests for StreamingPressureHandler with CircularBuffer integration
 * Validates: Requirements 1.1, 1.4, 1.5
 */

const StateAggregator = require('./StateAggregator');
const CircularBuffer = require('./CircularBuffer');

// Simple test framework
let testCount = 0;
let passCount = 0;

function test(description, fn) {
  testCount++;
  try {
    fn();
    passCount++;
    console.log(`✓ ${description}`);
  } catch (error) {
    console.error(`✗ ${description}`);
    console.error(`  ${error.message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Test 1: Verify CircularBuffer is used for non-null channels (Requirement 1.4)
test('should use CircularBuffer for non-null channels', () => {
  const aggregator = new StateAggregator();
  
  aggregator.updateState({
    messageType: 'StreamingPressure',
    timestampUtc: Date.now(),
    data: {
      leftAtrial: [1, 2, 3],
      rightAtrial: null,
      leftVentricular: null,
      rightVentricular: null,
      aortic: null,
      pulmonaryArterial: [4, 5, 6],
      sampleRate: 1000,
      unit: 'mmHg'
    }
  });
  
  assert(aggregator.state.StreamingPressure.leftAtrial instanceof CircularBuffer, 
    'leftAtrial should be a CircularBuffer');
  assert(aggregator.state.StreamingPressure.pulmonaryArterial instanceof CircularBuffer, 
    'pulmonaryArterial should be a CircularBuffer');
});

// Test 2: Verify null channels don't allocate buffers (Requirement 1.5)
test('should not allocate buffers for null channels', () => {
  const aggregator = new StateAggregator();
  
  aggregator.updateState({
    messageType: 'StreamingPressure',
    timestampUtc: Date.now(),
    data: {
      leftAtrial: null,
      rightAtrial: null,
      leftVentricular: null,
      rightVentricular: null,
      aortic: null,
      pulmonaryArterial: [1, 2, 3],
      sampleRate: 1000,
      unit: 'mmHg'
    }
  });
  
  assertEqual(aggregator.state.StreamingPressure.leftAtrial, null, 'leftAtrial should remain null');
  assertEqual(aggregator.state.StreamingPressure.rightAtrial, null, 'rightAtrial should remain null');
  assertEqual(aggregator.state.StreamingPressure.leftVentricular, null, 'leftVentricular should remain null');
  assertEqual(aggregator.state.StreamingPressure.rightVentricular, null, 'rightVentricular should remain null');
  assertEqual(aggregator.state.StreamingPressure.aortic, null, 'aortic should remain null');
  assert(aggregator.state.StreamingPressure.pulmonaryArterial instanceof CircularBuffer, 
    'pulmonaryArterial should be a CircularBuffer');
});

// Test 3: Verify buffer capacity is 1000 points (Requirement 1.1)
test('should set buffer capacity to 1000 points', () => {
  const aggregator = new StateAggregator();
  
  aggregator.updateState({
    messageType: 'StreamingPressure',
    timestampUtc: Date.now(),
    data: {
      pulmonaryArterial: [1, 2, 3],
      sampleRate: 1000,
      unit: 'mmHg'
    }
  });
  
  assertEqual(aggregator.state.StreamingPressure.pulmonaryArterial.capacity, 1000, 
    'Buffer capacity should be 1000');
});

// Test 4: Verify buffer limits data to 1000 points (Requirement 1.1)
test('should limit buffer to 1000 points', () => {
  const aggregator = new StateAggregator();
  
  // Create array with 2000 elements
  const largeArray = Array.from({length: 2000}, (_, i) => i);
  
  aggregator.updateState({
    messageType: 'StreamingPressure',
    timestampUtc: Date.now(),
    data: {
      pulmonaryArterial: largeArray,
      sampleRate: 1000,
      unit: 'mmHg'
    }
  });
  
  assertEqual(aggregator.state.StreamingPressure.pulmonaryArterial.size(), 1000, 
    'Buffer size should be limited to 1000');
  
  // Verify oldest data was removed (first 1000 elements)
  const arr = aggregator.state.StreamingPressure.pulmonaryArterial.toArray();
  assertEqual(arr[0], 1000, 'First element should be 1000 (oldest removed)');
  assertEqual(arr[999], 1999, 'Last element should be 1999');
});

// Test 5: Verify lastUpdate timestamp is set (Requirement 1.4)
test('should update lastUpdate timestamp when buffers are modified', () => {
  const aggregator = new StateAggregator();
  
  const before = Date.now();
  
  aggregator.updateState({
    messageType: 'StreamingPressure',
    timestampUtc: Date.now(),
    data: {
      pulmonaryArterial: [1, 2, 3],
      sampleRate: 1000,
      unit: 'mmHg'
    }
  });
  
  const after = Date.now();
  const lastUpdate = aggregator.state.StreamingPressure.lastUpdate;
  
  assert(lastUpdate !== undefined, 'lastUpdate should be set');
  assert(lastUpdate >= before && lastUpdate <= after, 'lastUpdate should be recent');
});

// Test 6: Verify getState() converts CircularBuffers to arrays
test('should convert CircularBuffers to arrays in getState()', () => {
  const aggregator = new StateAggregator();
  
  aggregator.updateState({
    messageType: 'StreamingPressure',
    timestampUtc: Date.now(),
    data: {
      pulmonaryArterial: [1, 2, 3],
      leftAtrial: [4, 5, 6],
      sampleRate: 1000,
      unit: 'mmHg'
    }
  });
  
  const state = aggregator.getState();
  
  assert(Array.isArray(state.StreamingPressure.pulmonaryArterial), 
    'pulmonaryArterial should be an array in getState()');
  assert(Array.isArray(state.StreamingPressure.leftAtrial), 
    'leftAtrial should be an array in getState()');
  assertEqual(state.StreamingPressure.pulmonaryArterial.length, 3, 
    'Array should have correct length');
});

// Test 7: Verify JSON serialization works
test('should serialize state to JSON correctly', () => {
  const aggregator = new StateAggregator();
  
  aggregator.updateState({
    messageType: 'StreamingPressure',
    timestampUtc: Date.now(),
    data: {
      pulmonaryArterial: [1, 2, 3],
      sampleRate: 1000,
      unit: 'mmHg'
    }
  });
  
  const state = aggregator.getState();
  
  // Should not throw
  const json = JSON.stringify(state);
  assert(json.length > 0, 'JSON should be generated');
  
  // Verify it can be parsed back
  const parsed = JSON.parse(json);
  assert(Array.isArray(parsed.StreamingPressure.pulmonaryArterial), 
    'Parsed data should have array');
  assertEqual(parsed.StreamingPressure.pulmonaryArterial[0], 1, 
    'Parsed data should have correct values');
});

// Test 8: Verify multiple updates accumulate data correctly
test('should accumulate data across multiple updates', () => {
  const aggregator = new StateAggregator();
  
  // First update
  aggregator.updateState({
    messageType: 'StreamingPressure',
    timestampUtc: Date.now(),
    data: {
      pulmonaryArterial: [1, 2, 3],
      sampleRate: 1000,
      unit: 'mmHg'
    }
  });
  
  assertEqual(aggregator.state.StreamingPressure.pulmonaryArterial.size(), 3, 
    'Should have 3 elements after first update');
  
  // Second update
  aggregator.updateState({
    messageType: 'StreamingPressure',
    timestampUtc: Date.now(),
    data: {
      pulmonaryArterial: [4, 5],
      sampleRate: 1000,
      unit: 'mmHg'
    }
  });
  
  assertEqual(aggregator.state.StreamingPressure.pulmonaryArterial.size(), 5, 
    'Should have 5 elements after second update');
  
  const arr = aggregator.state.StreamingPressure.pulmonaryArterial.toArray();
  assertEqual(arr[0], 1, 'First element should be 1');
  assertEqual(arr[4], 5, 'Last element should be 5');
});

// Test 9: Verify all channels can be used simultaneously
test('should handle all channels simultaneously', () => {
  const aggregator = new StateAggregator();
  
  aggregator.updateState({
    messageType: 'StreamingPressure',
    timestampUtc: Date.now(),
    data: {
      leftAtrial: [1, 2],
      rightAtrial: [3, 4],
      leftVentricular: [5, 6],
      rightVentricular: [7, 8],
      aortic: [9, 10],
      pulmonaryArterial: [11, 12],
      sampleRate: 1000,
      unit: 'mmHg'
    }
  });
  
  assertEqual(aggregator.state.StreamingPressure.leftAtrial.size(), 2, 'leftAtrial should have 2 elements');
  assertEqual(aggregator.state.StreamingPressure.rightAtrial.size(), 2, 'rightAtrial should have 2 elements');
  assertEqual(aggregator.state.StreamingPressure.leftVentricular.size(), 2, 'leftVentricular should have 2 elements');
  assertEqual(aggregator.state.StreamingPressure.rightVentricular.size(), 2, 'rightVentricular should have 2 elements');
  assertEqual(aggregator.state.StreamingPressure.aortic.size(), 2, 'aortic should have 2 elements');
  assertEqual(aggregator.state.StreamingPressure.pulmonaryArterial.size(), 2, 'pulmonaryArterial should have 2 elements');
});

// Test 10: Verify buffer reuse (doesn't create new buffer on each update)
test('should reuse existing CircularBuffer instances', () => {
  const aggregator = new StateAggregator();
  
  aggregator.updateState({
    messageType: 'StreamingPressure',
    timestampUtc: Date.now(),
    data: {
      pulmonaryArterial: [1, 2, 3],
      sampleRate: 1000,
      unit: 'mmHg'
    }
  });
  
  const buffer1 = aggregator.state.StreamingPressure.pulmonaryArterial;
  
  aggregator.updateState({
    messageType: 'StreamingPressure',
    timestampUtc: Date.now(),
    data: {
      pulmonaryArterial: [4, 5],
      sampleRate: 1000,
      unit: 'mmHg'
    }
  });
  
  const buffer2 = aggregator.state.StreamingPressure.pulmonaryArterial;
  
  assert(buffer1 === buffer2, 'Should reuse the same CircularBuffer instance');
});

// Summary
console.log(`\n${passCount === testCount ? '✓' : '✗'} All StreamingPressureHandler CircularBuffer integration tests passed!`);
console.log(`  ${passCount}/${testCount} tests passed\n`);

process.exit(passCount === testCount ? 0 : 1);
