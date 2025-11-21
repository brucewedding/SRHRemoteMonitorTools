# MessageParser

The MessageParser class is responsible for parsing and validating incoming telemetry messages from CAN bus and UDP sources.

## Features

- **Parse JSON telemetry messages**: Converts raw JSON strings into structured ParsedMessage objects
- **Validate message structure**: Ensures all required fields are present and valid
- **Error handling**: Gracefully handles malformed JSON without crashing
- **Support for all telemetry types**: Handles 18 different message types from the telemetry system

## Requirements Validation

- **Requirement 1.1**: Validates messageType field is present and supported
- **Requirement 1.3**: Validates source field is present and is either 'CAN' or 'UDP'
- **Requirement 1.2**: Validates timestampUtc field is present (used for message ordering)
- **Requirement 1.5**: Handles malformed messages gracefully by logging errors and returning null

## Usage

```javascript
const MessageParser = require('./MessageParser');

const parser = new MessageParser();

// Parse a telemetry message
const rawMessage = '{"messageType":"MotorCurrent","timestampUtc":1763720006423,"source":"CAN","data":{"combinedCurrent":0.125}}';
const parsed = parser.parse(rawMessage);

if (parsed) {
  console.log('Message type:', parsed.messageType);
  console.log('Timestamp:', parsed.timestampUtc);
  console.log('Source:', parsed.source);
  console.log('Data:', parsed.data);
} else {
  console.log('Failed to parse message');
}
```

## Supported Message Types

The parser supports the following message types:

### CAN Bus Messages
- MotorCurrent
- Accelerometer
- InstantaneousAtrialPressure
- SupplyVoltage
- CPUData
- AdditionalTemperatures
- ManualPhysiologicalSettings
- Voltage
- Temperature
- MotorTuningPid
- MotorTuningFeedForward
- StrokewiseAtrialPressure
- ActualStrokeLength
- AliveCounter
- PumpControl
- AutoPhysiologicalSettings

### UDP Messages
- StrokewisePressure
- StreamingPressure

## API

### `parse(rawMessage: string): ParsedMessage | null`

Parses a raw JSON string into a ParsedMessage object.

**Parameters:**
- `rawMessage` - Raw JSON string containing telemetry data

**Returns:**
- `ParsedMessage` object if valid, `null` if invalid or malformed

**ParsedMessage Structure:**
```javascript
{
  messageType: string,
  timestampUtc: number,
  source: 'CAN' | 'UDP',
  data: object
}
```

### `validate(message: object): boolean`

Validates a parsed message object has all required fields.

**Parameters:**
- `message` - Parsed JSON object

**Returns:**
- `true` if valid, `false` otherwise

## Error Handling

The parser handles errors gracefully:

1. **Malformed JSON**: Logs error and returns null
2. **Missing required fields**: Logs warning and returns null
3. **Invalid field types**: Logs warning and returns null
4. **Unsupported message types**: Logs warning and returns null
5. **Invalid source values**: Logs warning and returns null

All errors are logged to console but do not crash the application, satisfying Requirement 1.5.

## Testing

Run the test suite:

```bash
node server/MessageParser.test.js
```

The test suite includes:
- Valid message parsing for different message types
- Malformed JSON handling
- Missing field validation
- Invalid field value handling
- Parsing all messages from sample-telemetry.json
