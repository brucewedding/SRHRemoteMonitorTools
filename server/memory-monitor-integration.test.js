/**
 * Integration test for MemoryMonitor in fastify-server
 * Validates that MemoryMonitor is properly integrated
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

// Test 1: Verify MemoryMonitor is imported
test('should import MemoryMonitor module', () => {
  assert(
    serverCode.includes("const MemoryMonitor = require('./MemoryMonitor')"),
    'MemoryMonitor should be imported'
  );
});

// Test 2: Verify MemoryMonitor is instantiated with correct configuration
test('should create MemoryMonitor instance with warningThresholdMB: 350', () => {
  assert(
    serverCode.includes('warningThresholdMB: 350'),
    'MemoryMonitor should have warningThresholdMB set to 350'
  );
});

test('should create MemoryMonitor instance with criticalThresholdMB: 400', () => {
  assert(
    serverCode.includes('criticalThresholdMB: 400'),
    'MemoryMonitor should have criticalThresholdMB set to 400'
  );
});

test('should pass fastify.log as logger', () => {
  assert(
    serverCode.includes('logger: fastify.log'),
    'MemoryMonitor should use fastify.log as logger'
  );
});

test('should set onCritical callback to log error and exit', () => {
  assert(
    serverCode.includes("fastify.log.error('Memory threshold exceeded')") &&
    serverCode.includes('process.exit(1)'),
    'onCritical callback should log error and call process.exit(1)'
  );
});

// Test 3: Verify monitoring is started with 30-second interval
test('should start monitoring with 30-second interval', () => {
  assert(
    serverCode.includes('memoryMonitor.startMonitoring(30000)'),
    'MemoryMonitor should start monitoring with 30000ms interval'
  );
});

// Test 4: Verify old checkCriticalConditions function is removed
test('should not have checkCriticalConditions function', () => {
  assert(
    !serverCode.includes('function checkCriticalConditions'),
    'Old checkCriticalConditions function should be removed'
  );
  assert(
    !serverCode.includes('checkCriticalConditions()'),
    'checkCriticalConditions should not be called'
  );
});

console.log('\n✓ All MemoryMonitor integration tests passed!');
