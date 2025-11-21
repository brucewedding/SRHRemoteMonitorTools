/**
 * MessageTypeHandlers - Process specific message types and update state
 * 
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
 */

/**
 * Base class for message type handlers
 */
class MessageTypeHandler {
  /**
   * Handle a specific message type
   * @param {Object} data - Message data field
   * @param {Object} aggregator - State aggregator instance
   */
  handle(data, aggregator) {
    throw new Error('handle() must be implemented by subclass');
  }
}

/**
 * Handler for MotorCurrent messages
 * Extracts power consumption data for the specified pump side
 * 
 * Validates: Requirement 2.1
 */
class MotorCurrentHandler extends MessageTypeHandler {
  /**
   * Handle MotorCurrent message
   * @param {Object} data - Message data field
   * @param {Object} aggregator - State aggregator instance
   */
  handle(data, aggregator) {
    const state = aggregator.state;
    const pumpSide = data.pumpSide;
    
    // Extract current value
    const current = data.combinedCurrent || 0;
    
    // For power calculation, we need voltage
    // We'll store the current and calculate power when voltage is available
    // For now, we'll use a simplified approach assuming voltage is available in state
    
    // Get voltage from state (if available from previous SupplyVoltage message)
    let voltage = 0;
    if (pumpSide === 'Left' && state.LeftHeart) {
      // Try to get voltage from StatusData or use a default
      voltage = this.extractVoltageFromState(state, 'Left');
    } else if (pumpSide === 'Right' && state.RightHeart) {
      voltage = this.extractVoltageFromState(state, 'Right');
    }
    
    // Calculate power: P = V * I
    const power = voltage * current;
    
    // Route to appropriate pump side
    if (pumpSide === 'Left') {
      state.LeftHeart.PowerConsumption = power;
    } else if (pumpSide === 'Right') {
      state.RightHeart.PowerConsumption = power;
    }
  }
  
  /**
   * Extract voltage from state for power calculation
   * @param {Object} state - Current state
   * @param {string} side - Pump side
   * @returns {number} Voltage value
   * @private
   */
  extractVoltageFromState(state, side) {
    // Try to parse voltage from StatusData.Voltage.Text
    if (state.StatusData && state.StatusData.Voltage && state.StatusData.Voltage.Text) {
      const voltageText = state.StatusData.Voltage.Text;
      const match = voltageText.match(/[\d.]+/);
      if (match) {
        return parseFloat(match[0]);
      }
    }
    // Default voltage if not available (typical supply voltage)
    return 12.0;
  }
}

/**
 * Handler for InstantaneousAtrialPressure messages
 * Updates atrial pressure for the specified pump side
 * 
 * Validates: Requirement 2.2
 */
class InstantaneousAtrialPressureHandler extends MessageTypeHandler {
  /**
   * Handle InstantaneousAtrialPressure message
   * @param {Object} data - Message data field
   * @param {Object} aggregator - State aggregator instance
   */
  handle(data, aggregator) {
    const state = aggregator.state;
    const pumpSide = data.pumpSide;
    const pressure = data.averagePressure || 0;
    
    // Route to appropriate pump side
    if (pumpSide === 'Left') {
      state.LeftHeart.AtrialPressure = pressure;
    } else if (pumpSide === 'Right') {
      state.RightHeart.AtrialPressure = pressure;
    }
  }
}

/**
 * Handler for StrokewiseAtrialPressure messages
 * Updates min, max, and average atrial pressure values
 * 
 * Validates: Requirement 2.3
 */
class StrokewiseAtrialPressureHandler extends MessageTypeHandler {
  /**
   * Handle StrokewiseAtrialPressure message
   * @param {Object} data - Message data field
   * @param {Object} aggregator - State aggregator instance
   */
  handle(data, aggregator) {
    const state = aggregator.state;
    const pumpSide = data.pumpSide;
    
    const avgPressure = data.averagePressure || 0;
    const minPressure = data.minPressure || 0;
    const maxPressure = data.maxPressure || 0;
    
    // Route to appropriate pump side and update all three values
    if (pumpSide === 'Left') {
      state.LeftHeart.IntPressure = avgPressure;
      state.LeftHeart.IntPressureMin = minPressure;
      state.LeftHeart.IntPressureMax = maxPressure;
    } else if (pumpSide === 'Right') {
      state.RightHeart.IntPressure = avgPressure;
      state.RightHeart.IntPressureMin = minPressure;
      state.RightHeart.IntPressureMax = maxPressure;
    }
  }
}

/**
 * Handler for ManualPhysiologicalSettings messages
 * Updates heart rate and stroke length for both pump sides
 * 
 * Validates: Requirement 2.4
 */
