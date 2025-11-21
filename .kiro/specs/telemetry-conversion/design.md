# Design Document

## Overview

This design document describes the architecture for converting a legacy cardiac monitoring system to support a new telemetry data format. The conversion involves four main areas:

1. **Server migration**: Migrate from Express.js to Fastify for better performance and TypeScript support
2. **Server-side message aggregation**: Transform individual CAN/UDP telemetry messages into a unified state object
3. **Frontend state management**: Implement Jotai atoms for reactive state updates
4. **UI adaptation**: Map new telemetry fields to existing UI components with minimal changes

The design preserves the existing WebSocket communication architecture while introducing a message aggregation layer on the server and Jotai-based state management on the client. The server will be rewritten using Fastify instead of Express.js for improved performance and better developer experience.

## Architecture

### High-Level Architecture

```
┌─────────────────┐
│  CAN/UDP Device │
│   (Telemetry)   │
└────────┬────────┘
         │ Individual messages
         ▼
┌─────────────────────────┐
│   WebSocket Server      │
│  ┌──────────────────┐   │
│  │ Message Parser   │   │
│  └────────┬─────────┘   │
│           │              │
│  ┌────────▼─────────┐   │
│  │ State Aggregator │   │
│  └────────┬─────────┘   │
│           │              │
│  ┌────────▼─────────┐   │
│  │ Broadcast Logic  │   │
│  └──────────────────┘   │
└───────────┬─────────────┘
            │ Aggregated state
            ▼
┌─────────────────────────┐
│   React Dashboard       │
│  ┌──────────────────┐   │
│  │ WebSocket Client │   │
│  └────────┬─────────┘   │
│           │              │
│  ┌────────▼─────────┐   │
│  │  Jotai Atoms     │   │
│  └────────┬─────────┘   │
│           │              │
│  ┌────────▼─────────┐   │
│  │  UI Components   │   │
│  └──────────────────┘   │
└─────────────────────────┘
```

### Component Interaction Flow

1. Device sends individual telemetry messages via WebSocket
2. Server's Message Parser validates and extracts message data
3. State Aggregator updates internal state based on message type and pump side
4. Broadcast Logic sends aggregated state to all connected clients
5. Client's WebSocket handler receives aggregated state
6. Jotai atoms are updated with new values
7. UI components re-render based on atom changes

## Migration Strategy

### Express to Fastify Migration

The migration from Express to Fastify will follow these steps:

1. **Install Fastify Dependencies**
   - `fastify` - Core framework
   - `@fastify/websocket` - WebSocket support
   - `@fastify/cors` - CORS support (if needed)

2. **Preserve Existing Functionality**
   - WebSocket connection management
   - Client authentication and system selection
   - Message broadcasting
   - System tracking and cleanup

3. **Key Differences to Address**
   - Express uses `ws` library directly; Fastify uses `@fastify/websocket`
   - Express middleware → Fastify hooks and plugins
   - Express `req`/`res` → Fastify `request`/`reply`
   - WebSocket connection handling syntax differs

4. **Migration Approach**
   - Create new Fastify server alongside existing Express server
   - Port WebSocket logic to Fastify's WebSocket plugin
   - Test thoroughly before removing Express code
   - Maintain backward compatibility with existing clients

## Components and Interfaces

### Server Framework

The server will use **Fastify** instead of Express.js for the following benefits:

1. **Performance**: Fastify is significantly faster than Express (up to 2x throughput)
2. **Schema Validation**: Built-in JSON schema validation for requests/responses
3. **TypeScript Support**: First-class TypeScript support with type inference
4. **Plugin Architecture**: Better modularity with Fastify's plugin system
5. **WebSocket Support**: Native WebSocket support via `@fastify/websocket`

**Fastify Server Structure**:
```javascript
import Fastify from 'fastify'
import websocket from '@fastify/websocket'

const fastify = Fastify({
  logger: true
})

// Register WebSocket support
await fastify.register(websocket)

// WebSocket route
fastify.register(async function (fastify) {
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    // WebSocket connection handling
  })
})

await fastify.listen({ port: 3000, host: '0.0.0.0' })
```

### Server Components

#### Message Parser

**Responsibility**: Parse and validate incoming telemetry messages

