/**
 * MessageParser - Parses and validates incoming telemetry messages
 * 
 * Validates: Requirements 1.1, 1.3
 */
class MessageParser {
  /**
   * List of supported message types from telemetry data
   */
  static SUPPORTED_MESSAGE_TYPES = [
    'MotorCurrent',
    'Accelerometer',
    'InstantaneousAtrialPressure',
    'SupplyVoltage',
    'CPUData',
    'AdditionalTemperatures',
    'ManualPhysiologicalSettings',
    'Voltage',
    'Temperature',
    'MotorTuningPid',
    'MotorTuningFeedForward',
    'StrokewiseAtrialPressure',
    'ActualStrokeLength',
    'AliveCounter',
    'PumpControl',
    'StrokewisePressure',
    'StreamingPressure',
    'AutoPhysiologicalSettings'
  ];

  /**
   * Parse a telemetry message from raw JSON string
   * @param {string} rawMessage - Raw JSON string
   * @returns {ParsedMessage | null} Parsed message or null if invalid
   */
  parse(rawMessage) {
    try {
      // Handle malformed JSON
      const message = JSON.parse(rawMessage);
      
      // Validate the parsed message
      if (!this.validate(message)) {
        return null;
      }
      
      return {
        messageType: message.messageType,
        timestampUtc: message.timestampUtc,
        source: message.source,
        data: message.data
      };
    } catch (error) {
      // Log error but don't crash - requirement 1.5
      console.error('Failed to parse telemetry message:', error.message);
      return null;
    }
  }

  /**
   * Validate message structure
   * @param {object} message - Parsed JSON object
   * @returns {boolean} True if valid
   */
  validate(message) {
    // Check if message is an object
    if (!message || typeof message !== 'object') {
      console.warn('Invalid message: not an object');
      return false;
    }

    // Validate required field: messageType (Requirement 1.1)
    if (!message.messageType || typeof message.messageType !== 'string') {
      console.warn('Invalid message: missing or invalid messageType');
      return false;
    }

    // Check if messageType is supported
    if (!MessageParser.SUPPORTED_MESSAGE_TYPES.includes(message.messageType)) {
      console.warn(`Unsupported message type: ${message.messageType}`);
      return false;
    }

    // Validate required field: timestampUtc (Requirement 1.2)
    if (typeof message.timestampUtc !== 'number') {
      console.warn('Invalid message: missing or invalid timestampUtc');
      return false;
    }

    // Validate required field: source (Requirement 1.3)
    if (!message.source || typeof message.source !== 'string') {
      console.warn('Invalid message: missing or invalid source');
      return false;
    }

    // Validate source is either CAN or UDP
    if (message.source !== 'CAN' && message.source !== 'UDP') {
      console.warn(`Invalid message: source must be CAN or UDP, got ${message.source}`);
      return false;
    }

    // Validate required field: data
    if (!message.data || typeof message.data !== 'object') {
      console.warn('Invalid message: missing or invalid data field');
      return false;
    }

    return true;
  }
}

module.exports = MessageParser;
