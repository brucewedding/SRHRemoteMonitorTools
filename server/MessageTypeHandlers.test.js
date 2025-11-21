/**
 * Unit tests for MessageTypeHandlers
 */

const {
  MessageTypeHandler,
  MotorCurrentHandler,
  InstantaneousAtrialPressureHandler,
  StrokewiseAtrialPressureHandler,
  ManualPhysiologicalSettingsHandler,
  ActualStrokeLengthHandler,
  StrokewisePressureHandler,
  StreamingPressureHandler,
  TemperatureHandler,
  SupplyVoltageHandler,
  CPUDataHandler,
  AccelerometerHandler
} = require('./MessageTypeHandlers');
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
function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertThrows(fn, message) {
  try {
    fn();
    throw new Error(message || 'Expected function to throw');
  } catch (error) {
    if (error.message === message || error.message.includes('must be implemented')) {
      // Expected error
      return;
    }
    throw error;
  }
}

// Test 1: Base class throws error
test('MessageTypeHandler base class throws error when handle() is called', () => {
  const handler = new MessageTypeHandler();
  assertThrows(() => handler.handle({}, {}), 'handle() must be implemented by subclass');
});

// Test 2: MotorCurrentHandler updates left heart power consumption
test('MotorCurrentHandler updates left heart power consumption', () => {
  const aggregator = new StateAggregator();
  const handler = new MotorCurrentHandler();
  
  const data = {
    combinedCurrent: 5.0,
    pumpSide: 'Left'
  };

  handler.handle(data, aggregator);

  // Power = voltage * current (using default voltage of 12V)
  assertEqual(aggregator.state.LeftHeart.PowerConsumption, 60.0, 'Left heart power should be 60W');
});

// Test 3: MotorCurrentHandler updates right heart power consumption
test('MotorCurrentHandler updates right heart power consumption', () => {
  const aggregator = new StateAggregator();
  const handler = new MotorCurrentHandler();
  
  const data = {
    combinedCurrent: 3.0,
    pumpSide: 'Right'
  };

  handler.handle(data, aggregator);

  assertEqual(aggregator.state.RightHeart.PowerConsumption, 36.0, 'Right heart power should be 36W');
});

// Test 4: MotorCurrentHandler handles missing current value
test('MotorCurrentHandler handles missing current value', () => {
  const aggregator = new StateAggregator();
  const handler = new MotorCurrentHandler();
  
  const data = {
    pumpSide: 'Left'
  };

  handler.handle(data, aggregator);

  assertEqual(aggregator.state.LeftHeart.PowerConsumption, 0, 'Power should be 0 when current is missing');
});

// Test 5: InstantaneousAtrialPressureHandler updates left heart atrial pressure
test('InstantaneousAtrialPressureHandler updates left heart atrial pressure', () => {
  const aggregator = new StateAggregator();
  const handler = new InstantaneousAtrialPressureHandler();
  
  const data = {
    averagePressure: 10.5,
    pumpSide: 'Left'
  };

  handler.handle(data, aggregator);

  assertEqual(aggregator.state.LeftHeart.AtrialPressure, 10.5, 'Left atrial pressure should be 10.5');
});

// Test 6: InstantaneousAtrialPressureHandler updates right heart atrial pressure
test('InstantaneousAtrialPressureHandler updates right heart atrial pressure', () => {
  const aggregator = new StateAggregator();
  const handler = new InstantaneousAtrialPressureHandler();
  
  const data = {
    averagePressure: 8.2,
    pumpSide: 'Right'
  };

  handler.handle(data, aggregator);

  assertEqual(aggregator.state.RightHeart.AtrialPressure, 8.2, 'Right atrial pressure should be 8.2');
});

// Test 7: InstantaneousAtrialPressureHandler handles missing pressure value
test('InstantaneousAtrialPressureHandler handles missing pressure value', () => {
  const aggregator = new StateAggregator();
  const handler = new InstantaneousAtrialPressureHandler();
  
  const data = {
    pumpSide: 'Left'
  };

  handler.handle(data, aggregator);

  assertEqual(aggregator.state.LeftHeart.AtrialPressure, 0, 'Pressure should be 0 when missing');
});