**Interface**:
```javascript
class MessageParser {
  /**
   * Parse a telemetry message
   * @param {string} rawMessage - Raw JSON string
   * @returns {ParsedMessage | null} Parsed message or null if invalid
   */
  parse(rawMessage)
  
  /**
   * Validate message structure
   * @param {object} message - Parsed JSON object
   * @returns {boolean} True if valid
   */
  validate(message)
}

interface ParsedMessage {
  messageType: string
  timestampUtc: number
  source: 'CAN' | 'UDP'
  data: object
}
```

#### State Aggregator

**Responsibility**: Maintain aggregated state from individual telemetry messages

**Interface**:
```javascript
class StateAggregator {
  /**
   * Update state based on telemetry message
   * @param {ParsedMessage} message - Parsed telemetry message
   */
  updateState(message)
  
  /**
   * Get current aggregated state
   * @returns {AggregatedState} Current state
   */
  getState()
  
  /**
   * Reset state to defaults
   */
  reset()
}

interface AggregatedState {
  SystemId: string
  HeartRate: number
  LeftHeart: HeartData
  RightHeart: HeartData
  CVPSensor: SensorData
  PAPSensor: SensorData
  AoPSensor: SensorData
  ArtPressSensor: SensorData
  IvcPressSensor: SensorData
  StatusData: SystemStatus
  OperationState: string
  HeartStatus: string
  Timestamp: number
}

interface HeartData {
  PowerConsumption: number
  AtrialPressure: number
  CardiacOutput: number
  TargetStrokeLen: number
  ActualStrokeLen: number
  IntPressure: number
  IntPressureMin: number
  IntPressureMax: number
  MedicalPressure: SensorData
}

interface SensorData {
  Name: string
  PrimaryValue: number | string
  SecondaryValue: number | null
  BackColor: string | null
  unit: string
}

interface SystemStatus {
  Temperature: { Text: string, Color: string }
  Voltage: { Text: string, Color: string }
  CPULoad: { Text: string, Color: string }
  Accelerometer: { Text: string, Color: string }
}
```

#### Message Type Handlers

**Responsibility**: Process specific message types and update state

Each handler follows this pattern:
```javascript
class MessageTypeHandler {
  /**
   * Handle a specific message type
   * @param {object} data - Message data field
   * @param {StateAggregator} aggregator - State aggregator instance
   */
  handle(data, aggregator)
}
```

Handlers needed:
- `MotorCurrentHandler` - Extract power consumption
- `AccelerometerHandler` - Store acceleration data
- `InstantaneousAtrialPressureHandler` - Update atrial pressure
- `StrokewiseAtrialPressureHandler` - Update min/max/avg atrial pressure
- `ManualPhysiologicalSettingsHandler` - Update heart rate and stroke length
- `ActualStrokeLengthHandler` - Update actual stroke length
- `TemperatureHandler` - Update temperature readings
- `SupplyVoltageHandler` - Update voltage metrics
- `CPUDataHandler` - Update CPU load
- `StrokewisePressureHandler` - Update medical sensor pressures
- `StreamingPressureHandler` - Buffer streaming pressure data

### Client Components

#### Jotai Atoms Store

**Responsibility**: Define and manage all telemetry state atoms

