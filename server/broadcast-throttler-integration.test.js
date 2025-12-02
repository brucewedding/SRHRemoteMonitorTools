/**
 * Integration test for BroadcastThrottler in fastify-server
 * Validates that BroadcastThrottler is properly integrated
 * Validates: Requirements 7.1, 7.2, 7.3
 */

const fs = require('fs');
const path = require('path');

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

// Read the fastify-server.js file
const serverFilePath = path.join(__dirname, 'fastify-server.js');
const serverCode = fs.readFileSync(serverFilePath, 'utf8');

console.log('\n=== BroadcastThrottler Integration Tests ===\n');

// Test 1: Verify BroadcastThrottler is imported
test('should import BroadcastThrottler module', () => {
  assert(
    serverCode.includes("const BroadcastThrottler = require('./BroadcastThrottler')"),
    'BroadcastThrottler should be imported'
  );
});

// Test 2: Verify BroadcastThrottler is instantiated with correct configuration
test('should create BroadcastThrottler instance with normalIntervalMs: 100', () => {
  assert(
    serverCode.includes('normalIntervalMs: 100'),
    'BroadcastThrottler should have normalIntervalMs set to 100'
  );
});

test('should create BroadcastThrottler instance with throttledIntervalMs: 500', () => {
  assert(
    serverCode.includes('throttledIntervalMs: 500'),
    'BroadcastThrottler should have throttledIntervalMs set to 500'
  );
});

test('should create BroadcastThrottler instance with memoryThresholdMB: 350', () => {
  assert(
    serverCode.includes('memoryThresholdMB: 350'),
    'BroadcastThrottler should have memoryThresholdMB set to 350'
  );
});

// Test 3: Verify broadcastAggregatedState checks shouldBroadcastNow
test('should check shouldBroadcastNow in broadcastAggregatedState', () => {
  assert(
    serverCode.includes('broadcastThrottler.shouldBroadcastNow'),
    'broadcastAggregatedState should call shouldBroadcastNow'
  );
});

test('should skip broadcast when shouldBroadcastNow returns false', () => {
  const broadcastFunction = serverCode.substring(
    serverCode.indexOf('const broadcastAggregatedState = ()'),
    serverCode.indexOf('const broadcastLastKnownState')
  );
  
  assert(
    broadcastFunction.includes('if (!broadcastThrottler.shouldBroadcastNow'),
    'Should check if shouldBroadcastNow returns false'
  );
  
  assert(
    broadcastFunction.includes('return;') && broadcastFunction.includes('Skip this broadcast'),
    'Should return early when throttling'
  );
});

// Test 4: Verify recordBroadcast is called after broadcast
test('should call recordBroadcast after broadcasting', () => {
  const broadcastFunction = serverCode.substring(
    serverCode.indexOf('const broadcastAggregatedState = ()'),
    serverCode.indexOf('const broadcastLastKnownState')
  );
  
  assert(
    broadcastFunction.includes('broadcastThrottler.recordBroadcast()'),
    'Should call recordBroadcast after broadcasting'
  );
});

// Test 5: Verify memory usage is checked for throttling
test('should get heap usage for throttling decision', () => {
  const broadcastFunction = serverCode.substring(
    serverCode.indexOf('const broadcastAggregatedState = ()'),
    serverCode.indexOf('const broadcastLastKnownState')
  );
  
  assert(
    broadcastFunction.includes('process.memoryUsage().heapUsed'),
    'Should check memory usage for throttling'
  );
  
  assert(
    broadcastFunction.includes('heapUsageMB'),
    'Should calculate heap usage in MB'
  );
});

// Test 6: Verify throttling state change logging
test('should log when throttling is activated', () => {
  assert(
    serverCode.includes('Broadcast throttling activated'),
    'Should log when throttling is activated'
  );
});

test('should log when throttling is deactivated', () => {
  assert(
    serverCode.includes('Broadcast throttling deactivated'),
    'Should log when throttling is deactivated'
  );
});

test('should track throttling state changes', () => {
  assert(
    serverCode.includes('wasThrottled'),
    'Should track previous throttling state'
  );
  
  assert(
    serverCode.includes('broadcastThrottler.shouldThrottle(heapUsageMB)'),
    'Should check if throttling is needed'
  );
});

// Test 7: Verify BroadcastThrottler is initialized after BufferCleaner
test('should initialize BroadcastThrottler after BufferCleaner', () => {
  const bufferCleanerIndex = serverCode.indexOf('bufferCleaner.startCleaning');
  const broadcastThrottlerIndex = serverCode.indexOf('new BroadcastThrottler');
  
  assert(
    broadcastThrottlerIndex > bufferCleanerIndex,
    'BroadcastThrottler should be initialized after BufferCleaner'
  );
});

console.log('\n✓ All BroadcastThrottler integration tests passed!\n');