// Test 8: StrokewiseAtrialPressureHandler updates all three pressure values for left heart
test('StrokewiseAtrialPressureHandler updates all three pressure values for left heart', () => {
  const aggregator = new StateAggregator();
  const handler = new StrokewiseAtrialPressureHandler();
  
  const data = {
    averagePressure: 15.0,
    minPressure: 10.0,
    maxPressure: 20.0,
    pumpSide: 'Left'
  };

  handler.handle(data, aggregator);

  assertEqual(aggregator.state.LeftHeart.IntPressure, 15.0, 'Avg pressure should be 15.0');
  assertEqual(aggregator.state.LeftHeart.IntPressureMin, 10.0, 'Min pressure should be 10.0');
  assertEqual(aggregator.state.LeftHeart.IntPressureMax, 20.0, 'Max pressure should be 20.0');
});

// Test 9: StrokewiseAtrialPressureHandler updates all three pressure values for right heart
test('StrokewiseAtrialPressureHandler updates all three pressure values for right heart', () => {
  const aggregator = new StateAggregator();
  const handler = new StrokewiseAtrialPressureHandler();
  
  const data = {
    averagePressure: 12.0,
    minPressure: 8.0,
    maxPressure: 16.0,
    pumpSide: 'Right'
  };

  handler.handle(data, aggregator);

  assertEqual(aggregator.state.RightHeart.IntPressure, 12.0, 'Avg pressure should be 12.0');
  assertEqual(aggregator.state.RightHeart.IntPressureMin, 8.0, 'Min pressure should be 8.0');
  assertEqual(aggregator.state.RightHeart.IntPressureMax, 16.0, 'Max pressure should be 16.0');
});

// Test 10: ManualPhysiologicalSettingsHandler updates heart rate and both stroke lengths
test('ManualPhysiologicalSettingsHandler updates heart rate and both stroke lengths', () => {
  const aggregator = new StateAggregator();
  const handler = new ManualPhysiologicalSettingsHandler();
  
  const data = {
    heartRate: 80,
    leftStrokeLength: 25.5,
    rightStrokeLength: 24.0
  };

  handler.handle(data, aggregator);

  assertEqual(aggregator.state.HeartRate, 80, 'Heart rate should be 80');
  assertEqual(aggregator.state.LeftHeart.TargetStrokeLen, 25.5, 'Left stroke length should be 25.5');
  assertEqual(aggregator.state.RightHeart.TargetStrokeLen, 24.0, 'Right stroke length should be 24.0');
});

// Test 11: ManualPhysiologicalSettingsHandler updates only heart rate when stroke lengths are missing
test('ManualPhysiologicalSettingsHandler updates only heart rate when stroke lengths are missing', () => {
  const aggregator = new StateAggregator();
  const handler = new ManualPhysiologicalSettingsHandler();
  
  const data = {
    heartRate: 75
  };

  handler.handle(data, aggregator);

  assertEqual(aggregator.state.HeartRate, 75, 'Heart rate should be 75');
  assertEqual(aggregator.state.LeftHeart.TargetStrokeLen, 0, 'Left stroke length should remain 0');
  assertEqual(aggregator.state.RightHeart.TargetStrokeLen, 0, 'Right stroke length should remain 0');
});

// Test 12: ActualStrokeLengthHandler updates left heart actual stroke length
test('ActualStrokeLengthHandler updates left heart actual stroke length', () => {
  const aggregator = new StateAggregator();
  const handler = new ActualStrokeLengthHandler();
  
  const data = {
    strokeLength: 26.3,
    pumpSide: 'Left'
  };

  handler.handle(data, aggregator);

  assertEqual(aggregator.state.LeftHeart.ActualStrokeLen, 26.3, 'Left actual stroke length should be 26.3');
});

// Test 13: ActualStrokeLengthHandler updates right heart actual stroke length
test('ActualStrokeLengthHandler updates right heart actual stroke length', () => {
  const aggregator = new StateAggregator();
  const handler = new ActualStrokeLengthHandler();
  
  const data = {
    strokeLength: 23.8,
    pumpSide: 'Right'
  };

  handler.handle(data, aggregator);

  assertEqual(aggregator.state.RightHeart.ActualStrokeLen, 23.8, 'Right actual stroke length should be 23.8');
});