**Structure**:
```javascript
// atoms.js
import { atom } from 'jotai'

// System-level atoms
export const systemIdAtom = atom('')
export const heartRateAtom = atom(0)
export const operationStateAtom = atom('-')
export const heartStatusAtom = atom('-')

// Left heart atoms
export const leftPowerAtom = atom(0)
export const leftAtrialPressureAtom = atom(0)
export const leftCardiacOutputAtom = atom(0)
export const leftTargetStrokeLenAtom = atom(0)
export const leftActualStrokeLenAtom = atom(0)
export const leftIntPressureAtom = atom(0)
export const leftIntPressureMinAtom = atom(0)
export const leftIntPressureMaxAtom = atom(0)
export const leftMedicalPressureAtom = atom({ PrimaryValue: '-', unit: 'mmHg' })

// Right heart atoms (similar structure)
export const rightPowerAtom = atom(0)
export const rightAtrialPressureAtom = atom(0)
export const rightCardiacOutputAtom = atom(0)
export const rightTargetStrokeLenAtom = atom(0)
export const rightActualStrokeLenAtom = atom(0)
export const rightIntPressureAtom = atom(0)
export const rightIntPressureMinAtom = atom(0)
export const rightIntPressureMaxAtom = atom(0)
export const rightMedicalPressureAtom = atom({ PrimaryValue: '-', unit: 'mmHg' })

// Sensor atoms
export const cvpSensorAtom = atom({ PrimaryValue: 0, unit: 'mmHg' })
export const papSensorAtom = atom({ PrimaryValue: 0, unit: 'mmHg' })
export const aopSensorAtom = atom({ PrimaryValue: 0, unit: 'mmHg' })
export const artPressSensorAtom = atom({ PrimaryValue: 0, unit: 'mmHg' })
export const ivcPressSensorAtom = atom({ PrimaryValue: 0, unit: 'mmHg' })

// System health atoms
export const temperatureAtom = atom({ Text: '-', Color: 'badge-info' })
export const voltageAtom = atom({ Text: '-', Color: 'badge-info' })
export const cpuLoadAtom = atom({ Text: '-', Color: 'badge-info' })
export const accelerometerAtom = atom({ Text: '-', Color: 'badge-info' })

// Status data atoms
export const statusDataAtom = atom({
  Temperature: { Text: '-', Color: 'badge-info' },
  Voltage: { Text: '-', Color: 'badge-info' },
  CPULoad: { Text: '-', Color: 'badge-info' },
  Accelerometer: { Text: '-', Color: 'badge-info' }
})
```

#### WebSocket State Updater

**Responsibility**: Update Jotai atoms when WebSocket messages arrive

**Interface**:
```javascript
/**
 * Update all atoms from aggregated state
 * @param {AggregatedState} state - Aggregated state from server
 * @param {Function} setAtom - Jotai setter function
 */
function updateAtomsFromState(state, setAtom)
```

#### UI Components

Existing components will be modified to read from Jotai atoms instead of React state:

**Before**:
```javascript
const [detailedData, setDetailedData] = React.useState({...})
// Use detailedData.HeartRate
```

**After**:
```javascript
import { useAtomValue } from 'jotai'
import { heartRateAtom } from './atoms'

const heartRate = useAtomValue(heartRateAtom)
// Use heartRate directly
```

## Data Models

### Telemetry Message Types

#### MotorCurrent
```javascript
{
  messageType: "MotorCurrent",
  timestampUtc: number,
  source: "CAN",
  data: {
    combinedCurrent: number,
    phaseACurrent: number,
    phaseBCurrent: number,
    phaseCCurrent: number,
    unit: "A",
    canId: string,
    pumpSide: "Left" | "Right"
  }
}
```

#### Accelerometer
```javascript
{
  messageType: "Accelerometer",
  timestampUtc: number,
  source: "CAN",
  data: {
    xAxis: number,
    yAxis: number,
    zAxis: number,
    unit: "g",
    canId: string,
    pumpSide: "Left" | "Right"
  }
}
```

#### InstantaneousAtrialPressure
```javascript
{
  messageType: "InstantaneousAtrialPressure",
  timestampUtc: number,
  source: "CAN",
  data: {
    averagePressure: number,
    unit: "mmHg",
    canId: string,
    pumpSide: "Left" | "Right"
  }
}
```

#### StrokewiseAtrialPressure
```javascript
{
  messageType: "StrokewiseAtrialPressure",
  timestampUtc: number,
  source: "CAN",
  data: {
    averagePressure: number,
    minPressure: number,
    maxPressure: number,
    unit: "mmHg",
    canId: string,
    pumpSide: "Left" | "Right"
  }
}
```

#### ManualPhysiologicalSettings
```javascript
{
  messageType: "ManualPhysiologicalSettings",
  timestampUtc: number,
  source: "CAN",
  data: {
    heartRate: number,
    leftStrokeLength: number,
    rightStrokeLength: number,
    unit: "bpm/mm",
    canId: string,
    pumpSide: "All"
  }
}
```

