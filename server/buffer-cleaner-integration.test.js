/**
 * Integration test for BufferCleaner in fastify-server
 * Validates that BufferCleaner is properly integrated
 * Validates: Requirements 4.1, 4.4
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

console.log('\n=== BufferCleaner Integration Tests ===\n');

// Test 1: Verify BufferCleaner is imported
test('should import BufferCleaner module', () => {
  assert(
    serverCode.includes("const BufferCleaner = require('./BufferCleaner')"),
    'BufferCleaner should be imported'
  );
});

// Test 2: Verify BufferCleaner is instantiated with correct configuration
test('should create BufferCleaner instance with stateAggregator', () => {
  assert(
    serverCode.includes('new BufferCleaner(stateAggregator,'),
    'BufferCleaner should be instantiated with stateAggregator'
  );
});

test('should create BufferCleaner instance with timeoutMs: 300000', () => {
  assert(
    serverCode.includes('timeoutMs: 300000'),
    'BufferCleaner should have timeoutMs set to 300000 (5 minutes)'
  );
});

test('should pass fastify.log as logger to BufferCleaner', () => {
  // Check that logger: fastify.log appears in the BufferCleaner configuration
  const bufferCleanerSection = serverCode.substring(
    serverCode.indexOf('new BufferCleaner(stateAggregator,'),
    serverCode.indexOf('bufferCleaner.startCleaning')
  );
  assert(
    bufferCleanerSection.includes('logger: fastify.log'),
    'BufferCleaner should use fastify.log as logger'
  );
});

// Test 3: Verify cleaning is started with 60-second interval
test('should start cleaning with 60-second check interval', () => {
  assert(
    serverCode.includes('bufferCleaner.startCleaning(60000)'),
    'BufferCleaner should start cleaning with 60000ms interval'
  );
});

// Test 4: Verify BufferCleaner is initialized after MemoryMonitor
test('should initialize BufferCleaner after MemoryMonitor', () => {
  const memoryMonitorIndex = serverCode.indexOf('memoryMonitor.startMonitoring');
  const bufferCleanerIndex = serverCode.indexOf('new BufferCleaner');
  
  assert(
    bufferCleanerIndex > memoryMonitorIndex,
    'BufferCleaner should be initialized after MemoryMonitor'
  );
});

console.log('\n✓ All BufferCleaner integration tests passed!\n');
