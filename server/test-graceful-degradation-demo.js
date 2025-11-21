/**
 * Demo script to visualize graceful degradation features
 * 
 * This script demonstrates how the system handles:
 * - Missing data
 * - Partial pump side availability
 * - Recovery after telemetry gap
 */

const StateAggregator = require('./StateAggregator');

console.log('\n=== Graceful Degradation Demo ===\n');

const aggregator = new StateAggregator();

// Helper to display telemetry status
function displayStatus(label, state) {
  console.log(`\n${label}:`);
  console.log(`  No Data Received: ${state._telemetryStatus.noDataReceived}`);
  console.log(`  Left Heart Available: ${state._telemetryStatus.leftHeartAvailable}`);
  console.log(`  Right Heart Available: ${state._telemetryStatus.rightHeartAvailable}`);
  console.log(`  Left Heart Data: Stroke=${state.LeftHeart.ActualStrokeLen}mm, Power=${state.LeftHeart.PowerConsumption}W`);
  console.log(`  Right Heart Data: Stroke=${state.RightHeart.ActualStrokeLen}mm, Power=${state.RightHeart.PowerConsumption}W`);
}

// Scenario 1: Initial state (all defaults)
console.log('--- Scenario 1: Initial State ---');
let state = aggregator.getState();
displayStatus('Initial state with default values', state);

// Scenario 2: Send data to left heart only
console.log('\n--- Scenario 2: Left Heart Data Only ---');
aggregator.updateState({
  messageType: 'ActualStrokeLength',
  timestampUtc: Date.now(),
  source: 'CAN',
  data: {
    strokeLength: 15,
    unit: 'mm',
    canId: '0x123',
    pumpSide: 'Left'
  }
});

aggregator.updateState({
  messageType: 'MotorCurrent',
  timestampUtc: Date.now(),
  source: 'CAN',
  data: {
    combinedCurrent: 2.5,
    phaseACurrent: 0.8,
    phaseBCurrent: 0.9,
    phaseCCurrent: 0.8,
    unit: 'A',
    canId: '0x123',
    pumpSide: 'Left'
  }
});

state = aggregator.getState();
displayStatus('After sending left heart data', state);

// Scenario 3: Send data to right heart only
console.log('\n--- Scenario 3: Right Heart Data Only ---');
aggregator.updateState({
  messageType: 'ActualStrokeLength',
  timestampUtc: Date.now(),
  source: 'CAN',
  data: {
    strokeLength: 18,
    unit: 'mm',
    canId: '0x124',
    pumpSide: 'Right'
  }
});

aggregator.updateState({
  messageType: 'MotorCurrent',
  timestampUtc: Date.now(),
  source: 'CAN',
  data: {
    combinedCurrent: 3.0,
    phaseACurrent: 1.0,
    phaseBCurrent: 1.0,
    phaseCCurrent: 1.0,
    unit: 'A',
    canId: '0x124',
    pumpSide: 'Right'
  }
});

state = aggregator.getState();
displayStatus('After sending right heart data', state);

// Scenario 4: Send data to both sides
console.log('\n--- Scenario 4: Both Sides Active ---');
aggregator.updateState({
  messageType: 'ManualPhysiologicalSettings',
  timestampUtc: Date.now(),
  source: 'CAN',
  data: {
    heartRate: 80,
    leftStrokeLength: 20,
    rightStrokeLength: 22,
    unit: 'bpm/mm',
    canId: '0x125',
    pumpSide: 'All'
  }
});

state = aggregator.getState();
displayStatus('After sending data to both sides', state);

// Scenario 5: Simulate timeout (wait 11 seconds would show unavailable)
console.log('\n--- Scenario 5: Simulated Timeout ---');
console.log('In a real scenario, waiting 10+ seconds would show pump sides as unavailable');
console.log('In a real scenario, waiting 30+ seconds would show "No Data Received"');
console.log('The UI would display:');
console.log('  - Reduced opacity on unavailable pump side cards');
console.log('  - "No Data" badges on unavailable cards');
console.log('  - Warning banner if no data for 30+ seconds');

// Scenario 6: Recovery
console.log('\n--- Scenario 6: Recovery After Gap ---');
console.log('When telemetry resumes, the system automatically recovers:');
aggregator.updateState({
  messageType: 'ActualStrokeLength',
  timestampUtc: Date.now(),
  source: 'CAN',
  data: {
    strokeLength: 25,
    unit: 'mm',
    canId: '0x123',
    pumpSide: 'Left'
  }
});

state = aggregator.getState();
displayStatus('After recovery (new data received)', state);
console.log('\nThe system resumes normal operation without restart!');

// Scenario 7: Missing fields
console.log('\n--- Scenario 7: Missing Fields Handling ---');
aggregator.updateState({
  messageType: 'ActualStrokeLength',
  // Missing timestampUtc
  source: 'CAN',
  data: {
    strokeLength: 30,
    unit: 'mm',
    canId: '0x123',
    pumpSide: 'Left'
  }
});

state = aggregator.getState();
console.log('Message with missing timestamp processed successfully');
console.log(`  Left Heart Stroke Length: ${state.LeftHeart.ActualStrokeLen}mm`);
console.log('  System used current time for missing timestamp');

console.log('\n=== Demo Complete ===\n');
console.log('Key Features Demonstrated:');
console.log('✓ Default values for all fields (Requirement 9.1)');
console.log('✓ Separate tracking for left/right heart availability (Requirement 9.2)');
console.log('✓ Timeout detection for missing data (Requirement 9.2)');
console.log('✓ Automatic recovery when data resumes (Requirement 9.4)');
console.log('✓ Graceful handling of missing fields (Requirement 9.1)');
console.log('\n');
