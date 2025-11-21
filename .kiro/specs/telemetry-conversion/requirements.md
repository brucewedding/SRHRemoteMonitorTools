# Requirements Document

## Introduction

This document specifies the requirements for converting a legacy remote cardiac monitoring system to support a new telemetry data format. The current system receives aggregated heart pump status updates via WebSocket, displaying metrics for left/right heart chambers, pressures, and system status. The new system must process individual CAN bus and UDP telemetry messages, aggregate them appropriately, and display the data using the existing UI components with minimal modifications.

## Glossary

- **Legacy System**: The existing remote monitoring application that displays cardiac pump telemetry
- **CAN Bus**: Controller Area Network, a vehicle bus standard for communication between microcontrollers
- **UDP**: User Datagram Protocol, used for streaming pressure data
- **Telemetry Message**: Individual data packet containing specific sensor readings
- **Message Aggregator**: Component that collects individual telemetry messages and produces aggregated state
- **WebSocket Server**: Server component that receives telemetry and broadcasts to connected clients
- **Dashboard UI**: React-based user interface displaying cardiac pump metrics
- **Pump Side**: Indicates which heart chamber (Left, Right, or All) a measurement applies to
- **Jotai Atom**: A unit of state in the Jotai state management library
- **State Atom**: Individual Jotai atom representing a specific piece of telemetry data

## Requirements

### Requirement 1

**User Story:** As a system operator, I want the server to receive and process individual CAN/UDP telemetry messages, so that I can monitor cardiac pump systems using the new data format.

#### Acceptance Criteria

1. WHEN the WebSocket Server receives a telemetry message with a messageType field, THEN the WebSocket Server SHALL parse and validate the message structure
2. WHEN a telemetry message contains a timestampUtc field, THEN the WebSocket Server SHALL use this timestamp for message ordering
3. WHEN a telemetry message contains a source field, THEN the WebSocket Server SHALL track whether the message originated from CAN or UDP
4. WHEN a telemetry message contains a data field with pumpSide, THEN the WebSocket Server SHALL route the data to the appropriate heart chamber (Left, Right, or All)
5. WHEN the WebSocket Server receives malformed telemetry, THEN the WebSocket Server SHALL log the error and continue processing other messages

### Requirement 2

**User Story:** As a system operator, I want telemetry messages to be aggregated into a unified state representation, so that the existing UI can display the data without major restructuring.

#### Acceptance Criteria

1. WHEN the Message Aggregator receives MotorCurrent messages, THEN the Message Aggregator SHALL extract power consumption data for the specified pump side
2. WHEN the Message Aggregator receives InstantaneousAtrialPressure messages, THEN the Message Aggregator SHALL update atrial pressure for the specified pump side
3. WHEN the Message Aggregator receives StrokewiseAtrialPressure messages, THEN the Message Aggregator SHALL update min, max, and average atrial pressure values
4. WHEN the Message Aggregator receives ManualPhysiologicalSettings messages, THEN the Message Aggregator SHALL update heart rate and stroke length for both pump sides
5. WHEN the Message Aggregator receives ActualStrokeLength messages, THEN the Message Aggregator SHALL update the actual stroke length for the specified pump side
6. WHEN the Message Aggregator receives Temperature messages, THEN the Message Aggregator SHALL update temperature readings for the specified pump side
7. WHEN the Message Aggregator receives SupplyVoltage messages, THEN the Message Aggregator SHALL update voltage metrics for the specified pump side
8. WHEN the Message Aggregator receives CPUData messages, THEN the Message Aggregator SHALL update CPU load for the specified pump side
9. WHEN the Message Aggregator receives StrokewisePressure messages from UDP, THEN the Message Aggregator SHALL update medical sensor pressure readings
10. WHEN the Message Aggregator receives StreamingPressure messages from UDP, THEN the Message Aggregator SHALL buffer streaming pressure data for real-time display

### Requirement 3

**User Story:** As a system operator, I want the aggregated state to match the legacy data structure, so that existing UI components continue to function without modification.

#### Acceptance Criteria

1. WHEN the Message Aggregator produces aggregated state, THEN the Message Aggregator SHALL include LeftHeart and RightHeart objects with PowerConsumption, AtrialPressure, CardiacOutput, and stroke length fields
2. WHEN the Message Aggregator produces aggregated state, THEN the Message Aggregator SHALL include HeartRate as a top-level numeric field
3. WHEN the Message Aggregator produces aggregated state, THEN the Message Aggregator SHALL include sensor objects (CVPSensor, PAPSensor, AoPSensor, ArtPressSensor) with PrimaryValue and unit fields
4. WHEN the Message Aggregator produces aggregated state, THEN the Message Aggregator SHALL include a SystemId field for device identification
5. WHEN the Message Aggregator produces aggregated state, THEN the Message Aggregator SHALL include StatusData with system health indicators

### Requirement 4

**User Story:** As a system operator, I want cardiac output to be calculated from available telemetry, so that I can monitor pump performance.

#### Acceptance Criteria

1. WHEN the Message Aggregator has heart rate and stroke length data, THEN the Message Aggregator SHALL calculate cardiac output using an appropriate formula based on stroke length and heart rate
2. WHEN the Message Aggregator calculates cardiac output, THEN the Message Aggregator SHALL update the value for the appropriate pump side
3. WHEN the Message Aggregator lacks sufficient data for calculation, THEN the Message Aggregator SHALL set cardiac output to zero or retain the previous value

### Requirement 5

**User Story:** As a system operator, I want medical sensor pressure data to be mapped to the appropriate UI fields, so that I can monitor patient hemodynamics.

