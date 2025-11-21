/**
 * StateAggregator - Maintains aggregated state from individual telemetry messages
 * 
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3
 */

const {
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

/**
 * Pump cross-section area constant (cm²)
 * This is based on the physical design of the cardiac pump
 */
const PUMP_CROSS_SECTION_AREA = 5.0; // cm²

/**
 * @typedef {Object} SensorData
 * @property {string} Name - Sensor name
 * @property {number|string} PrimaryValue - Primary sensor value
 * @property {number|null} SecondaryValue - Secondary sensor value (optional)
 * @property {string|null} BackColor - Background color for UI (optional)
 * @property {string} unit - Unit of measurement
 */

/**
 * @typedef {Object} SystemStatus
 * @property {Object} Temperature - Temperature status
 * @property {string} Temperature.Text - Temperature display text
 * @property {string} Temperature.Color - Temperature color indicator
 * @property {Object} Voltage - Voltage status
 * @property {string} Voltage.Text - Voltage display text
 * @property {string} Voltage.Color - Voltage color indicator
 * @property {Object} CPULoad - CPU load status
 * @property {string} CPULoad.Text - CPU load display text
 * @property {string} CPULoad.Color - CPU load color indicator
 * @property {Object} Accelerometer - Accelerometer status
 * @property {string} Accelerometer.Text - Accelerometer display text
 * @property {string} Accelerometer.Color - Accelerometer color indicator
 */

/**
 * @typedef {Object} HeartData
 * @property {number} PowerConsumption - Power consumption in watts
 * @property {number} AtrialPressure - Atrial pressure in mmHg
 * @property {number} CardiacOutput - Cardiac output in L/min
 * @property {number} TargetStrokeLen - Target stroke length in mm
 * @property {number} ActualStrokeLen - Actual stroke length in mm
 * @property {number} IntPressure - Internal pressure in mmHg
 * @property {number} IntPressureMin - Minimum internal pressure in mmHg
 * @property {number} IntPressureMax - Maximum internal pressure in mmHg
 * @property {SensorData} MedicalPressure - Medical pressure sensor data
 */

/**
 * @typedef {Object} AggregatedState
 * @property {string} SystemId - System identifier
 * @property {number} HeartRate - Heart rate in bpm
 * @property {HeartData} LeftHeart - Left heart chamber data
 * @property {HeartData} RightHeart - Right heart chamber data
 * @property {SensorData} CVPSensor - Central venous pressure sensor
 * @property {SensorData} PAPSensor - Pulmonary arterial pressure sensor
 * @property {SensorData} AoPSensor - Aortic pressure sensor
 * @property {SensorData} ArtPressSensor - Arterial pressure sensor
 * @property {SensorData} IvcPressSensor - Inferior vena cava pressure sensor
 * @property {SystemStatus} StatusData - System health status
 * @property {string} OperationState - Current operation state
 * @property {string} HeartStatus - Current heart status
 * @property {number} Timestamp - Last update timestamp
 */

class StateAggregator {
  constructor() {
    this.state = this.createInitialState();
    this.initializeHandlers();
    this.lastTelemetryTime = Date.now();
    this.leftHeartLastUpdate = Date.now();
    this.rightHeartLastUpdate = Date.now();
  }

  /**
   * Initialize message type handlers
   * @private
   */
  initializeHandlers() {
    this.handlers = {
      'MotorCurrent': new MotorCurrentHandler(),
      'InstantaneousAtrialPressure': new InstantaneousAtrialPressureHandler(),
      'StrokewiseAtrialPressure': new StrokewiseAtrialPressureHandler(),
      'ManualPhysiologicalSettings': new ManualPhysiologicalSettingsHandler(),
      'ActualStrokeLength': new ActualStrokeLengthHandler(),
      'StrokewisePressure': new StrokewisePressureHandler(),
      'StreamingPressure': new StreamingPressureHandler(),
      'Temperature': new TemperatureHandler(),
      'SupplyVoltage': new SupplyVoltageHandler(),
      'CPUData': new CPUDataHandler(),
      'Accelerometer': new AccelerometerHandler()
    };
  }

  /**
   * Create initial state structure with default values
   * @returns {AggregatedState} Initial state
   * @private
   */
  createInitialState() {
    return {
      SystemId: '',
      HeartRate: 0,
      LeftHeart: this.createHeartData(),
      RightHeart: this.createHeartData(),
      CVPSensor: this.createSensorData('CVP', 0, 'mmHg'),
      PAPSensor: this.createSensorData('PAP', 0, 'mmHg'),
      AoPSensor: this.createSensorData('AoP', 0, 'mmHg'),
      ArtPressSensor: this.createSensorData('ArtPress', 0, 'mmHg'),
      IvcPressSensor: this.createSensorData('IvcPress', 0, 'mmHg'),
      StatusData: this.createSystemStatus(),
      OperationState: '-',
      HeartStatus: '-',
      Timestamp: Date.now()
    };
  }

  /**
   * Create heart data structure with default values
   * @returns {HeartData} Heart data
   * @private
   */
  createHeartData() {
    return {
      PowerConsumption: 0,
      AtrialPressure: 0,
      CardiacOutput: 0,
      TargetStrokeLen: 0,
      ActualStrokeLen: 0,
      IntPressure: 0,
      IntPressureMin: 0,
      IntPressureMax: 0,
      MedicalPressure: this.createSensorData('MedicalPressure', '-', 'mmHg')
    };
  }

  /**
   * Create sensor data structure
   * @param {string} name - Sensor name
   * @param {number|string} value - Primary value
   * @param {string} unit - Unit of measurement
   * @returns {SensorData} Sensor data
   * @private
   */
  createSensorData(name, value, unit) {
    return {
      Name: name,
      PrimaryValue: value,
      SecondaryValue: null,
      BackColor: null,
      unit: unit
    };
  }

  /**
   * Create system status structure with default values
   * @returns {SystemStatus} System status
   * @private
   */
  createSystemStatus() {
    return {
      Temperature: {
        Text: '-',
        Color: 'badge-info'
      },
      Voltage: {
        Text: '-',
        Color: 'badge-info'
      },
      CPULoad: {
        Text: '-',
        Color: 'badge-info'
      },
      Accelerometer: {
        Text: '-',
        Color: 'badge-info'
      }
    };
  }

  /**
   * Get current aggregated state
   * Validates: Requirements 9.1, 9.2
   * @returns {AggregatedState} Current state with availability indicators
   */
  getState() {
    const now = Date.now();
    const TELEMETRY_TIMEOUT = 30000; // 30 seconds
    const SIDE_TIMEOUT = 10000; // 10 seconds for individual pump side
    
    // Check if we've received any telemetry recently (Requirement 9.2)
    const noDataReceived = (now - this.lastTelemetryTime) > TELEMETRY_TIMEOUT;
    
    // Check if individual pump sides have received data (Requirement 9.2)
    const leftHeartAvailable = (now - this.leftHeartLastUpdate) < SIDE_TIMEOUT;
    const rightHeartAvailable = (now - this.rightHeartLastUpdate) < SIDE_TIMEOUT;
    
    return { 
      ...this.state,
      _telemetryStatus: {
        noDataReceived,
        leftHeartAvailable,
        rightHeartAvailable,
        lastTelemetryTime: this.lastTelemetryTime,
        leftHeartLastUpdate: this.leftHeartLastUpdate,
        rightHeartLastUpdate: this.rightHeartLastUpdate
      }
    };
  }

  /**
   * Reset state to defaults
   */
  reset() {
    this.state = this.createInitialState();
  }

  /**
   * Calculate cardiac output for a specific pump side
   * Formula: (HeartRate × StrokeLength × CrossSectionArea) / 1000
   * Validates: Requirements 4.1, 4.2, 4.3
   * 
   * @param {string} side - 'Left' or 'Right'
   * @returns {number} Cardiac output in L/min
   */
  calculateCardiacOutput(side) {
    const heartData = side === 'Left' ? this.state.LeftHeart : this.state.RightHeart;
    const heartRate = this.state.HeartRate;
    const strokeLength = heartData.ActualStrokeLen || heartData.TargetStrokeLen;
    
    // Handle missing data (Requirement 4.3)
    if (!heartRate || !strokeLength) {
      // Return previous value if data is missing
      return heartData.CardiacOutput;
    }
    
    // Calculate cardiac output (Requirement 4.1)
    // Formula: (HeartRate × StrokeLength × CrossSectionArea) / 1000
    // Result is in L/min
    const cardiacOutput = (heartRate * strokeLength * PUMP_CROSS_SECTION_AREA) / 1000;
    
    return cardiacOutput;
  }

  /**
   * Update cardiac output for both pump sides
   * Validates: Requirements 4.1, 4.2, 4.3
   */
  updateCardiacOutput() {
    // Update left heart cardiac output (Requirement 4.2)
    this.state.LeftHeart.CardiacOutput = this.calculateCardiacOutput('Left');
    
    // Update right heart cardiac output (Requirement 4.2)
    this.state.RightHeart.CardiacOutput = this.calculateCardiacOutput('Right');
  }

  /**
   * Update state based on telemetry message
   * Implements pump side routing logic (Requirement 1.4)
   * Validates: Requirements 9.1, 9.4
   * @param {Object} message - Parsed telemetry message
   */
  updateState(message) {
    // Update timestamp
    this.state.Timestamp = message.timestampUtc || Date.now();
    
    // Track last telemetry time for timeout detection (Requirement 9.2, 9.4)
    this.lastTelemetryTime = Date.now();
    
    // Get handler for this message type
    const handler = this.handlers[message.messageType];
    
    if (handler) {
      // Handle pump side routing
      const pumpSide = message.data?.pumpSide;
      
      // Track which pump side received data (Requirement 9.2)
      if (pumpSide === 'Left' || pumpSide === 'All') {
        this.leftHeartLastUpdate = Date.now();
      }
      if (pumpSide === 'Right' || pumpSide === 'All') {
        this.rightHeartLastUpdate = Date.now();
      }
      
      if (pumpSide === 'All') {
        // For "All" pump side, apply to both Left and Right
        // Create separate message copies for each side
        const leftMessage = {
          ...message,
          data: { ...message.data, pumpSide: 'Left' }
        };
        const rightMessage = {
          ...message,
          data: { ...message.data, pumpSide: 'Right' }
        };
        
        // Apply handler to both sides
        handler.handle(leftMessage.data, this);
        handler.handle(rightMessage.data, this);
      } else {
        // For "Left", "Right", or no pumpSide, use handler directly
        handler.handle(message.data, this);
      }
      
      // Update cardiac output after processing message (Requirements 4.1, 4.2, 4.3)
      this.updateCardiacOutput();
    } else {
      // Log debug message for unhandled message types but continue processing (Requirement 9.1)
      // These are typically internal diagnostic messages not needed for UI display
      if (process.env.DEBUG) {
        console.log(`[DEBUG] No handler for message type: ${message.messageType}`);
      }
    }
  }
}

module.exports = StateAggregator;
