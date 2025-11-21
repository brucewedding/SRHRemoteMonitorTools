# Quick Start Guide for Testing

## The Issue You Encountered

The WebSocket connection was failing for two reasons:
1. ❌ **Missing `/ws` path** - The UI was connecting to `ws://localhost:3000/?email=...` instead of `ws://localhost:3000/ws?email=...`
2. ⚠️ **No device connected** - The server shows "No systems available" because no device has connected yet

## Fix Applied

✅ Updated `src/pages/dashboard/Dashboard.jsx` to include the `/ws` path in the WebSocket URL.

## How to Test Properly

You need to start things in the correct order:

### Option 1: Quick Test (Recommended)

Open **3 terminals** and run these commands:

```bash
# Terminal 1: Start the server
node server/fastify-server.js

# Terminal 2: Start the telemetry sender (simulates a device)
node server/send-sample-telemetry.js

# Terminal 3: Start the frontend
npm run dev
```

Then open your browser to the frontend URL (usually http://localhost:5173).

### Option 2: Manual Step-by-Step

**Step 1: Start the Server**
```bash
node server/fastify-server.js
```
Wait for: `Server is running on port 3000`

**Step 2: Start the Telemetry Sender**
```bash
node server/send-sample-telemetry.js
```
Wait for: `✓ Connected to server` and `✓ All messages sent`

**Step 3: Start the Frontend**
```bash
npm run dev
```

**Step 4: Open Browser**
- Navigate to the frontend URL (e.g., http://localhost:5173)
- Log in if needed
- The dashboard should now connect and display data

## What You Should See

### In the Server Logs:
```
[New WebSocket Connection]
Connection Query Params: { systemToWatch: 'TEST-SYSTEM-001', url: '/ws?...' }
✓ Device connected
✓ UI client connected
```

### In the Browser Console:
```
[Connecting to WebSocket]: ws://localhost:3000/ws?email=...
[WebSocket Connected]
```

### In the Dashboard:
- Heart Rate: **100 bpm**
- Left Cardiac Output: **~80 L/min**
- Right Cardiac Output: **~8.5 L/min**
- Temperature: **43.0°C**
- Voltage: **16.9V**
- CPU Load: **20%**
- Accelerometer: **1.40g**
- Charts updating in real-time

## Troubleshooting

### "No systems available"
**Cause**: No device is connected
**Fix**: Make sure `send-sample-telemetry.js` is running

### "WebSocket connection failed"
**Cause**: Server not running or wrong URL
**Fix**: 
1. Verify server is running on port 3000
2. Check the WebSocket URL in browser console
3. Should be `ws://localhost:3000/ws?email=...` (note the `/ws`)

### "Connection closes immediately"
**Cause**: Server error or port conflict
**Fix**: Check server logs for errors

### No data in UI
**Cause**: Telemetry sender not running
**Fix**: Start `send-sample-telemetry.js`

## Testing Checklist

Once everything is running, verify:

- [ ] WebSocket connects successfully (check browser console)
- [ ] Heart rate displays: 100 bpm
- [ ] Cardiac output displays for both sides
- [ ] System Health section shows all 4 metrics
- [ ] Charts update in real-time
- [ ] No errors in browser console
- [ ] No errors in server logs

## Quick Test Script

If you want to verify everything works without the UI, run:

```bash
# Terminal 1: Start server
node server/fastify-server.js

# Terminal 2: Run automated test
node server/test-ui-connection.js
```

This will verify the server is working correctly.

## Summary

The fix has been applied to `Dashboard.jsx`. Now when you:
1. Start the server
2. Start the telemetry sender
3. Start the frontend

Everything should connect properly and you'll see live telemetry data in the dashboard!
