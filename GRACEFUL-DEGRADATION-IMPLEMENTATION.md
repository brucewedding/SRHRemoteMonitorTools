# Graceful Degradation Implementation

## Overview

This document describes the implementation of graceful degradation features for the telemetry conversion system, addressing Requirements 9.1, 9.2, and 9.4.

## Requirements Addressed

### Requirement 9.1: Default Value Handling
**WHEN a telemetry message is missing expected fields, THEN the Message Aggregator SHALL use default values for missing fields**

**Implementation:**
- StateAggregator already initializes all fields with sensible defaults (0 for numbers, '-' for strings)
- The `createInitialState()`, `createHeartData()`, and `createSensorData()` methods ensure all fields have default values
- Missing fields in incoming messages don't crash the system; they simply retain their default values
- Unknown message types are logged but don't prevent processing of subsequent messages

### Requirement 9.2: Partial Data Display
**WHEN telemetry for one pump side is unavailable, THEN the Dashboard UI SHALL display the available pump side data and indicate the other side as unavailable**

**WHEN no telemetry has been received for an extended period, THEN the Dashboard UI SHALL display a "No Data" indicator**

**Implementation:**

#### Server-Side Tracking
Added telemetry status tracking to `StateAggregator`:
- `lastTelemetryTime`: Tracks when any telemetry was last received
- `leftHeartLastUpdate`: Tracks when left heart data was last received
- `rightHeartLastUpdate`: Tracks when right heart data was last received

The `getState()` method now includes a `_telemetryStatus` object with:
- `noDataReceived`: Boolean indicating if no data received for 30+ seconds
- `leftHeartAvailable`: Boolean indicating if left heart data received in last 10 seconds
- `rightHeartAvailable`: Boolean indicating if right heart data received in last 10 seconds
- Timestamp fields for debugging

#### Frontend Atoms
Added new Jotai atoms in `atoms.js`:
- `noDataReceivedAtom`: Tracks overall telemetry timeout
- `leftHeartAvailableAtom`: Tracks left heart data availability
- `rightHeartAvailableAtom`: Tracks right heart data availability

The `updateAtomsFromState()` function updates these atoms from the `_telemetryStatus` object.

#### UI Indicators
Updated `Dashboard.jsx` to display status:

1. **Global "No Data" Alert**: When `noDataReceived` is true, displays a prominent warning banner at the top of the dashboard:
   ```
   ⚠ No Data Received
   No telemetry data has been received for an extended period. Check device connection.
   ```

2. **Pump Side Indicators**: Each heart card (Left/Right) shows:
   - Reduced opacity (50%) when data is unavailable
   - "No Data" badge in the card header
   - Available data continues to display (last known values)

### Requirement 9.4: Recovery After Gap
**WHEN telemetry resumes after a gap, THEN the Message Aggregator SHALL resume normal operation without requiring a restart**

**Implementation:**
- The `updateState()` method updates `lastTelemetryTime` on every message
- Pump-side specific timestamps are updated based on the `pumpSide` field
- When telemetry resumes, the timestamps are automatically updated
- The `getState()` method recalculates availability status on every call
- No manual reset or restart is required; the system automatically recovers

## Timeouts

Two timeout thresholds are used:

1. **TELEMETRY_TIMEOUT**: 30 seconds
   - Used to detect complete loss of telemetry
   - Triggers the global "No Data" warning

2. **SIDE_TIMEOUT**: 10 seconds
   - Used to detect loss of data from individual pump sides
   - Triggers per-side "No Data" badges

These values can be adjusted in `StateAggregator.js` if needed.

## Testing

Created comprehensive tests in `server/GracefulDegradation.test.js`:

1. ✓ Default values for missing fields (Requirement 9.1)
2. ✓ Telemetry status tracking (Requirement 9.2)
3. ✓ Initial availability state
4. ✓ Left heart availability tracking (Requirement 9.2)
5. ✓ Right heart availability tracking (Requirement 9.2)
6. ✓ "All" pump side updates both sides (Requirement 9.2)
7. ✓ Recovery after telemetry gap (Requirement 9.4)
8. ✓ Timestamp tracking
9. ✓ Missing message fields handling (Requirement 9.1)
10. ✓ Unknown message types handling (Requirement 9.1)

All tests pass successfully.

## Files Modified

### Server
- `server/StateAggregator.js`: Added telemetry tracking and status reporting
- `server/GracefulDegradation.test.js`: New test file

### Frontend
- `src/atoms.js`: Added telemetry status atoms and update logic
- `src/pages/dashboard/Dashboard.jsx`: Added UI indicators for data availability

## Backward Compatibility

All changes are backward compatible:
- The `_telemetryStatus` object is added to state but doesn't affect existing fields
- UI changes are purely additive (new indicators)
- Existing functionality continues to work unchanged
- All existing tests continue to pass

## Usage

The graceful degradation features work automatically:

1. **Normal Operation**: When telemetry is flowing normally, no special indicators appear
2. **Partial Loss**: If one pump side stops sending data, that side's card shows reduced opacity and a "No Data" badge
3. **Complete Loss**: If no telemetry is received for 30+ seconds, a warning banner appears at the top
4. **Recovery**: When telemetry resumes, all indicators automatically clear

No configuration or manual intervention is required.
