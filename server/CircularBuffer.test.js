/**
 * Unit tests for CircularBuffer
 */
const CircularBuffer = require('./CircularBuffer');

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

function assertArrayEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// Test 1: Constructor creates buffer with correct capacity
test('should create buffer with specified capacity', () => {
  const buffer = new CircularBuffer(10);
  assertEqual(buffer.capacity, 10, 'Capacity should be 10');
  assertEqual(buffer.size(), 0, 'Initial size should be 0');
  assertEqual(buffer.isFull(), false, 'Buffer should not be full initially');
});

// Test 2: Constructor throws error for invalid capacity
test('should throw error for capacity <= 0', () => {
  try {
    new CircularBuffer(0);
    throw new Error('Should have thrown error');
  } catch (error) {
    assert(error.message.includes('Capacity must be greater than 0'), 'Should throw capacity error');
  }
});

// Test 3: Push adds elements correctly
test('should push elements and increase size', () => {
  const buffer = new CircularBuffer(5);
  buffer.push(1);
  buffer.push(2);
  buffer.push(3);
  
  assertEqual(buffer.size(), 3, 'Size should be 3');
  assertArrayEqual(buffer.toArray(), [1, 2, 3], 'Elements should be in order');
});

// Test 4: Push removes oldest when at capacity
test('should remove oldest element when at capacity', () => {
  const buffer = new CircularBuffer(3);
  buffer.push(1);
  buffer.push(2);
  buffer.push(3);
  assertEqual(buffer.isFull(), true, 'Buffer should be full');
  
  buffer.push(4); // Should remove 1
  assertEqual(buffer.size(), 3, 'Size should remain 3');
  assertArrayEqual(buffer.toArray(), [2, 3, 4], 'Oldest element should be removed');
  
  buffer.push(5); // Should remove 2
  assertArrayEqual(buffer.toArray(), [3, 4, 5], 'Oldest element should be removed');
});

// Test 5: toArray returns empty array for empty buffer
test('should return empty array when buffer is empty', () => {
  const buffer = new CircularBuffer(5);
  assertArrayEqual(buffer.toArray(), [], 'Empty buffer should return empty array');
});

// Test 6: toArray returns elements in correct order
test('should return elements in insertion order', () => {
  const buffer = new CircularBuffer(5);
  buffer.push('a');
  buffer.push('b');
  buffer.push('c');
  
  assertArrayEqual(buffer.toArray(), ['a', 'b', 'c'], 'Elements should be in insertion order');
});

// Test 7: Clear resets buffer
test('should clear all elements', () => {
  const buffer = new CircularBuffer(5);
  buffer.push(1);
  buffer.push(2);
  buffer.push(3);
  
  buffer.clear();
  assertEqual(buffer.size(), 0, 'Size should be 0 after clear');
  assertEqual(buffer.isFull(), false, 'Buffer should not be full after clear');
  assertArrayEqual(buffer.toArray(), [], 'toArray should return empty array after clear');
});

// Test 8: Buffer works correctly after wrapping around
test('should handle wrap-around correctly', () => {
  const buffer = new CircularBuffer(3);
  
  // Fill buffer
  buffer.push(1);
  buffer.push(2);
  buffer.push(3);
  
  // Wrap around multiple times
  buffer.push(4);
  buffer.push(5);
  buffer.push(6);
  buffer.push(7);
  
  assertEqual(buffer.size(), 3, 'Size should remain 3');
  assertArrayEqual(buffer.toArray(), [5, 6, 7], 'Should contain last 3 elements');
});

// Test 9: Size never exceeds capacity
test('should never exceed capacity', () => {
  const buffer = new CircularBuffer(5);
  
  for (let i = 0; i < 100; i++) {
    buffer.push(i);
    assert(buffer.size() <= 5, `Size should never exceed 5, got ${buffer.size()}`);
  }
  
  assertEqual(buffer.size(), 5, 'Final size should be 5');
});

// Test 10: isFull returns correct value
test('should correctly report full status', () => {
  const buffer = new CircularBuffer(3);
  
  assertEqual(buffer.isFull(), false, 'Should not be full initially');
  
  buffer.push(1);
  assertEqual(buffer.isFull(), false, 'Should not be full with 1 element');
  
  buffer.push(2);
  assertEqual(buffer.isFull(), false, 'Should not be full with 2 elements');
  
  buffer.push(3);
  assertEqual(buffer.isFull(), true, 'Should be full with 3 elements');
  
  buffer.push(4);
  assertEqual(buffer.isFull(), true, 'Should remain full after overflow');
});

// Test 11: Works with different data types
test('should work with different data types', () => {
  const buffer = new CircularBuffer(3);
  
  buffer.push({ id: 1 });
  buffer.push('string');
  buffer.push(42);
  
  const result = buffer.toArray();
  assertEqual(result.length, 3, 'Should contain 3 elements');
  assertEqual(result[0].id, 1, 'Should preserve object');
  assertEqual(result[1], 'string', 'Should preserve string');
  assertEqual(result[2], 42, 'Should preserve number');
});

// Test 12: Capacity of 1 works correctly
test('should work with capacity of 1', () => {
  const buffer = new CircularBuffer(1);
  
  buffer.push('a');
  assertEqual(buffer.size(), 1, 'Size should be 1');
  assertArrayEqual(buffer.toArray(), ['a'], 'Should contain single element');
  
  buffer.push('b');
  assertEqual(buffer.size(), 1, 'Size should remain 1');
  assertArrayEqual(buffer.toArray(), ['b'], 'Should contain only newest element');
});

console.log('\n✓ All CircularBuffer tests passed!');