class ManualPhysiologicalSettingsHandler extends MessageTypeHandler {
  /**
   * Handle ManualPhysiologicalSettings message
   * @param {Object} data - Message data field
   * @param {Object} aggregator - State aggregator instance
   */
  handle(data, aggregator) {
    const state = aggregator.state;
    
    // Update heart rate (applies to both sides)
    if (typeof data.heartRate === 'number') {
      state.HeartRate = data.heartRate;
    }
    
    // Update stroke length for left side
    if (typeof data.leftStrokeLength === 'number') {
      state.LeftHeart.TargetStrokeLen = data.leftStrokeLength;
    }
    
    // Update stroke length for right side
    if (typeof data.rightStrokeLength === 'number') {
      state.RightHeart.TargetStrokeLen = data.rightStrokeLength;
    }
  }
}

/**
 * Handler for ActualStrokeLength messages
 * Updates the actual stroke length for the specified pump side
 * 
 * Validates: Requirement 2.5
 */
class ActualStrokeLengthHandler extends MessageTypeHandler {
  /**
   * Handle ActualStrokeLength message
   * @param {Object} data - Message data field
   * @param {Object} aggregator - State aggregator instance
   */
  handle(data, aggregator) {
    const state = aggregator.state;
    const pumpSide = data.pumpSide;
    const strokeLength = data.strokeLength || 0;
    
    // Route to appropriate pump side
    if (pumpSide === 'Left') {
      state.LeftHeart.ActualStrokeLen = strokeLength;
    } else if (pumpSide === 'Right') {
      state.RightHeart.ActualStrokeLen = strokeLength;
    }
  }
}

/**
 * Handler for StrokewisePressure messages (UDP)
 * Maps pressure data to medical sensor readings
 * 
 * Validates: Requirements 2.9, 5.1, 5.2, 5.3, 5.4, 5.5
 */
class StrokewisePressureHandler extends MessageTypeHandler {
  /**
   * Handle StrokewisePressure message
   * @param {Object} data - Message data field
   * @param {Object} aggregator - State aggregator instance
   */
  handle(data, aggregator) {
    const state = aggregator.state;
    
    // Map leftAtrial to LeftHeart.MedicalPressure
    if (data.leftAtrial && data.leftAtrial !== null) {
      state.LeftHeart.MedicalPressure = this.createPressureSensorData(
        'Left Atrial',
        data.leftAtrial.average,
        data.leftAtrial.min,
        data.leftAtrial.max,
        data.leftAtrial.unit || 'mmHg'
      );
    }
    
    // Map rightAtrial to RightHeart.MedicalPressure
    if (data.rightAtrial && data.rightAtrial !== null) {
      state.RightHeart.MedicalPressure = this.createPressureSensorData(
        'Right Atrial',
        data.rightAtrial.average,
        data.rightAtrial.min,
        data.rightAtrial.max,
        data.rightAtrial.unit || 'mmHg'
      );
    }
    
    // Map pulmonaryArterial to PAPSensor
    if (data.pulmonaryArterial && data.pulmonaryArterial !== null) {
      state.PAPSensor = this.createPressureSensorData(
        'PAP',
        data.pulmonaryArterial.average,
        data.pulmonaryArterial.min,
        data.pulmonaryArterial.max,
        data.pulmonaryArterial.unit || 'mmHg'
      );
    }
    
    // Map aortic to AoPSensor
    if (data.aortic && data.aortic !== null) {
      state.AoPSensor = this.createPressureSensorData(
        'AoP',
        data.aortic.average,
        data.aortic.min,
        data.aortic.max,
        data.aortic.unit || 'mmHg'
      );
    }
  }
  
  /**
   * Create pressure sensor data structure
   * @param {string} name - Sensor name
   * @param {number} average - Average pressure value
   * @param {number} min - Minimum pressure value
   * @param {number} max - Maximum pressure value
   * @param {string} unit - Unit of measurement
   * @returns {Object} Sensor data structure
   * @private
   */
  createPressureSensorData(name, average, min, max, unit) {
    return {
      Name: name,
      PrimaryValue: average,
      SecondaryValue: null,
      BackColor: null,
      unit: unit,
      min: min,
      max: max
    };
  }
}

/**
 * Handler for StreamingPressure messages (UDP)
 * Buffers streaming pressure data for real-time display
 * 
 * Validates: Requirement 2.10
 */
