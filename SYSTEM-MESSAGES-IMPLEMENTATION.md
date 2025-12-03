# System Messages Implementation - CanBusLoad and CanStatus

## Overview
This document describes the implementation of System message handling for `CanBusLoad` and `CanStatus` message types. These messages are sent from the device with `source: "System"` and are now properly parsed, processed, and displayed in the Dashboard UI.

## Changes Made

### 1. MessageParser.js
**File:** `server/MessageParser.js`

- Added `'CanBusLoad'` and `'CanStatus'` to the `SUPPORTED_MESSAGE_TYPES` list
- Updated source validation to accept `'System'` in addition to `'CAN'` and `'UDP'`

### 2. MessageTypeHandlers.js
**File:** `server/MessageTypeHandlers.js`

Added two new handler classes:

#### CanBusLoadHandler
- Processes `CanBusLoad` messages from System source
- Extracts `BusLoadPercentage` and `BusLoadText` from message data
- Applies color coding based on bus load percentage:
  - **Green (badge-success)**: ≤ 60%
  - **Yellow (badge-warning)**: 61-80%
  - **Red (badge-error)**: > 80%
- Updates `state.StatusData.BusLoad` with text and color

#### CanStatusHandler
- Processes `CanStatus` messages from System source
- Extracts status text (e.g., "Receiving", "Error", "Warning")
- Applies color coding based on status:
  - **Green (badge-success)**: "Receiving", "OK"
  - **Yellow (badge-warning)**: "Warning"
  - **Red (badge-error)**: "Error", "Fault"
  - **Blue (badge-info)**: Other statuses
- Updates `state.StatusData.CANStatus` with text and color

### 3. StateAggregator.js
**File:** `server/StateAggregator.js`

- Imported the new handler classes: `CanBusLoadHandler` and `CanStatusHandler`
- Registered handlers in the `initializeHandlers()` method:
  - `'CanBusLoad': new CanBusLoadHandler()`
  - `'CanStatus': new CanStatusHandler()`

## Message Format

### CanBusLoad Message
```json
{
  "messageType": "CanBusLoad",
  "timestampUtc": 1764688215049,
  "source": "System",
  "data": {
    "BusLoadPercentage": 8,
    "BusLoadText": "8.0%",
    "Unit": "%"
  }
}
```

### CanStatus Message
```json
{
  "messageType": "CanStatus",
  "timestampUtc": 1764689964181,
  "source": "System",
  "data": {
    "connectionStatus": "Receiving"
  }
}
```

## UI Display

The System Status section in the Dashboard displays these values:

```
System Status
┌─────────────┬─────────────┬─────────┬─────┬──────────┐
│   Int Lt    │   Int Rt    │ Strokes │ CAN │ Bus Load │
│     -       │     -       │  443061 │ Rec │   8.0%   │
└─────────────┴─────────────┴─────────┴─────┴──────────┘
```

- **CAN**: Shows the status from `CanStatus` messages
- **Bus Load**: Shows the percentage from `CanBusLoad` messages

Both fields use color-coded badges to indicate status:
- Green: Normal operation
- Yellow: Warning condition
- Red: Error or critical condition

## Data Flow

1. Device sends System message via WebSocket
2. `MessageParser` validates and parses the message
3. `StateAggregator` routes to appropriate handler
4. Handler updates `StatusData.BusLoad` or `StatusData.CANStatus`
5. State is broadcast to all connected clients
6. Dashboard receives update via WebSocket
7. `updateAtomsFromState()` updates Jotai atoms
8. React components re-render with new values

## Testing

The implementation was tested with various scenarios:
- ✓ Normal bus load (8%) → Green badge
- ✓ High bus load (65%) → Yellow badge
- ✓ Critical bus load (85%) → Red badge
- ✓ Receiving status → Green badge
- ✓ Error status → Red badge

All tests passed successfully.

## Backward Compatibility

The implementation maintains full backward compatibility:
- Existing message types continue to work unchanged
- Default values ("-" with badge-info) are shown when no data is received
- No changes required to the UI components (atoms.js already had these fields)

## Notes

- The handlers follow the same pattern as existing message type handlers
- Color thresholds can be adjusted in the handler classes if needed
- The implementation is consistent with the existing telemetry processing architecture
