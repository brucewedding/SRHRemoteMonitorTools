/**
 * Tests for BufferCleaner class
 * 
 * Validates: Requirements 4.1, 4.2, 4.3
 */

const BufferCleaner = require('./BufferCleaner');
const StateAggregator = require('./StateAggregator');
const CircularBuffer = require('./CircularBuffer');

/**
 * Simple test runner
 */
function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    return true;
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  ${error.message}`);
    return false;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Test counter
let testCount = 0;
let passCount = 0;

console.log('\n=== BufferCleaner Tests ===\n');

// Test 1: Constructor initializes with default values
if (test('Constructor initializes with default values', () => {
  testCount++;
  const aggregator = new StateAggregator();
  const cleaner = new BufferCleaner(aggregator);
  
  assert(cleaner.stateAggregator === aggregator, 'Should store state aggregator');
  assert(cleaner.timeoutMs === 300000, 'Should have default timeout of 5 minutes');
  assert(cleaner.cleaningInterval === null, 'Should not have active interval initially');
  passCount++;
}));

// Test 2: Constructor accepts custom timeout
if (test('Constructor accepts custom timeout', () => {
  testCount++;
  const aggregator = new StateAggregator();
  const cleaner = new BufferCleaner(aggregator, { timeoutMs: 60000 });
  
  assert(cleaner.timeoutMs === 60000, 'Should use custom timeout');
  passCount++;
}));

// Test 3: checkAndClean returns false when no StreamingPressure exists
if (test('checkAndClean returns false when no StreamingPressure exists', () => {
  testCount++;
  const aggregator = new StateAggregator();
  const cleaner = new BufferCleaner(aggregator);
  
  // Remove StreamingPressure from state
  delete aggregator.state.StreamingPressure;
  
  const result = cleaner.checkAndClean();
  assert(result === false, 'Should return false when no StreamingPressure');
  passCount++;
}));

// Test 4: checkAndClean returns false when data is recent
if (test('checkAndClean returns false when data is recent', () => {
  testCount++;
  const aggregator = new StateAggregator();
  const cleaner = new BufferCleaner(aggregator, { timeoutMs: 300000 });
  
  // Initialize StreamingPressure with recent data
  aggregator.state.StreamingPressure = {
    leftAtrial: new CircularBuffer(1000),
    rightAtrial: null,
    leftVentricular: null,
    rightVentricular: null,
    aortic: null,
    pulmonaryArterial: null,
    sampleRate: 100,
    unit: 'mmHg',
    lastUpdate: Date.now() // Recent update
  };
  
  const result = cleaner.checkAndClean();
  assert(result === false, 'Should return false when data is recent');
  assert(aggregator.state.StreamingPressure.leftAtrial !== null, 'Should not clear recent buffers');
  passCount++;
}));

// Test 5: checkAndClean clears buffers when data is stale
if (test('checkAndClean clears buffers when data is stale', () => {
  testCount++;
  const aggregator = new StateAggregator();
  const mockLogger = { info: () => {} }; // Silent logger
  const cleaner = new BufferCleaner(aggregator, { timeoutMs: 1000, logger: mockLogger });
  
  // Initialize StreamingPressure with stale data
  aggregator.state.StreamingPressure = {
    leftAtrial: new CircularBuffer(1000),
    rightAtrial: new CircularBuffer(1000),
    leftVentricular: null,
    rightVentricular: null,
    aortic: null,
    pulmonaryArterial: null,
    sampleRate: 100,
    unit: 'mmHg',
    lastUpdate: Date.now() - 2000 // 2 seconds ago (stale)
  };
  
  const result = cleaner.checkAndClean();
  assert(result === true, 'Should return true when cleanup performed');
  assert(aggregator.state.StreamingPressure.leftAtrial === null, 'Should clear leftAtrial buffer');
  assert(aggregator.state.StreamingPressure.rightAtrial === null, 'Should clear rightAtrial buffer');
  passCount++;
}));

// Test 6: clearStreamingBuffers preserves other data
if (test('clearStreamingBuffers preserves other data', () => {
  testCount++;
  const aggregator = new StateAggregator();
  const mockLogger = { info: () => {} };
  const cleaner = new BufferCleaner(aggregator, { logger: mockLogger });
  
  // Initialize StreamingPressure with data
  aggregator.state.StreamingPressure = {
    leftAtrial: new CircularBuffer(1000),
    rightAtrial: new CircularBuffer(1000),
    leftVentricular: null,
    rightVentricular: null,
    aortic: null,
    pulmonaryArterial: null,
    sampleRate: 100,
    unit: 'mmHg',
    lastUpdate: Date.now()
  };
  
  // Store original values
  const originalSampleRate = aggregator.state.StreamingPressure.sampleRate;
  const originalUnit = aggregator.state.StreamingPressure.unit;
  
  cleaner.clearStreamingBuffers();
  
  assert(aggregator.state.StreamingPressure.leftAtrial === null, 'Should clear leftAtrial buffer');
  assert(aggregator.state.StreamingPressure.rightAtrial === null, 'Should clear rightAtrial buffer');
  assert(aggregator.state.StreamingPressure.sampleRate === originalSampleRate, 'Should preserve sampleRate');
  assert(aggregator.state.StreamingPressure.unit === originalUnit, 'Should preserve unit');
  passCount++;
}));

// Test 7: clearStreamingBuffers handles missing StreamingPressure gracefully
if (test('clearStreamingBuffers handles missing StreamingPressure gracefully', () => {
  testCount++;
  const aggregator = new StateAggregator();
  const cleaner = new BufferCleaner(aggregator);
  
  delete aggregator.state.StreamingPressure;
  
  // Should not throw
  cleaner.clearStreamingBuffers();
  passCount++;
}));

// Test 8: clearStreamingBuffers clears all channel buffers
if (test('clearStreamingBuffers clears all channel buffers', () => {
  testCount++;
  const aggregator = new StateAggregator();
  const mockLogger = { info: () => {} };
  const cleaner = new BufferCleaner(aggregator, { logger: mockLogger });
  
  // Initialize all channels with buffers
  aggregator.state.StreamingPressure = {
    leftAtrial: new CircularBuffer(1000),
    rightAtrial: new CircularBuffer(1000),
    leftVentricular: new CircularBuffer(1000),
    rightVentricular: new CircularBuffer(1000),
    aortic: new CircularBuffer(1000),
    pulmonaryArterial: new CircularBuffer(1000),
    sampleRate: 100,
    unit: 'mmHg',
    lastUpdate: Date.now()
  };
  
  cleaner.clearStreamingBuffers();
  
  assert(aggregator.state.StreamingPressure.leftAtrial === null, 'Should clear leftAtrial');
  assert(aggregator.state.StreamingPressure.rightAtrial === null, 'Should clear rightAtrial');
  assert(aggregator.state.StreamingPressure.leftVentricular === null, 'Should clear leftVentricular');
  assert(aggregator.state.StreamingPressure.rightVentricular === null, 'Should clear rightVentricular');
  assert(aggregator.state.StreamingPressure.aortic === null, 'Should clear aortic');
  assert(aggregator.state.StreamingPressure.pulmonaryArterial === null, 'Should clear pulmonaryArterial');
  passCount++;
}));

// Test 9: startCleaning creates interval
if (test('startCleaning creates interval', () => {
  testCount++;
  const aggregator = new StateAggregator();
  const mockLogger = { info: () => {} };
  const cleaner = new BufferCleaner(aggregator, { logger: mockLogger });
  
  cleaner.startCleaning(1000);
  
  assert(cleaner.cleaningInterval !== null, 'Should create cleaning interval');
  
  cleaner.stopCleaning();
  passCount++;
}));

// Test 10: stopCleaning clears interval
if (test('stopCleaning clears interval', () => {
  testCount++;
  const aggregator = new StateAggregator();
  const mockLogger = { info: () => {} };
  const cleaner = new BufferCleaner(aggregator, { logger: mockLogger });
  
  cleaner.startCleaning(1000);
  assert(cleaner.cleaningInterval !== null, 'Should have interval after start');
  
  cleaner.stopCleaning();
  assert(cleaner.cleaningInterval === null, 'Should clear interval after stop');
  passCount++;
}));

// Test 11: startCleaning stops previous interval
if (test('startCleaning stops previous interval', () => {
  testCount++;
  const aggregator = new StateAggregator();
  const mockLogger = { info: () => {} };
  const cleaner = new BufferCleaner(aggregator, { logger: mockLogger });
  
  cleaner.startCleaning(1000);
  const firstInterval = cleaner.cleaningInterval;
  
  cleaner.startCleaning(2000);
  const secondInterval = cleaner.cleaningInterval;
  
  assert(firstInterval !== secondInterval, 'Should create new interval');
  assert(cleaner.cleaningInterval !== null, 'Should have active interval');
  
  cleaner.stopCleaning();
  passCount++;
}));

// Summary
console.log(`\n${passCount === testCount ? '✓' : '✗'} BufferCleaner tests completed`);
console.log(`  ${passCount}/${testCount} tests passed\n`);

process.exit(passCount === testCount ? 0 : 1);
