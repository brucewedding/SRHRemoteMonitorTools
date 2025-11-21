# WebSocket Connection Fix

## Issue Reported

When testing the UI locally, the WebSocket connection was failing with:
```
WebSocket connection to 'ws://localhost:3000/?email=...' failed: 
WebSocket is closed before the connection is established.
```

Server logs showed:
```
No systems available, client added to waiting list
Client disconnected
```

## Root Causes

### 1. Missing `/ws` Path in WebSocket URL ❌

**Problem**: The Dashboard was constructing the WebSocket URL without the `/ws` path:
- Incorrect: `ws://localhost:3000?email=...`
- Correct: `ws://localhost:3000/ws?email=...`

**Location**: `src/pages/dashboard/Dashboard.jsx` line ~170

**Original Code**:
```javascript
const wsHost = import.meta.env.DEV ? 'localhost:3000' : 'realheartremote.live/ws';
const wsUrl = `${wsProtocol}//${wsHost}${params.toString() ? '?' + params.toString() : ''}`;
```

**Fixed Code**:
```javascript
const wsHost = import.meta.env.DEV ? 'localhost:3000' : 'realheartremote.live';
const wsPath = '/ws';
const wsUrl = `${wsProtocol}//${wsHost}${wsPath}${params.toString() ? '?' + params.toString() : ''}`;
```

### 2. No Device Connected ⚠️

**Problem**: The UI was trying to connect before any device (telemetry source) was connected.

**Explanation**: 
- The server tracks connected "systems" (devices sending telemetry)
- When a UI client connects, it needs to watch a specific system
- If no systems are available, the client is added to a waiting list
- The connection then closes because there's nothing to watch

**Solution**: Start the telemetry sender before connecting with the UI.

## Fix Applied

### File Changed: `src/pages/dashboard/Dashboard.jsx`

**Change**: Added `/ws` path to WebSocket URL construction

**Impact**: 
- ✅ WebSocket now connects to the correct endpoint
- ✅ Server can properly handle the connection
- ✅ UI receives telemetry data

## How to Test Correctly

### Quick Start (Use the Batch File)

**Windows**:
```bash
start-test.bat
```

This automatically starts:
1. Fastify server
2. Telemetry sender
3. Frontend dev server

### Manual Start (3 Terminals)

**Terminal 1 - Server**:
```bash
node server/fastify-server.js
```

**Terminal 2 - Telemetry Sender**:
```bash
node server/send-sample-telemetry.js
```

**Terminal 3 - Frontend**:
```bash
npm run dev
```

Then open browser to http://localhost:5173

## Verification

### ✅ Successful Connection

**Browser Console**:
```
[Connecting to WebSocket]: ws://localhost:3000/ws?email=bruce.wedding@realheart.se
[WebSocket Connected]
```

**Server Logs**:
```
[New WebSocket Connection]
Connection Query Params: { systemToWatch: 'TEST-SYSTEM-001', url: '/ws?email=...' }
✓ Device connected
✓ UI client connected
```

**Dashboard Display**:
- Heart Rate: 100 bpm
- Cardiac Output: 80 L/min (left), 8.5 L/min (right)
- Temperature: 43.0°C
- Voltage: 16.9V
- CPU Load: 20%
- Accelerometer: 1.40g

### ❌ Failed Connection (Before Fix)

**Browser Console**:
```
WebSocket connection to 'ws://localhost:3000/?email=...' failed
```

**Server Logs**:
```
No systems available, client added to waiting list
Client disconnected
```

## Testing Order Matters

**Correct Order** ✅:
1. Start server
2. Start telemetry sender (device)
3. Start frontend
4. Open browser

**Incorrect Order** ❌:
1. Start server
2. Start frontend
3. Open browser
4. (No device connected → "No systems available")

## Additional Files Created

1. **start-test.bat** - Windows batch file to start all services
2. **start-test-environment.md** - Detailed testing guide
3. **WEBSOCKET-CONNECTION-FIX.md** - This document

## Related Files

- `server/send-sample-telemetry.js` - Simulates a device sending telemetry
- `server/test-ui-connection.js` - Automated test for connection flow
- `server/e2e-test.js` - Full end-to-end test

## Summary

✅ **Fix Applied**: Added `/ws` path to WebSocket URL in Dashboard.jsx

✅ **Testing Guide**: Created start-test.bat and documentation

✅ **Verification**: Connection now works correctly when services are started in the right order

The WebSocket connection issue is resolved. Follow the testing guide in `start-test-environment.md` for the correct startup sequence.