// Test 14: StateAggregator integration - MotorCurrent
test('StateAggregator updateState uses correct handler for MotorCurrent', () => {
  const aggregator = new StateAggregator();
  
  const message = {
    messageType: 'MotorCurrent',
    timestampUtc: 1234567890,
    source: 'CAN',
    data: {
      combinedCurrent: 4.0,
      pumpSide: 'Left'
    }
  };

  aggregator.updateState(message);

  assertEqual(aggregator.state.LeftHeart.PowerConsumption, 48.0, 'Power should be 48W');
  assertEqual(aggregator.state.Timestamp, 1234567890, 'Timestamp should be updated');
});

// Test 15: StateAggregator integration - InstantaneousAtrialPressure
test('StateAggregator updateState uses correct handler for InstantaneousAtrialPressure', () => {
  const aggregator = new StateAggregator();
  
  const message = {
    messageType: 'InstantaneousAtrialPressure',
    timestampUtc: 1234567891,
    source: 'CAN',
    data: {
      averagePressure: 12.5,
      pumpSide: 'Right'
    }
  };

  aggregator.updateState(message);

  assertEqual(aggregator.state.RightHeart.AtrialPressure, 12.5, 'Right atrial pressure should be 12.5');
});

// Test 16: StateAggregator integration - ManualPhysiologicalSettings
test('StateAggregator updateState uses correct handler for ManualPhysiologicalSettings', () => {
  const aggregator = new StateAggregator();
  
  const message = {
    messageType: 'ManualPhysiologicalSettings',
    timestampUtc: 1234567892,
    source: 'CAN',
    data: {
      heartRate: 85,
      leftStrokeLength: 27.0,
      rightStrokeLength: 26.0
    }
  };

  aggregator.updateState(message);

  assertEqual(aggregator.state.HeartRate, 85, 'Heart rate should be 85');
  assertEqual(aggregator.state.LeftHeart.TargetStrokeLen, 27.0, 'Left stroke length should be 27.0');
  assertEqual(aggregator.state.RightHeart.TargetStrokeLen, 26.0, 'Right stroke length should be 26.0');
});

// Test 17: StrokewisePressureHandler maps leftAtrial to LeftHeart.MedicalPressure
test('StrokewisePressureHandler maps leftAtrial to LeftHeart.MedicalPressure', () => {
  const aggregator = new StateAggregator();
  const handler = new StrokewisePressureHandler();
  
  const data = {
    leftAtrial: {
      average: 10.5,
      min: 8.0,
      max: 13.0,
      unit: 'mmHg'
    },
    rightAtrial: null,
    aortic: null,
    pulmonaryArterial: null
  };

  handler.handle(data, aggregator);

  assertEqual(aggregator.state.LeftHeart.MedicalPressure.PrimaryValue, 10.5, 'Left atrial average should be 10.5');
  assertEqual(aggregator.state.LeftHeart.MedicalPressure.min, 8.0, 'Left atrial min should be 8.0');
  assertEqual(aggregator.state.LeftHeart.MedicalPressure.max, 13.0, 'Left atrial max should be 13.0');
  assertEqual(aggregator.state.LeftHeart.MedicalPressure.unit, 'mmHg', 'Unit should be mmHg');
});

// Test 18: StrokewisePressureHandler maps rightAtrial to RightHeart.MedicalPressure
test('StrokewisePressureHandler maps rightAtrial to RightHeart.MedicalPressure', () => {
  const aggregator = new StateAggregator();
  const handler = new StrokewisePressureHandler();
  
  const data = {
    leftAtrial: null,
    rightAtrial: {
      average: 9.2,
      min: 7.5,
      max: 11.0,
      unit: 'mmHg'
    },
    aortic: null,
    pulmonaryArterial: null
  };

  handler.handle(data, aggregator);

  assertEqual(aggregator.state.RightHeart.MedicalPressure.PrimaryValue, 9.2, 'Right atrial average should be 9.2');
  assertEqual(aggregator.state.RightHeart.MedicalPressure.min, 7.5, 'Right atrial min should be 7.5');
  assertEqual(aggregator.state.RightHeart.MedicalPressure.max, 11.0, 'Right atrial max should be 11.0');
});