#### ActualStrokeLength
```javascript
{
  messageType: "ActualStrokeLength",
  timestampUtc: number,
  source: "CAN",
  data: {
    strokeLength: number,
    unit: "mm",
    canId: string,
    pumpSide: "Left" | "Right"
  }
}
```

#### Temperature
```javascript
{
  messageType: "Temperature",
  timestampUtc: number,
  source: "CAN",
  data: {
    temp1: number,
    temp2: number,
    temp3: number,
    temp4: number,
    unit: "°C",
    canId: string,
    pumpSide: "Left" | "Right"
  }
}
```

#### SupplyVoltage
```javascript
{
  messageType: "SupplyVoltage",
  timestampUtc: number,
  source: "CAN",
  data: {
    meanSupplyVoltage: number,
    minSupplyVoltage: number,
    maxSupplyVoltage: number,
    unit: "V",
    canId: string,
    pumpSide: "Left" | "Right"
  }
}
```

#### CPUData
```javascript
{
  messageType: "CPUData",
  timestampUtc: number,
  source: "CAN",
  data: {
    cpuLoad: number,
    unit: "%",
    canId: string,
    pumpSide: "Left" | "Right"
  }
}
```

#### StrokewisePressure (UDP)
```javascript
{
  messageType: "StrokewisePressure",
  timestampUtc: number,
  source: "UDP",
  data: {
    leftAtrial: { average: number, max: number, min: number, unit: "mmHg" } | null,
    rightAtrial: { average: number, max: number, min: number, unit: "mmHg" } | null,
    leftVentricular: { average: number, max: number, min: number, unit: "mmHg" } | null,
    rightVentricular: { average: number, max: number, min: number, unit: "mmHg" } | null,
    aortic: { average: number, max: number, min: number, unit: "mmHg" } | null,
    pulmonaryArterial: { average: number, max: number, min: number, unit: "mmHg" } | null,
    dataType: "Strokewise"
  }
}
```

#### StreamingPressure (UDP)
```javascript
{
  messageType: "StreamingPressure",
  timestampUtc: number,
  source: "UDP",
  data: {
    leftAtrial: number[] | null,
    rightAtrial: number[] | null,
    leftVentricular: number[] | null,
    rightVentricular: number[] | null,
    aortic: number[] | null,
    pulmonaryArterial: number[] | null,
    sampleRate: number,
    unit: "mmHg",
    dataType: "Streaming"
  }
}
```

### Mapping Strategy

#### Power Consumption
- Source: `MotorCurrent.data.combinedCurrent`
- Calculation: Assume voltage is available from `SupplyVoltage`, calculate power as `current × voltage`
- Target: `LeftHeart.PowerConsumption` or `RightHeart.PowerConsumption` based on `pumpSide`

#### Atrial Pressure
- Source: `InstantaneousAtrialPressure.data.averagePressure` or `StrokewiseAtrialPressure.data.averagePressure`
- Target: `LeftHeart.AtrialPressure` or `RightHeart.AtrialPressure` based on `pumpSide`

#### Stroke Length
- Source: `ManualPhysiologicalSettings.data.leftStrokeLength` / `rightStrokeLength` for target
- Source: `ActualStrokeLength.data.strokeLength` for actual
- Target: `LeftHeart.TargetStrokeLen`, `LeftHeart.ActualStrokeLen` (and Right equivalents)

#### Heart Rate
- Source: `ManualPhysiologicalSettings.data.heartRate`
- Target: `HeartRate` (top-level field)

#### Cardiac Output
- Calculation: Based on heart rate and stroke length
- Formula: `CardiacOutput = (HeartRate × StrokeLength × PumpCrossSectionArea) / 1000` (L/min)
- Note: Pump cross-section area is a constant based on pump design
- Target: `LeftHeart.CardiacOutput` or `RightHeart.CardiacOutput`

#### Medical Sensor Pressures
- Source: `StrokewisePressure.data.*`
- Mapping:
  - `leftAtrial` → `LeftHeart.MedicalPressure`
  - `rightAtrial` → `RightHeart.MedicalPressure`
  - `pulmonaryArterial` → `PAPSensor`
  - `aortic` → `AoPSensor`
- Format: `{ PrimaryValue: average, SecondaryValue: null, unit: 'mmHg' }`

