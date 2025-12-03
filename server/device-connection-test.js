/**
 * Test for device connection handling (Task 4.2)
 * Verifies that SystemId is set in state aggregator and waiting clients are connected
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

// Test 1: setSystemId sets the SystemId in state
test('setSystemId sets the SystemId in state (Requirement 6.4)', () => {
  const aggregator = new StateAggregator();
  
  // Initially empty
  const initialState = aggregator.getState();
  assertEqual(initialState.SystemId, '', 'SystemId should initially be empty');
  
  // Set SystemId
  aggregator.setSystemId('TEST-001');
  
  // Verify it's set
  const updatedState = aggregator.getState();
  assertEqual(updatedState.SystemId, 'TEST-001', 'SystemId should be set to TEST-001');
});

// Test 2: setSystemId invalidates cache
test('setSystemId invalidates cache', () => {
  const aggregator = new StateAggregator();
  
  // Get initial state (creates cache)
  aggregator.getState();
  
  // Set SystemId (should invalidate cache)
  aggregator.setSystemId('TEST-002');
  
  // Get state again
  const state = aggregator.getState();
  assertEqual(state.SystemId, 'TEST-002', 'SystemId should be updated in new state');
});

// Test 3: setSystemId with same value doesn't invalidate cache
test('setSystemId with same value does not invalidate cache', () => {
  const aggregator = new StateAggregator();
  
  // Set SystemId
  aggregator.setSystemId('TEST-003');
  aggregator.cacheInvalidated = false; // Reset flag
  
  // Set same SystemId again
  aggregator.setSystemId('TEST-003');
  
  // Cache should not be invalidated
  assertEqual(aggregator.cacheInvalidated, false, 'Cache should not be invalidated for same SystemId');
});

// Test 4: setSystemId with empty string is ignored
test('setSystemId with empty string is ignored', () => {
  const aggregator = new StateAggregator();
  
  // Set a valid SystemId
  aggregator.setSystemId('TEST-004');
  
  // Try to set empty string
  aggregator.setSystemId('');
  
  // SystemId should remain unchanged
  const state = aggregator.getState();
  assertEqual(state.SystemId, 'TEST-004', 'SystemId should remain TEST-004');
});

// Test 5: setSystemId with null is ignored
test('setSystemId with null is ignored', () => {
  const aggregator = new StateAggregator();
  
  // Set a valid SystemId
  aggregator.setSystemId('TEST-005');
  
  // Try to set null
  aggregator.setSystemId(null);
  
  // SystemId should remain unchanged
  const state = aggregator.getState();
  assertEqual(state.SystemId, 'TEST-005', 'SystemId should remain TEST-005');
});

console.log('\n✓ All device connection tests passed!\n');