// Test 19: StrokewisePressureHandler maps pulmonaryArterial to PAPSensor
test('StrokewisePressureHandler maps pulmonaryArterial to PAPSensor', () => {
  const aggregator = new StateAggregator();
  const handler = new StrokewisePressureHandler();
  
  const data = {
    leftAtrial: null,
    rightAtrial: null,
    aortic: null,
    pulmonaryArterial: {
      average: 25.0,
      min: 20.0,
      max: 30.0,
      unit: 'mmHg'
    }
  };

  handler.handle(data, aggregator);

  assertEqual(aggregator.state.PAPSensor.PrimaryValue, 25.0, 'PAP average should be 25.0');
  assertEqual(aggregator.state.PAPSensor.min, 20.0, 'PAP min should be 20.0');
  assertEqual(aggregator.state.PAPSensor.max, 30.0, 'PAP max should be 30.0');
});

// Test 20: StrokewisePressureHandler maps aortic to AoPSensor
test('StrokewisePressureHandler maps aortic to AoPSensor', () => {
  const aggregator = new StateAggregator();
  const handler = new StrokewisePressureHandler();
  
  const data = {
    leftAtrial: null,
    rightAtrial: null,
    aortic: {
      average: 120.0,
      min: 80.0,
      max: 140.0,
      unit: 'mmHg'
    },
    pulmonaryArterial: null
  };

  handler.handle(data, aggregator);

  assertEqual(aggregator.state.AoPSensor.PrimaryValue, 120.0, 'AoP average should be 120.0');
  assertEqual(aggregator.state.AoPSensor.min, 80.0, 'AoP min should be 80.0');
  assertEqual(aggregator.state.AoPSensor.max, 140.0, 'AoP max should be 140.0');
});

// Test 21: StrokewisePressureHandler handles all pressure fields simultaneously
test('StrokewisePressureHandler handles all pressure fields simultaneously', () => {
  const aggregator = new StateAggregator();
  const handler = new StrokewisePressureHandler();
  
  const data = {
    leftAtrial: { average: 10.0, min: 8.0, max: 12.0, unit: 'mmHg' },
    rightAtrial: { average: 9.0, min: 7.0, max: 11.0, unit: 'mmHg' },
    aortic: { average: 120.0, min: 80.0, max: 140.0, unit: 'mmHg' },
    pulmonaryArterial: { average: 25.0, min: 20.0, max: 30.0, unit: 'mmHg' }
  };

  handler.handle(data, aggregator);

  assertEqual(aggregator.state.LeftHeart.MedicalPressure.PrimaryValue, 10.0, 'Left atrial should be mapped');
  assertEqual(aggregator.state.RightHeart.MedicalPressure.PrimaryValue, 9.0, 'Right atrial should be mapped');
  assertEqual(aggregator.state.AoPSensor.PrimaryValue, 120.0, 'Aortic should be mapped');
  assertEqual(aggregator.state.PAPSensor.PrimaryValue, 25.0, 'Pulmonary arterial should be mapped');
});

// Test 22: StreamingPressureHandler buffers pulmonary arterial streaming data
test('StreamingPressureHandler buffers pulmonary arterial streaming data', () => {
  const aggregator = new StateAggregator();
  const handler = new StreamingPressureHandler();
  
  const data = {
    leftAtrial: null,
    rightAtrial: null,
    leftVentricular: null,
    rightVentricular: null,
    aortic: null,
    pulmonaryArterial: [25.0, 26.0, 24.5, 25.5, 26.2],
    sampleRate: 1000,
    unit: 'mmHg'
  };

  handler.handle(data, aggregator);

  assertEqual(aggregator.state.StreamingPressure.pulmonaryArterial.length, 5, 'Should buffer 5 samples');
  assertEqual(aggregator.state.StreamingPressure.pulmonaryArterial[0], 25.0, 'First sample should be 25.0');
  assertEqual(aggregator.state.StreamingPressure.sampleRate, 1000, 'Sample rate should be 1000');
  assertEqual(aggregator.state.StreamingPressure.unit, 'mmHg', 'Unit should be mmHg');
});

