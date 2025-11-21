# End-to-End Testing Guide

## Overview

This guide explains how to perform end-to-end testing of the telemetry conversion system. The automated tests have already verified server-side functionality. This guide helps you verify the UI displays data correctly.

## Automated Test Results

✓ **All automated tests passed!**

The automated test (`server/e2e-test.js`) verified:
- Server receives and processes 18 telemetry messages
- All message types are correctly parsed
- State aggregation works correctly
- Cardiac output calculations are accurate
- System health data is properly formatted
- All requirements are met

See `E2E-TEST-RESULTS.md` for detailed results.

## Running the Automated Test

```bash
# Make sure the server is running
node server/fastify-server.js

# In another terminal, run the test
node server/e2e-test.js
```

## Manual UI Testing

### Step 1: Start the Server

```bash
node server/fastify-server.js
```

The server will start on port 3000.

### Step 2: Start the Frontend

```bash
npm run dev
```

The frontend will start on port 5173 (or another port if 5173 is busy).

### Step 3: Send Sample Telemetry

In a new terminal, run the telemetry sender:

```bash
node server/send-sample-telemetry.js
```

This will continuously send sample telemetry messages every 5 seconds.

### Step 4: Verify UI Display

Open your browser to the frontend URL (e.g., http://localhost:5173) and verify:

#### Dashboard Display
- [ ] Heart rate shows **100 bpm**
- [ ] Left cardiac output shows **~80 L/min**
- [ ] Right cardiac output shows **~8.5 L/min**
- [ ] Stroke lengths display correctly
- [ ] Power consumption displays

#### System Health Section
- [ ] Temperature shows **43.0°C**
- [ ] Voltage shows **16.9V**
- [ ] CPU load shows **20%**
- [ ] Accelerometer shows **1.40g**

#### Charts
- [ ] All charts update in real-time
- [ ] Data points are added as telemetry arrives
- [ ] Charts don't grow unbounded (buffer limiting works)

#### Alerts (Test with Modified Data)
To test alerts, modify values in `sample-telemetry.json`:

**High Temperature Alert:**
- Change temp1-4 values to > 60 (e.g., 65)
- Verify temperature display is highlighted

**Voltage Out of Range Alert:**
- Change meanSupplyVoltage to < 12 or > 18
- Verify voltage display is highlighted

**High Acceleration Alert:**
- Change xAxis, yAxis, or zAxis to create magnitude > 2g
- Example: xAxis: 2.0, yAxis: 0.5, zAxis: 0.5
- Verify accelerometer warning indicator appears

### Step 5: Test Graceful Degradation

**Test Missing Data:**
1. Stop the telemetry sender (Ctrl+C)
2. Wait 30 seconds
3. Verify "No Data" indicator appears
4. Restart the sender
5. Verify system recovers and displays data again

**Test Partial Data:**
1. Edit `sample-telemetry.json` to remove all "Right" pump side messages
2. Restart the telemetry sender
3. Verify left heart data displays correctly
4. Verify right heart shows as unavailable or uses default values

## Expected Data Values

Based on `sample-telemetry.json`:

| Metric | Expected Value | Source Message |
|--------|---------------|----------------|
| Heart Rate | 100 bpm | ManualPhysiologicalSettings |
| Left Target Stroke | 160 mm | ManualPhysiologicalSettings |
| Right Target Stroke | 170 mm | ManualPhysiologicalSettings |
| Right Actual Stroke | 16.92 mm | ActualStrokeLength |
| Left Cardiac Output | 80.00 L/min | Calculated |
| Right Cardiac Output | 8.46 L/min | Calculated |
| Temperature | 43.0°C | Temperature (avg of 4 sensors) |
| Voltage | 16.9V | SupplyVoltage (mean) |
| CPU Load | 20% | CPUData |
| Accelerometer | 1.40g | Accelerometer (magnitude) |
| Left Atrial Pressure | 10.3 mmHg | InstantaneousAtrialPressure |
| Right Power | 1.5W | MotorCurrent |

## Troubleshooting

### Server Won't Start
- Check if port 3000 is already in use
- Try: `netstat -ano | findstr :3000` (Windows) or `lsof -i :3000` (Mac/Linux)
- Kill the process using the port or change the port in `fastify-server.js`

### No Data in UI
- Verify server is running and shows "Server is running on port 3000"
- Verify telemetry sender is running and shows "✓ All messages sent"
- Check browser console for WebSocket connection errors
- Verify WebSocket URL in frontend matches server address

### Charts Not Updating
- Check that ChartManager is properly integrated
- Verify atom updates are triggering re-renders
- Check browser console for JavaScript errors

### Alerts Not Triggering
- Verify threshold values in the code match test values
- Check that StatusData is being updated correctly
- Verify UI components are reading from the correct atoms

## Files Created

- `server/e2e-test.js` - Automated end-to-end test
- `server/send-sample-telemetry.js` - Continuous telemetry sender for UI testing
- `E2E-TEST-RESULTS.md` - Detailed test results
- `E2E-TEST-GUIDE.md` - This guide

## Success Criteria

The end-to-end test is successful when:

1. ✓ Automated test passes (already verified)
2. [ ] UI displays all telemetry data correctly
3. [ ] Charts update in real-time
4. [ ] System health section shows all metrics
5. [ ] Alerts trigger at appropriate thresholds
6. [ ] Graceful degradation works (no crashes with missing data)
7. [ ] System recovers after telemetry gap

## Next Steps

After completing manual UI verification:
1. Document any issues found
2. Fix any UI display problems
3. Adjust alert thresholds if needed
4. Consider adding more comprehensive UI tests
5. Test with real device telemetry (if available)
