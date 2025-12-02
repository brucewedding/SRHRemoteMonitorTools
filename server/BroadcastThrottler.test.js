/**
 * Unit tests for BroadcastThrottler
 */
const BroadcastThrottler = require('./BroadcastThrottler');

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

function assertDeepEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(message || `Expected ${expectedStr}, got ${actualStr}`);
  }
}

// Helper to simulate time passing
function sleep(ms) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    // Busy wait
  }
}

console.log('Running BroadcastThrottler tests...\n');

// Constructor tests
test('constructor should use default values when no options provided', () => {
  const throttler = new BroadcastThrottler();
  
  assertEqual(throttler.normalIntervalMs, 100);
  assertEqual(throttler.throttledIntervalMs, 500);
  assertEqual(throttler.memoryThresholdMB, 350);
  assertEqual(throttler.lastBroadcastTime, 0);
  assertEqual(throttler.isThrottled, false);
});

test('constructor should use provided options', () => {
  const throttler = new BroadcastThrottler({
    normalIntervalMs: 200,
    throttledIntervalMs: 1000,
    memoryThresholdMB: 400
  });
  
  assertEqual(throttler.normalIntervalMs, 200);
  assertEqual(throttler.throttledIntervalMs, 1000);
  assertEqual(throttler.memoryThresholdMB, 400);
});

// shouldThrottle tests
test('shouldThrottle should return false when memory is below threshold', () => {
  const throttler = new BroadcastThrottler({ memoryThresholdMB: 350 });
  
  assertEqual(throttler.shouldThrottle(300), false);
  assertEqual(throttler.shouldThrottle(349), false);
});

test('shouldThrottle should return true when memory equals threshold', () => {
  const throttler = new BroadcastThrottler({ memoryThresholdMB: 350 });
  
  assertEqual(throttler.shouldThrottle(350), true);
});

test('shouldThrottle should return true when memory exceeds threshold', () => {
  const throttler = new BroadcastThrottler({ memoryThresholdMB: 350 });
  
  assertEqual(throttler.shouldThrottle(351), true);
  assertEqual(throttler.shouldThrottle(400), true);
});

// getCurrentInterval tests
test('getCurrentInterval should return normal interval when memory is below threshold', () => {
  const throttler = new BroadcastThrottler({
    normalIntervalMs: 100,
    throttledIntervalMs: 500,
    memoryThresholdMB: 350
  });
  
  const interval = throttler.getCurrentInterval(300);
  assertEqual(interval, 100);
  assertEqual(throttler.isThrottled, false);
});

test('getCurrentInterval should return throttled interval when memory exceeds threshold', () => {
  const throttler = new BroadcastThrottler({
    normalIntervalMs: 100,
    throttledIntervalMs: 500,
    memoryThresholdMB: 350
  });
  
  const interval = throttler.getCurrentInterval(400);
  assertEqual(interval, 500);
  assertEqual(throttler.isThrottled, true);
});

test('getCurrentInterval should return current interval without updating when no memory provided', () => {
  const throttler = new BroadcastThrottler({
    normalIntervalMs: 100,
    throttledIntervalMs: 500
  });
  
  // Set throttled state
  throttler.isThrottled = true;
  
  // Should return throttled interval without changing state
  const interval = throttler.getCurrentInterval();
  assertEqual(interval, 500);
  assertEqual(throttler.isThrottled, true);
});

test('getCurrentInterval should update throttled state when memory is provided', () => {
  const throttler = new BroadcastThrottler({
    normalIntervalMs: 100,
    throttledIntervalMs: 500,
    memoryThresholdMB: 350
  });
  
  // Start with high memory
  throttler.getCurrentInterval(400);
  assertEqual(throttler.isThrottled, true);
  
  // Memory returns to normal
  throttler.getCurrentInterval(300);
  assertEqual(throttler.isThrottled, false);
});