// Test 23: StreamingPressureHandler buffers left atrial streaming data
test('StreamingPressureHandler buffers left atrial streaming data', () => {
  const aggregator = new StateAggregator();
  const handler = new StreamingPressureHandler();
  
  const data = {
    leftAtrial: [10.0, 11.0, 10.5],
    rightAtrial: null,
    leftVentricular: null,
    rightVentricular: null,
    aortic: null,
    pulmonaryArterial: null,
    sampleRate: 500,
    unit: 'mmHg'
  };

  handler.handle(data, aggregator);

  assertEqual(aggregator.state.StreamingPressure.leftAtrial.length, 3, 'Should buffer 3 samples');
  assertEqual(aggregator.state.StreamingPressure.leftAtrial[1], 11.0, 'Second sample should be 11.0');
});

// Test 24: StreamingPressureHandler handles multiple pressure channels
test('StreamingPressureHandler handles multiple pressure channels', () => {
  const aggregator = new StateAggregator();
  const handler = new StreamingPressureHandler();
  
  const data = {
    leftAtrial: [10.0, 11.0],
    rightAtrial: [9.0, 10.0],
    leftVentricular: [120.0, 125.0],
    rightVentricular: [25.0, 26.0],
    aortic: [120.0, 122.0],
    pulmonaryArterial: [25.0, 26.0],
    sampleRate: 1000,
    unit: 'mmHg'
  };

  handler.handle(data, aggregator);

  assertEqual(aggregator.state.StreamingPressure.leftAtrial.length, 2, 'Left atrial should have 2 samples');
  assertEqual(aggregator.state.StreamingPressure.rightAtrial.length, 2, 'Right atrial should have 2 samples');
  assertEqual(aggregator.state.StreamingPressure.leftVentricular.length, 2, 'Left ventricular should have 2 samples');
  assertEqual(aggregator.state.StreamingPressure.rightVentricular.length, 2, 'Right ventricular should have 2 samples');
  assertEqual(aggregator.state.StreamingPressure.aortic.length, 2, 'Aortic should have 2 samples');
  assertEqual(aggregator.state.StreamingPressure.pulmonaryArterial.length, 2, 'Pulmonary arterial should have 2 samples');
});

// Test 25: StateAggregator integration - StrokewisePressure
test('StateAggregator updateState uses correct handler for StrokewisePressure', () => {
  const aggregator = new StateAggregator();
  
  const message = {
    messageType: 'StrokewisePressure',
    timestampUtc: 1234567893,
    source: 'UDP',
    data: {
      leftAtrial: { average: 10.5, min: 8.0, max: 13.0, unit: 'mmHg' },
      rightAtrial: null,
      aortic: { average: 120.0, min: 80.0, max: 140.0, unit: 'mmHg' },
      pulmonaryArterial: null
    }
  };

  aggregator.updateState(message);

  assertEqual(aggregator.state.LeftHeart.MedicalPressure.PrimaryValue, 10.5, 'Left atrial should be mapped');
  assertEqual(aggregator.state.AoPSensor.PrimaryValue, 120.0, 'Aortic should be mapped');
  assertEqual(aggregator.state.Timestamp, 1234567893, 'Timestamp should be updated');
});

// Test 26: StateAggregator integration - StreamingPressure
test('StateAggregator updateState uses correct handler for StreamingPressure', () => {
  const aggregator = new StateAggregator();
  
  const message = {
    messageType: 'StreamingPressure',
    timestampUtc: 1234567894,
    source: 'UDP',
    data: {
      leftAtrial: null,
      rightAtrial: null,
      leftVentricular: null,
      rightVentricular: null,
      aortic: null,
      pulmonaryArterial: [25.0, 26.0, 24.5],
      sampleRate: 1000,
      unit: 'mmHg'
    }
  };

  aggregator.updateState(message);

  assertEqual(aggregator.state.StreamingPressure.pulmonaryArterial.length, 3, 'Should buffer 3 samples');
  assertEqual(aggregator.state.Timestamp, 1234567894, 'Timestamp should be updated');
});

// Test 27: TemperatureHandler updates temperature with normal value
test('TemperatureHandler updates temperature with normal value', () => {
  const aggregator = new StateAggregator();
  const handler = new TemperatureHandler();
  
  const data = {
    temp1: 45.0,
    temp2: 46.5,
    temp3: 44.8,
    temp4: 45.2
  };

  handler.handle(data, aggregator);

  assertEqual(aggregator.state.StatusData.Temperature.Text, '45.4', 'Temperature should be average of all sensors');
  assertEqual(aggregator.state.StatusData.Temperature.Color, 'badge-success', 'Color should be success for normal temp');
});