#### System Health
- Temperature: Average of `temp1`, `temp2`, `temp3`, `temp4` from `Temperature` message
- Voltage: `meanSupplyVoltage` from `SupplyVoltage` message
- CPU Load: `cpuLoad` from `CPUData` message
- Accelerometer: Magnitude calculated as `sqrt(x² + y² + z²)` from `Accelerometer` message

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Message parsing preserves valid messages
*For any* valid telemetry message with a messageType field, parsing should succeed and extract the message structure correctly
**Validates: Requirements 1.1**

### Property 2: Messages are ordered by timestamp
*For any* sequence of telemetry messages with timestampUtc fields, processing should handle them in timestamp order
**Validates: Requirements 1.2**

### Property 3: Message source is tracked
*For any* telemetry message with a source field, the system should correctly identify whether it originated from CAN or UDP
**Validates: Requirements 1.3**

### Property 4: Pump side routing is correct
*For any* telemetry message with a pumpSide field, the data should be routed to the appropriate heart chamber (Left, Right, or All)
**Validates: Requirements 1.4**

### Property 5: Malformed messages don't crash the server
*For any* malformed telemetry message, the server should log the error and continue processing subsequent valid messages
**Validates: Requirements 1.5**

### Property 6: Power consumption extraction is correct
*For any* MotorCurrent message, power consumption data should be correctly extracted and assigned to the specified pump side
**Validates: Requirements 2.1**

### Property 7: Atrial pressure updates correctly
*For any* InstantaneousAtrialPressure message, the atrial pressure for the specified pump side should be updated
**Validates: Requirements 2.2**

### Property 8: Strokewise pressure updates all values
*For any* StrokewiseAtrialPressure message, the min, max, and average atrial pressure values should all be updated
**Validates: Requirements 2.3**

### Property 9: Physiological settings update multiple fields
*For any* ManualPhysiologicalSettings message, heart rate and stroke length for both pump sides should be updated
**Validates: Requirements 2.4**

### Property 10: Actual stroke length updates correctly
*For any* ActualStrokeLength message, the actual stroke length for the specified pump side should be updated
**Validates: Requirements 2.5**

### Property 11: Temperature data is stored correctly
*For any* Temperature message, temperature readings should be stored for the specified pump side
**Validates: Requirements 2.6**

### Property 12: Voltage data is stored correctly
*For any* SupplyVoltage message, voltage metrics should be stored for the specified pump side
**Validates: Requirements 2.7**

### Property 13: CPU data is stored correctly
*For any* CPUData message, CPU load should be stored for the specified pump side
**Validates: Requirements 2.8**

### Property 14: UDP pressure data updates sensors
*For any* StrokewisePressure message from UDP, medical sensor pressure readings should be updated
**Validates: Requirements 2.9**

### Property 15: Streaming pressure data is buffered
*For any* StreamingPressure message from UDP, the pressure data should be buffered for real-time display
**Validates: Requirements 2.10**

### Property 16: Aggregated state has required heart fields
*For any* aggregated state output, it should include LeftHeart and RightHeart objects with PowerConsumption, AtrialPressure, CardiacOutput, and stroke length fields
**Validates: Requirements 3.1**

### Property 17: Aggregated state has numeric heart rate
*For any* aggregated state output, it should include HeartRate as a top-level numeric field
**Validates: Requirements 3.2**

### Property 18: Aggregated state has sensor objects
*For any* aggregated state output, it should include sensor objects (CVPSensor, PAPSensor, AoPSensor, ArtPressSensor) with PrimaryValue and unit fields
**Validates: Requirements 3.3**

### Property 19: Aggregated state has SystemId
*For any* aggregated state output, it should include a SystemId field for device identification
**Validates: Requirements 3.4**

### Property 20: Aggregated state has StatusData
*For any* aggregated state output, it should include StatusData with system health indicators
**Validates: Requirements 3.5**

### Property 21: Cardiac output calculation is correct
*For any* heart rate and stroke length values, the calculated cardiac output should follow the formula: (heart rate × stroke length × pump cross-section area) / 1000
**Validates: Requirements 4.1**

### Property 22: Cardiac output routes to correct side
*For any* cardiac output calculation, the value should be assigned to the appropriate pump side
**Validates: Requirements 4.2**