// shouldBroadcastNow tests
test('shouldBroadcastNow should return true on first broadcast', () => {
  const throttler = new BroadcastThrottler();
  
  assertEqual(throttler.shouldBroadcastNow(300), true);
});

test('shouldBroadcastNow should return false if not enough time has passed (normal interval)', () => {
  const throttler = new BroadcastThrottler({
    normalIntervalMs: 100,
    memoryThresholdMB: 350
  });
  
  // Record a broadcast
  throttler.recordBroadcast();
  
  // Wait 50ms (less than normal interval)
  sleep(50);
  
  assertEqual(throttler.shouldBroadcastNow(300), false);
});

test('shouldBroadcastNow should return true if enough time has passed (normal interval)', () => {
  const throttler = new BroadcastThrottler({
    normalIntervalMs: 100,
    memoryThresholdMB: 350
  });
  
  // Record a broadcast
  throttler.recordBroadcast();
  
  // Wait 100ms (equal to normal interval)
  sleep(100);
  
  assertEqual(throttler.shouldBroadcastNow(300), true);
});

test('shouldBroadcastNow should return false if not enough time has passed (throttled interval)', () => {
  const throttler = new BroadcastThrottler({
    normalIntervalMs: 100,
    throttledIntervalMs: 500,
    memoryThresholdMB: 350
  });
  
  // Record a broadcast
  throttler.recordBroadcast();
  
  // Wait 300ms (less than throttled interval)
  sleep(300);
  
  assertEqual(throttler.shouldBroadcastNow(400), false);
});

test('shouldBroadcastNow should return true if enough time has passed (throttled interval)', () => {
  const throttler = new BroadcastThrottler({
    normalIntervalMs: 100,
    throttledIntervalMs: 500,
    memoryThresholdMB: 350
  });
  
  // Record a broadcast
  throttler.recordBroadcast();
  
  // Wait 500ms (equal to throttled interval)
  sleep(500);
  
  assertEqual(throttler.shouldBroadcastNow(400), true);
});

// recordBroadcast tests
test('recordBroadcast should update lastBroadcastTime to current time', () => {
  const throttler = new BroadcastThrottler();
  const beforeTime = Date.now();
  
  throttler.recordBroadcast();
  
  const afterTime = Date.now();
  
  assert(throttler.lastBroadcastTime >= beforeTime, 'lastBroadcastTime should be >= beforeTime');
  assert(throttler.lastBroadcastTime <= afterTime, 'lastBroadcastTime should be <= afterTime');
});

test('recordBroadcast should update lastBroadcastTime on multiple calls', () => {
  const throttler = new BroadcastThrottler();
  
  throttler.recordBroadcast();
  const firstTime = throttler.lastBroadcastTime;
  
  sleep(10);
  
  throttler.recordBroadcast();
  const secondTime = throttler.lastBroadcastTime;
  
  assert(secondTime > firstTime, 'Second broadcast time should be greater than first');
});

// Integration scenario
test('should handle memory pressure cycle', () => {
  const throttler = new BroadcastThrottler({
    normalIntervalMs: 100,
    throttledIntervalMs: 500,
    memoryThresholdMB: 350
  });
  
  // Normal operation - first broadcast
  assertEqual(throttler.shouldBroadcastNow(300), true);
  throttler.recordBroadcast();
  
  // Wait normal interval
  sleep(100);
  assertEqual(throttler.shouldBroadcastNow(300), true);
  throttler.recordBroadcast();
  
  // Memory pressure starts - not enough time for throttled interval
  sleep(100);
  assertEqual(throttler.shouldBroadcastNow(400), false);
  
  // Wait for throttled interval
  sleep(400);
  assertEqual(throttler.shouldBroadcastNow(400), true);
  throttler.recordBroadcast();
  
  // Memory returns to normal
  sleep(100);
  assertEqual(throttler.shouldBroadcastNow(300), true);
});

console.log('\n✓ All BroadcastThrottler tests passed!');