// Test 28: TemperatureHandler triggers warning for high temperature
test('TemperatureHandler triggers warning for high temperature', () => {
  const aggregator = new StateAggregator();
  const handler = new TemperatureHandler();
  
  const data = {
    temp1: 65.0,
    temp2: 66.0,
    temp3: 64.5,
    temp4: 65.5
  };

  handler.handle(data, aggregator);

  // Average = (65.0 + 66.0 + 64.5 + 65.5) / 4 = 261 / 4 = 65.25
  const expectedTemp = ((65.0 + 66.0 + 64.5 + 65.5) / 4).toFixed(1);
  assertEqual(aggregator.state.StatusData.Temperature.Text, expectedTemp, 'Temperature should be average');
  assertEqual(aggregator.state.StatusData.Temperature.Color, 'badge-error', 'Color should be error for high temp (>60°C)');
});

// Test 29: SupplyVoltageHandler updates voltage with normal value
test('SupplyVoltageHandler updates voltage with normal value', () => {
  const aggregator = new StateAggregator();
  const handler = new SupplyVoltageHandler();
  
  const data = {
    meanSupplyVoltage: 14.5,
    minSupplyVoltage: 14.0,
    maxSupplyVoltage: 15.0
  };

  handler.handle(data, aggregator);

  assertEqual(aggregator.state.StatusData.Voltage.Text, '14.5', 'Voltage should be mean supply voltage');
  assertEqual(aggregator.state.StatusData.Voltage.Color, 'badge-success', 'Color should be success for normal voltage (12-18V)');
});

// Test 30: SupplyVoltageHandler triggers warning for low voltage
test('SupplyVoltageHandler triggers warning for low voltage', () => {
  const aggregator = new StateAggregator();
  const handler = new SupplyVoltageHandler();
  
  const data = {
    meanSupplyVoltage: 10.5
  };

  handler.handle(data, aggregator);

  assertEqual(aggregator.state.StatusData.Voltage.Text, '10.5', 'Voltage should be 10.5');
  assertEqual(aggregator.state.StatusData.Voltage.Color, 'badge-warning', 'Color should be warning for low voltage (<12V)');
});

// Test 31: SupplyVoltageHandler triggers warning for high voltage
test('SupplyVoltageHandler triggers warning for high voltage', () => {
  const aggregator = new StateAggregator();
  const handler = new SupplyVoltageHandler();
  
  const data = {
    meanSupplyVoltage: 19.5
  };

  handler.handle(data, aggregator);

  assertEqual(aggregator.state.StatusData.Voltage.Text, '19.5', 'Voltage should be 19.5');
  assertEqual(aggregator.state.StatusData.Voltage.Color, 'badge-warning', 'Color should be warning for high voltage (>18V)');
});

// Test 32: CPUDataHandler updates CPU load
test('CPUDataHandler updates CPU load', () => {
  const aggregator = new StateAggregator();
  const handler = new CPUDataHandler();
  
  const data = {
    cpuLoad: 45.7
  };

  handler.handle(data, aggregator);

  assertEqual(aggregator.state.StatusData.CPULoad.Text, '46', 'CPU load should be rounded to integer');
  assertEqual(aggregator.state.StatusData.CPULoad.Color, 'badge-info', 'Color should be info');
});

// Test 33: AccelerometerHandler calculates magnitude with normal value
test('AccelerometerHandler calculates magnitude with normal value', () => {
  const aggregator = new StateAggregator();
  const handler = new AccelerometerHandler();
  
  const data = {
    xAxis: 0.5,
    yAxis: 0.3,
    zAxis: 0.4
  };

  handler.handle(data, aggregator);

  // Magnitude = sqrt(0.5^2 + 0.3^2 + 0.4^2) = sqrt(0.25 + 0.09 + 0.16) = sqrt(0.5) ≈ 0.71
  const expectedMagnitude = Math.sqrt(0.5 * 0.5 + 0.3 * 0.3 + 0.4 * 0.4).toFixed(2);
  assertEqual(aggregator.state.StatusData.Accelerometer.Text, expectedMagnitude, 'Magnitude should be calculated correctly');
  assertEqual(aggregator.state.StatusData.Accelerometer.Color, 'badge-success', 'Color should be success for normal acceleration (<2g)');
});

