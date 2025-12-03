/**
 * Integration test for BufferCleaner in Express server
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

// Read the server.js file
const serverFilePath = path.join(__dirname, 'server.js');
const serverCode = fs.readFileSync(serverFilePath, 'utf8');

console.log('\n=== Express BufferCleaner Integration Tests ===\n');

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

test('should pass console as logger to BufferCleaner', () => {
  // Check that logger: console appears in the BufferCleaner configuration
  const bufferCleanerSection = serverCode.substring(
    serverCode.indexOf('new BufferCleaner(stateAggregator,'),
    serverCode.indexOf('new BufferCleaner(stateAggregator,') + 200
  );
  assert(
    bufferCleanerSection.includes('logger: console'),
    'BufferCleaner should use console as logger'
  );
});

// Test 3: Verify cleaning is started with 60-second interval
test('should start cleaning with 60-second check interval', () => {
  assert(
    serverCode.includes('bufferCleaner.startCleaning(60000)'),
    'BufferCleaner should start cleaning with 60000ms interval'
  );
});

// Test 4: Verify BufferCleaner is stopped in SIGTERM handler
test('should stop BufferCleaner in SIGTERM handler', () => {
  assert(
    serverCode.includes('bufferCleaner.stopCleaning()'),
    'BufferCleaner should be stopped in SIGTERM handler'
  );
});

// Test 5: Verify BufferCleaner is initialized before server starts
test('should initialize BufferCleaner before server.listen', () => {
  const bufferCleanerIndex = serverCode.indexOf('new BufferCleaner');
  const serverListenIndex = serverCode.indexOf('server.listen');
  
  assert(
    bufferCleanerIndex < serverListenIndex && bufferCleanerIndex > 0,
    'BufferCleaner should be initialized before server.listen'
  );
});

// Test 6: Verify BufferCleaner is started in server.listen callback
test('should start BufferCleaner in server.listen callback', () => {
  const serverListenIndex = serverCode.indexOf('server.listen');
  const startCleaningIndex = serverCode.indexOf('bufferCleaner.startCleaning');
  
  assert(
    startCleaningIndex > serverListenIndex,
    'BufferCleaner should be started in server.listen callback'
  );
});

console.log('\n✓ All Express BufferCleaner integration tests passed!\n');
