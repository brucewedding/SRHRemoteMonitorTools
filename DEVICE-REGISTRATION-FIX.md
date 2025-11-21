# Device Registration Fix

## Issue

When testing locally, the UI couldn't connect because:
1. Device (telemetry sender) connects to server
2. Device sends telemetry messages
3. UI client connects
4. Server says "No systems available"
5. UI client disconnects

## Root Cause

When a device connected with `type=device&SystemId=TEST-SYSTEM-001`, the server:
- ✅ Stored the SystemId
- ✅ Set it in the state aggregator
- ❌ **Did NOT register it as an available system**

This meant UI clients couldn't find any systems to watch.

## Fix Applied

Updated `server/fastify-server.js` to:

1. **Register device as a system** when it connects
2. **Connect waiting clients** to the new system automatically
3. **Broadcast systems list** so UI knows the system is available

### Code Changes

When a device connects with a SystemId:
```javascript
// Register this device as an available system
if (!connectedSystems.has(deviceSystemId)) {
  connectedSystems.set(deviceSystemId, new Set());
}

// Connect any waiting clients to this new system
if (waitingClients.size > 0) {
  waitingClients.forEach(client => {
    if (client.readyState === 1) {
      connectClientToSystem(client, deviceSystemId);
    }
  });
  waitingClients.clear();
}
```

## How to Test

### Step 1: Restart the Server
Stop the current server (Ctrl+C) and restart:
```bash
node server/fastify-server.js
```

### Step 2: Start Telemetry Sender
```bash
node server/send-sample-telemetry.js
```

You should now see in the server logs:
```
Device registered as system: TEST-SYSTEM-001
Connecting X waiting clients to TEST-SYSTEM-001
```

### Step 3: Open UI
The UI should now connect successfully and display data!

## Expected Behavior

**Before Fix** ❌:
```
[New WebSocket Connection] (device)
[New WebSocket Connection] (UI client)
No systems available, client added to waiting list
Client disconnected
```

**After Fix** ✅:
```
[New WebSocket Connection] (device)
Device registered as system: TEST-SYSTEM-001
[New WebSocket Connection] (UI client)
Connecting 1 waiting clients to TEST-SYSTEM-001
✓ UI receives telemetry data
```

## Files Modified

- `server/fastify-server.js` - Added device registration logic

## Testing Checklist

After restarting the server:
- [ ] Telemetry sender connects
- [ ] Server logs: "Device registered as system: TEST-SYSTEM-001"
- [ ] UI connects successfully
- [ ] Server logs: "Connecting X waiting clients..."
- [ ] UI displays telemetry data
- [ ] No "Client disconnected" messages

## Summary

The fix ensures that when a device connects, it's immediately registered as an available system, and any waiting UI clients are automatically connected to it. This solves the connection issue you were experiencing.