// Test 34: AccelerometerHandler triggers warning for high acceleration
test('AccelerometerHandler triggers warning for high acceleration', () => {
  const aggregator = new StateAggregator();
  const handler = new AccelerometerHandler();
  
  const data = {
    xAxis: 1.5,
    yAxis: 1.2,
    zAxis: 1.0
  };

  handler.handle(data, aggregator);

  // Magnitude = sqrt(1.5^2 + 1.2^2 + 1.0^2) = sqrt(2.25 + 1.44 + 1.0) = sqrt(4.69) ≈ 2.17
  const expectedMagnitude = Math.sqrt(1.5 * 1.5 + 1.2 * 1.2 + 1.0 * 1.0).toFixed(2);
  assertEqual(aggregator.state.StatusData.Accelerometer.Text, expectedMagnitude, 'Magnitude should be calculated correctly');
  assertEqual(aggregator.state.StatusData.Accelerometer.Color, 'badge-error', 'Color should be error for high acceleration (>2g)');
});

// Test 35: StateAggregator integration - Temperature
test('StateAggregator updateState uses correct handler for Temperature', () => {
  const aggregator = new StateAggregator();
  
  const message = {
    messageType: 'Temperature',
    timestampUtc: 1234567895,
    source: 'CAN',
    data: {
      temp1: 50.0,
      temp2: 51.0,
      temp3: 49.5,
      temp4: 50.5
    }
  };

  aggregator.updateState(message);

  // Average = (50.0 + 51.0 + 49.5 + 50.5) / 4 = 201 / 4 = 50.25
  const expectedTemp = ((50.0 + 51.0 + 49.5 + 50.5) / 4).toFixed(1);
  assertEqual(aggregator.state.StatusData.Temperature.Text, expectedTemp, 'Temperature should be updated');
  assertEqual(aggregator.state.StatusData.Temperature.Color, 'badge-success', 'Color should be success');
  assertEqual(aggregator.state.Timestamp, 1234567895, 'Timestamp should be updated');
});

// Test 36: StateAggregator integration - SupplyVoltage
test('StateAggregator updateState uses correct handler for SupplyVoltage', () => {
  const aggregator = new StateAggregator();
  
  const message = {
    messageType: 'SupplyVoltage',
    timestampUtc: 1234567896,
    source: 'CAN',
    data: {
      meanSupplyVoltage: 15.0
    }
  };

  aggregator.updateState(message);

  assertEqual(aggregator.state.StatusData.Voltage.Text, '15.0', 'Voltage should be updated');
  assertEqual(aggregator.state.StatusData.Voltage.Color, 'badge-success', 'Color should be success');
});

// Test 37: StateAggregator integration - CPUData
test('StateAggregator updateState uses correct handler for CPUData', () => {
  const aggregator = new StateAggregator();
  
  const message = {
    messageType: 'CPUData',
    timestampUtc: 1234567897,
    source: 'CAN',
    data: {
      cpuLoad: 35.8
    }
  };

  aggregator.updateState(message);

  assertEqual(aggregator.state.StatusData.CPULoad.Text, '36', 'CPU load should be updated');
  assertEqual(aggregator.state.StatusData.CPULoad.Color, 'badge-info', 'Color should be info');
});

// Test 38: StateAggregator integration - Accelerometer
test('StateAggregator updateState uses correct handler for Accelerometer', () => {
  const aggregator = new StateAggregator();
  
  const message = {
    messageType: 'Accelerometer',
    timestampUtc: 1234567898,
    source: 'CAN',
    data: {
      xAxis: 0.8,
      yAxis: 0.6,
      zAxis: 0.5
    }
  };

  aggregator.updateState(message);

  const expectedMagnitude = Math.sqrt(0.8 * 0.8 + 0.6 * 0.6 + 0.5 * 0.5).toFixed(2);
  assertEqual(aggregator.state.StatusData.Accelerometer.Text, expectedMagnitude, 'Accelerometer magnitude should be updated');
  assertEqual(aggregator.state.StatusData.Accelerometer.Color, 'badge-success', 'Color should be success');
});

console.log('\n✓ All MessageTypeHandlers tests passed!');
