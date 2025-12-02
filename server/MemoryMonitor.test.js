/**
 * Unit tests for MemoryMonitor class
 */

const MemoryMonitor = require('./MemoryMonitor');

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

function assertContains(str, substring, message) {
  if (!str.includes(substring)) {
    throw new Error(message || `Expected string to contain "${substring}", got "${str}"`);
  }
}

// Mock logger for testing
function createMockLogger() {
  const logs = { info: [], warn: [], error: [] };
  return {
    info: (msg) => logs.info.push(msg),
    warn: (msg) => logs.warn.push(msg),
    error: (msg) => logs.error.push(msg),
    logs
  };
}

// Test 1: Constructor uses default thresholds
test('should use default thresholds when not provided', () => {
  const monitor = new MemoryMonitor();
  assertEqual(monitor.warningThresholdMB, 350, 'Warning threshold should be 350');
  assertEqual(monitor.criticalThresholdMB, 400, 'Critical threshold should be 400');
});

// Test 2: Constructor uses provided thresholds
test('should use provided thresholds', () => {
  const monitor = new MemoryMonitor({
    warningThresholdMB: 300,
    criticalThresholdMB: 350
  });
  assertEqual(monitor.warningThresholdMB, 300, 'Warning threshold should be 300');
  assertEqual(monitor.criticalThresholdMB, 350, 'Critical threshold should be 350');
});

// Test 3: Constructor uses provided logger and callback
test('should use provided logger and callback', () => {
  const mockLogger = createMockLogger();
  const mockOnCritical = () => {};
  
  const monitor = new MemoryMonitor({
    logger: mockLogger,
    onCritical: mockOnCritical
  });
  
  assertEqual(monitor.logger, mockLogger, 'Logger should be set');
  assertEqual(monitor.onCritical, mockOnCritical, 'onCritical callback should be set');
});

// Test 4: getHeapUsageMB returns valid number
test('should return heap usage in megabytes', () => {
  const monitor = new MemoryMonitor();
  const heapUsageMB = monitor.getHeapUsageMB();
  
  assert(typeof heapUsageMB === 'number', 'Heap usage should be a number');
  assert(heapUsageMB > 0, 'Heap usage should be greater than 0');
});

// Test 5: check() logs info for normal memory usage
test('should log info for normal memory usage', () => {
  const mockLogger = createMockLogger();
  const monitor = new MemoryMonitor({
    warningThresholdMB: 10000, // Set very high to ensure normal level
    criticalThresholdMB: 20000,
    logger: mockLogger
  });

  const status = monitor.check();

  assertEqual(status.level, 'normal', 'Status level should be normal');
  assert(mockLogger.logs.info.length > 0, 'Should have logged info');
  assertEqual(mockLogger.logs.warn.length, 0, 'Should not have logged warning');
  assertEqual(mockLogger.logs.error.length, 0, 'Should not have logged error');
});

// Test 6: check() logs warning when exceeding warning threshold
test('should log warning when exceeding warning threshold', () => {
  const mockLogger = createMockLogger();
  const monitor = new MemoryMonitor({
    warningThresholdMB: 1, // Set very low to trigger warning
    criticalThresholdMB: 10000,
    logger: mockLogger
  });

  const diagnostics = {
    bufferSizes: {
      messageBuffer: 50,
      streamingPressure: { leftAtrial: 1000 }
    }
  };

  const status = monitor.check(diagnostics);

  assertEqual(status.level, 'warning', 'Status level should be warning');
  assert(mockLogger.logs.warn.length > 0, 'Should have logged warning');
  assertContains(mockLogger.logs.warn[0], 'Memory warning', 'Warning should mention memory warning');
  assertContains(mockLogger.logs.warn[0], 'Buffer sizes', 'Warning should include buffer sizes');
});