### Property 23: Missing data doesn't break cardiac output
*For any* state with insufficient data for cardiac output calculation, the value should be set to zero or retain the previous value
**Validates: Requirements 4.3**

### Property 24: Left atrial pressure maps correctly
*For any* StrokewisePressure data with leftAtrial values, LeftHeart.MedicalPressure should be updated
**Validates: Requirements 5.1**

### Property 25: Right atrial pressure maps correctly
*For any* StrokewisePressure data with rightAtrial values, RightHeart.MedicalPressure should be updated
**Validates: Requirements 5.2**

### Property 26: Pulmonary arterial pressure maps to PAPSensor
*For any* StrokewisePressure data with pulmonaryArterial values, PAPSensor should be updated
**Validates: Requirements 5.3**

### Property 27: Aortic pressure maps to AoPSensor
*For any* StrokewisePressure data with aortic values, AoPSensor should be updated
**Validates: Requirements 5.4**

### Property 28: Pressure fields map to sensor structure
*For any* pressure data with average, min, and max fields, these should map to PrimaryValue, min, and max in the sensor object
**Validates: Requirements 5.5**

### Property 29: State updates trigger broadcasts
*For any* state update in the Message Aggregator, the WebSocket Server should broadcast the aggregated state to all connected clients
**Validates: Requirements 6.1**

### Property 30: Broadcasts include timestamp
*For any* broadcast from the WebSocket Server, it should include a timestamp field
**Validates: Requirements 6.2**

### Property 31: Timeout preserves last state
*For any* timeout period without telemetry, the WebSocket Server should continue broadcasting the last known state
**Validates: Requirements 6.3**

### Property 32: Broadcasts preserve SystemId
*For any* broadcast from the WebSocket Server, it should preserve the SystemId for client filtering
**Validates: Requirements 6.4**

### Property 33: High temperature triggers highlighting
*For any* temperature value exceeding the warning threshold, the Dashboard UI should highlight the temperature display
**Validates: Requirements 7.4**

### Property 34: Abnormal voltage triggers highlighting
*For any* voltage value outside the normal operating range, the Dashboard UI should highlight the voltage display
**Validates: Requirements 7.5**

### Property 35: Accelerometer data is stored completely
*For any* Accelerometer message, x, y, and z axis values should all be stored
**Validates: Requirements 8.1**

### Property 36: Accelerometer magnitude is calculated
*For any* accelerometer data, the Dashboard UI should calculate and display the magnitude as sqrt(x² + y² + z²)
**Validates: Requirements 8.2**

### Property 37: High acceleration triggers warning
*For any* accelerometer magnitude exceeding the threshold, the Dashboard UI should display a warning indicator
**Validates: Requirements 8.3**

### Property 38: Missing fields use defaults
*For any* telemetry message missing expected fields, the Message Aggregator should use default values for missing fields
**Validates: Requirements 9.1**

### Property 39: Partial data is handled gracefully
*For any* state where telemetry for one pump side is unavailable, the Dashboard UI should display the available side and indicate the other as unavailable
**Validates: Requirements 9.2**

### Property 40: Recovery after gap works correctly
*For any* telemetry gap followed by resumed data, the Message Aggregator should resume normal operation without requiring a restart
**Validates: Requirements 9.4**

### Property 41: Connection logic is preserved
*For any* client connection, the WebSocket Server should maintain the existing authentication and system selection logic
**Validates: Requirements 10.1**

### Property 42: Broadcasts are filtered by SystemId
*For any* broadcast, the WebSocket Server should send only to clients watching the appropriate SystemId
**Validates: Requirements 10.2**

### Property 43: Device messages are broadcast
*For any* device message from a client, the WebSocket Server should broadcast it to all connected clients
**Validates: Requirements 10.3**

### Property 44: Disconnected systems are removed
*For any* system disconnection, the WebSocket Server should remove it from the available systems list
**Validates: Requirements 10.4**

### Property 45: Chart data extraction works correctly
*For any* aggregated state update, the ChartManager should extract numeric values for charting
**Validates: Requirements 11.1**