#### Acceptance Criteria

1. WHEN the Message Aggregator receives StrokewisePressure data with leftAtrial values, THEN the Message Aggregator SHALL update LeftHeart.MedicalPressure
2. WHEN the Message Aggregator receives StrokewisePressure data with rightAtrial values, THEN the Message Aggregator SHALL update RightHeart.MedicalPressure
3. WHEN the Message Aggregator receives StrokewisePressure data with pulmonaryArterial values, THEN the Message Aggregator SHALL update PAPSensor
4. WHEN the Message Aggregator receives StrokewisePressure data with aortic values, THEN the Message Aggregator SHALL update AoPSensor
5. WHEN the Message Aggregator receives pressure data with average, min, and max fields, THEN the Message Aggregator SHALL map these to PrimaryValue, min, and max in the sensor object

### Requirement 6

**User Story:** As a system operator, I want the WebSocket Server to broadcast aggregated state updates at regular intervals, so that the UI receives timely data.

#### Acceptance Criteria

1. WHEN the Message Aggregator updates state, THEN the WebSocket Server SHALL broadcast the aggregated state to all connected clients
2. WHEN the WebSocket Server broadcasts state, THEN the WebSocket Server SHALL include a timestamp field
3. WHEN no telemetry has been received for a configurable timeout period, THEN the WebSocket Server SHALL continue broadcasting the last known state
4. WHEN the WebSocket Server broadcasts state, THEN the WebSocket Server SHALL preserve the SystemId for client filtering

### Requirement 7

**User Story:** As a system operator, I want temperature and voltage data to be displayed in the UI, so that I can monitor system health.

#### Acceptance Criteria

1. WHEN the Dashboard UI receives aggregated state with temperature data, THEN the Dashboard UI SHALL display temperature readings in a new System Health section
2. WHEN the Dashboard UI receives aggregated state with voltage data, THEN the Dashboard UI SHALL display supply voltage, core voltage, and motor voltage
3. WHEN the Dashboard UI receives aggregated state with CPU load data, THEN the Dashboard UI SHALL display CPU utilization percentage
4. WHEN temperature exceeds a warning threshold, THEN the Dashboard UI SHALL highlight the temperature display
5. WHEN voltage falls outside normal operating range, THEN the Dashboard UI SHALL highlight the voltage display

### Requirement 8

**User Story:** As a system operator, I want accelerometer data to be available for analysis, so that I can detect abnormal vibrations.

#### Acceptance Criteria

1. WHEN the Message Aggregator receives Accelerometer messages, THEN the Message Aggregator SHALL store x, y, and z axis values
2. WHEN the Dashboard UI receives accelerometer data, THEN the Dashboard UI SHALL display the magnitude of acceleration
3. WHEN accelerometer magnitude exceeds a threshold, THEN the Dashboard UI SHALL display a warning indicator

### Requirement 9

**User Story:** As a system operator, I want the system to handle missing or incomplete telemetry gracefully, so that partial data loss does not crash the application.

#### Acceptance Criteria

1. WHEN a telemetry message is missing expected fields, THEN the Message Aggregator SHALL use default values for missing fields
2. WHEN telemetry for one pump side is unavailable, THEN the Dashboard UI SHALL display the available pump side data and indicate the other side as unavailable
3. WHEN no telemetry has been received for an extended period, THEN the Dashboard UI SHALL display a "No Data" indicator
4. WHEN telemetry resumes after a gap, THEN the Message Aggregator SHALL resume normal operation without requiring a restart

### Requirement 10

**User Story:** As a developer, I want the conversion to preserve existing WebSocket connection management, so that multi-user monitoring continues to function.

#### Acceptance Criteria

1. WHEN clients connect to the WebSocket Server, THEN the WebSocket Server SHALL maintain the existing authentication and system selection logic
2. WHEN the WebSocket Server broadcasts aggregated state, THEN the WebSocket Server SHALL send to all clients watching the appropriate SystemId
3. WHEN clients send device messages, THEN the WebSocket Server SHALL continue to broadcast these messages to all connected clients
4. WHEN a system disconnects, THEN the WebSocket Server SHALL remove it from the available systems list

### Requirement 11

**User Story:** As a developer, I want chart data to be updated with the new telemetry format, so that historical trends remain visible.

#### Acceptance Criteria

1. WHEN the ChartManager receives aggregated state updates, THEN the ChartManager SHALL extract numeric values for charting
2. WHEN the ChartManager updates charts, THEN the ChartManager SHALL maintain the existing chart types (heart rate, power, pressure, cardiac output, stroke length)
3. WHEN the ChartManager stores chart data, THEN the ChartManager SHALL limit data points to prevent memory growth
4. WHEN chart data is unavailable, THEN the ChartManager SHALL display zero or the last known value

### Requirement 12

**User Story:** As a developer, I want to use Jotai atoms for frontend state management, so that telemetry data updates are reactive and components re-render efficiently.

#### Acceptance Criteria

1. WHEN the Dashboard UI initializes, THEN the Dashboard UI SHALL define Jotai atoms for each telemetry value (heart rate, pressures, temperatures, voltages, etc.)
2. WHEN the WebSocket receives aggregated state, THEN the Dashboard UI SHALL update the corresponding Jotai atoms
3. WHEN a Jotai atom value changes, THEN the Dashboard UI SHALL trigger re-renders only for components that consume that specific atom
4. WHEN UI components need telemetry data, THEN the UI components SHALL read from Jotai atoms using useAtom or useAtomValue hooks
5. WHEN multiple telemetry values update simultaneously, THEN the Dashboard UI SHALL batch atom updates to minimize re-renders