// Test 7: check() triggers critical callback when exceeding critical threshold
test('should trigger critical callback when exceeding critical threshold', () => {
  const mockLogger = createMockLogger();
  let criticalCalled = false;
  const mockOnCritical = () => { criticalCalled = true; };
  
  const monitor = new MemoryMonitor({
    warningThresholdMB: 1,
    criticalThresholdMB: 2, // Set very low to trigger critical
    logger: mockLogger,
    onCritical: mockOnCritical
  });

  const diagnostics = {
    bufferSizes: {
      messageBuffer: 100,
      streamingPressure: { leftAtrial: 1000 }
    }
  };

  const status = monitor.check(diagnostics);

  assertEqual(status.level, 'critical', 'Status level should be critical');
  assert(mockLogger.logs.error.length > 0, 'Should have logged error');
  assert(criticalCalled, 'Critical callback should have been called');
  assertContains(mockLogger.logs.error[0], 'Memory critical', 'Error should mention memory critical');
  assertContains(mockLogger.logs.error[0], 'Buffer sizes', 'Error should include buffer sizes');
  assertContains(mockLogger.logs.error[0], 'graceful restart', 'Error should mention graceful restart');
});

// Test 8: check() includes diagnostics in status
test('should include diagnostics in status', () => {
  const mockLogger = createMockLogger();
  const monitor = new MemoryMonitor({
    warningThresholdMB: 10000,
    logger: mockLogger
  });

  const diagnostics = {
    bufferSizes: { messageBuffer: 50 },
    connectionCount: 5
  };

  const status = monitor.check(diagnostics);

  assertEqual(JSON.stringify(status.diagnostics), JSON.stringify(diagnostics), 'Diagnostics should be included');
  assert(status.heapUsedMB > 0, 'heapUsedMB should be greater than 0');
  assert(status.heapTotalMB > 0, 'heapTotalMB should be greater than 0');
});

// Test 9: startMonitoring starts periodic checks
test('should start periodic monitoring', () => {
  const mockLogger = createMockLogger();
  const monitor = new MemoryMonitor({
    warningThresholdMB: 10000,
    logger: mockLogger
  });

  monitor.startMonitoring(100); // Use short interval for testing

  assert(monitor.monitoringInterval !== null, 'Monitoring interval should be set');
  assert(mockLogger.logs.info.some(log => log.includes('Memory monitoring started')), 
    'Should log monitoring started');
  
  monitor.stopMonitoring(); // Clean up
});

// Test 10: startMonitoring warns if already running
test('should not start monitoring if already running', () => {
  const mockLogger = createMockLogger();
  const monitor = new MemoryMonitor({
    warningThresholdMB: 10000,
    logger: mockLogger
  });

  monitor.startMonitoring(100);
  mockLogger.logs.info = []; // Clear logs
  
  monitor.startMonitoring(100);

  assert(mockLogger.logs.warn.some(log => log.includes('already running')), 
    'Should warn that monitoring is already running');
  
  monitor.stopMonitoring(); // Clean up
});

// Test 11: stopMonitoring stops periodic checks
test('should stop monitoring', () => {
  const mockLogger = createMockLogger();
  const monitor = new MemoryMonitor({
    warningThresholdMB: 10000,
    logger: mockLogger
  });

  monitor.startMonitoring(100);
  monitor.stopMonitoring();

  assertEqual(monitor.monitoringInterval, null, 'Monitoring interval should be null');
  assert(mockLogger.logs.info.some(log => log.includes('Memory monitoring stopped')), 
    'Should log monitoring stopped');
});

// Test 12: stopMonitoring handles not running gracefully
test('should handle stopMonitoring when not running', () => {
  const mockLogger = createMockLogger();
  const monitor = new MemoryMonitor({
    logger: mockLogger
  });

  // Should not throw error
  monitor.stopMonitoring();

  assert(!mockLogger.logs.info.some(log => log.includes('Memory monitoring stopped')), 
    'Should not log stopped message when not running');
});

console.log('\n✓ All MemoryMonitor tests passed!');