### Property 46: Chart buffer is bounded
*For any* sequence of chart data updates, the ChartManager should limit stored data points to prevent unbounded memory growth
**Validates: Requirements 11.3**

### Property 47: Missing chart data is handled
*For any* chart with unavailable data, the ChartManager should display zero or the last known value
**Validates: Requirements 11.4**

### Property 48: Atoms update from WebSocket state
*For any* aggregated state received via WebSocket, the corresponding Jotai atoms should be updated
**Validates: Requirements 12.2**

## Error Handling

### Server-Side Error Handling

1. **Message Parsing Errors**
   - Invalid JSON: Log error, continue processing
   - Missing required fields: Use default values, log warning
   - Invalid field types: Coerce to expected type or use default

2. **State Aggregation Errors**
   - Unknown message type: Log warning, ignore message
   - Invalid pump side: Log error, ignore message
   - Calculation errors: Use previous value, log error

3. **WebSocket Errors**
   - Connection loss: Clean up client state, notify other clients
   - Broadcast failure: Log error, retry once
   - System timeout: Mark system as unavailable, notify clients

### Client-Side Error Handling

1. **WebSocket Connection Errors**
   - Connection failure: Display error message, retry with exponential backoff
   - Message parsing error: Log error, continue processing
   - Unexpected disconnection: Attempt reconnection

2. **State Update Errors**
   - Invalid state structure: Use previous state, log error
   - Atom update failure: Log error, retry update
   - Missing required fields: Use default values

3. **UI Rendering Errors**
   - Missing data: Display placeholder or last known value
   - Invalid values: Display error indicator
   - Component errors: Use React error boundaries

## Testing Strategy

### Unit Testing

Unit tests will verify individual components and functions:

1. **Message Parser Tests**
   - Valid message parsing
   - Invalid message rejection
   - Field extraction accuracy

2. **State Aggregator Tests**
   - Individual message type handling
   - State update correctness
   - Default value handling

3. **Calculation Tests**
   - Cardiac output calculation
   - Accelerometer magnitude calculation
   - Power consumption calculation

4. **Atom Update Tests**
   - Atom initialization
   - Update from WebSocket state
   - Multiple simultaneous updates

### Property-Based Testing

Property-based tests will verify correctness properties across many random inputs using the `fast-check` library for JavaScript. Each test will run a minimum of 100 iterations.

**Test Configuration**:
```javascript
import fc from 'fast-check'

// Run each property test with 100 iterations
const testConfig = { numRuns: 100 }
```

**Property Test Structure**:
Each property-based test will:
1. Generate random valid inputs
2. Execute the system under test
3. Verify the correctness property holds
4. Be tagged with the property number from this design document

**Example Property Test**:
```javascript
// Feature: telemetry-conversion, Property 1: Message parsing preserves valid messages
test('Property 1: Valid messages parse correctly', () => {
  fc.assert(
    fc.property(
      fc.record({
        messageType: fc.constantFrom('MotorCurrent', 'Temperature', 'Accelerometer'),
        timestampUtc: fc.integer({ min: 0 }),
        source: fc.constantFrom('CAN', 'UDP'),
        data: fc.object()
      }),
      (message) => {
        const parser = new MessageParser()
        const result = parser.parse(JSON.stringify(message))
        return result !== null && result.messageType === message.messageType
      }
    ),
    testConfig
  )
})
```

### Integration Testing

Integration tests will verify component interactions:

1. **Server Integration Tests**
   - Message flow from WebSocket to broadcast
   - State aggregation across multiple messages
   - Client filtering by SystemId

2. **Client Integration Tests**
   - WebSocket connection and state updates
   - Atom updates triggering UI re-renders
   - Chart updates from state changes

3. **End-to-End Tests**
   - Complete telemetry flow from device to UI
   - Multi-client scenarios
   - System disconnection and reconnection

### Manual Testing

Manual testing will verify:

1. **UI Appearance**
   - New System Health section displays correctly
   - Temperature/voltage highlighting works
   - Accelerometer warnings appear

2. **User Interactions**
   - System selection still works
   - Message sending still works
   - Chart interactions still work

3. **Performance**
   - UI remains responsive with high message rates
   - Memory usage stays bounded
   - No memory leaks over extended operation