class StreamingPressureHandler extends MessageTypeHandler {
  /**
   * Handle StreamingPressure message
   * @param {Object} data - Message data field
   * @param {Object} aggregator - State aggregator instance
   */
  handle(data, aggregator) {
    const state = aggregator.state;
    
    // Initialize streaming pressure buffer if it doesn't exist
    if (!state.StreamingPressure) {
      state.StreamingPressure = {
        leftAtrial: [],
        rightAtrial: [],
        leftVentricular: [],
        rightVentricular: [],
        aortic: [],
        pulmonaryArterial: [],
        sampleRate: 0,
        unit: 'mmHg'
      };
    }
    
    // Buffer streaming pressure data
    if (data.leftAtrial && data.leftAtrial !== null) {
      state.StreamingPressure.leftAtrial = data.leftAtrial;
    }
    
    if (data.rightAtrial && data.rightAtrial !== null) {
      state.StreamingPressure.rightAtrial = data.rightAtrial;
    }
    
    if (data.leftVentricular && data.leftVentricular !== null) {
      state.StreamingPressure.leftVentricular = data.leftVentricular;
    }
    
    if (data.rightVentricular && data.rightVentricular !== null) {
      state.StreamingPressure.rightVentricular = data.rightVentricular;
    }
    
    if (data.aortic && data.aortic !== null) {
      state.StreamingPressure.aortic = data.aortic;
    }
    
    if (data.pulmonaryArterial && data.pulmonaryArterial !== null) {
      state.StreamingPressure.pulmonaryArterial = data.pulmonaryArterial;
    }
    
    // Update sample rate and unit
    if (data.sampleRate) {
      state.StreamingPressure.sampleRate = data.sampleRate;
    }
    
    if (data.unit) {
      state.StreamingPressure.unit = data.unit;
    }
  }
}

/**
 * Handler for Temperature messages
 * Updates temperature readings with threshold checking
 * 
 * Validates: Requirements 2.6, 7.4
 */
class TemperatureHandler extends MessageTypeHandler {
  /**
   * Handle Temperature message
   * @param {Object} data - Message data field
   * @param {Object} aggregator - State aggregator instance
   */
  handle(data, aggregator) {
    const state = aggregator.state;
    
    // Calculate average temperature from all sensors
    const temps = [data.temp1, data.temp2, data.temp3, data.temp4].filter(t => t !== undefined && t !== null);
    const avgTemp = temps.length > 0 ? temps.reduce((sum, t) => sum + t, 0) / temps.length : 0;
    
    // Temperature threshold: > 60°C triggers warning
    const TEMP_THRESHOLD = 60;
    const isHighTemp = avgTemp > TEMP_THRESHOLD;
    
    // Update StatusData with temperature and color based on threshold
    state.StatusData.Temperature = {
      Text: avgTemp.toFixed(1),
      Color: isHighTemp ? 'badge-error' : 'badge-success'
    };
  }
}

/**
 * Handler for SupplyVoltage messages
 * Updates voltage metrics with range checking
 * 
 * Validates: Requirements 2.7, 7.5
 */
class SupplyVoltageHandler extends MessageTypeHandler {
  /**
   * Handle SupplyVoltage message
   * @param {Object} data - Message data field
   * @param {Object} aggregator - State aggregator instance
   */
  handle(data, aggregator) {
    const state = aggregator.state;
    
    // Use mean supply voltage
    const voltage = data.meanSupplyVoltage || 0;
    
    // Voltage range: 12-18V is normal
    const VOLTAGE_MIN = 12;
    const VOLTAGE_MAX = 18;
    const isAbnormalVoltage = voltage < VOLTAGE_MIN || voltage > VOLTAGE_MAX;
    
    // Update StatusData with voltage and color based on range
    state.StatusData.Voltage = {
      Text: voltage.toFixed(1),
      Color: isAbnormalVoltage ? 'badge-warning' : 'badge-success'
    };
  }
}

/**
 * Handler for CPUData messages
 * Updates CPU load information
 * 
 * Validates: Requirement 2.8
 */
class CPUDataHandler extends MessageTypeHandler {
  /**
   * Handle CPUData message
   * @param {Object} data - Message data field
   * @param {Object} aggregator - State aggregator instance
   */
  handle(data, aggregator) {
    const state = aggregator.state;
    
    const cpuLoad = data.cpuLoad || 0;
    
    // Update StatusData with CPU load
    // No specific threshold mentioned in requirements, using info color
    state.StatusData.CPULoad = {
      Text: cpuLoad.toFixed(0),
      Color: 'badge-info'
    };
  }
}

/**
 * Handler for Accelerometer messages
 * Updates accelerometer data with magnitude calculation and threshold checking
 * 
 * Validates: Requirements 8.1, 8.2, 8.3
 */
class AccelerometerHandler extends MessageTypeHandler {
  /**
   * Handle Accelerometer message
   * @param {Object} data - Message data field
   * @param {Object} aggregator - State aggregator instance
   */
  handle(data, aggregator) {
    const state = aggregator.state;
    
    // Store x, y, z axis values
    const x = data.xAxis || 0;
    const y = data.yAxis || 0;
    const z = data.zAxis || 0;
    
    // Calculate magnitude: sqrt(x² + y² + z²)
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    
    // Accelerometer threshold: > 2g triggers warning
    const ACCEL_THRESHOLD = 2;
    const isHighAccel = magnitude > ACCEL_THRESHOLD;
    
    // Update StatusData with magnitude and color based on threshold
    state.StatusData.Accelerometer = {
      Text: magnitude.toFixed(2),
      Color: isHighAccel ? 'badge-error' : 'badge-success'
    };
  }
}

module.exports = {
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
};
