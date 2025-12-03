# Memory Leak Fix - CircularBuffer Array Conversion

## Problem Analysis

Both Grok and ChatGPT were correct. The memory leak had **two sources**:

1. **Converting CircularBuffers to arrays inside `getState()` and caching them** - Every cache invalidation (every telemetry message) called `.toArray()` on 6 CircularBuffer instances and stored the result in `this.cachedState`
2. **Storing arrays in `systemStates` Map** - The serializable state (with arrays) was stored in the long-lived `systemStates` Map, causing constant allocation churn
3. **Heap fragmentation and old-space promotion** - Even though CircularBuffers have fixed capacity, creating 6 large arrays hundreds of times per minute caused heap fragmentation, promoted objects to old space, and prevented full GC recovery

This wasn't a "classic" unbounded leak, but a **steady-state inflation** from allocation pressure that caused slow memory creep overnight.

## Root Cause

```javascript
// OLD CODE - MEMORY LEAK
getState() {
  // ... 
  const state = { ...this.state };
  channels.forEach(channel => {
    const arr = state.StreamingPressure[channel].toArray(); // Creates new array
    state.StreamingPressure[channel] = arr; // Replaces buffer with array
  });
  this.cachedState = state; // Caches the arrays!
  return state;
}
```

Every cache invalidation → 6 new large arrays created → old arrays become garbage → heap grows unbounded.

## Solution Implemented

**Never cache or store the `.toArray()` result. Convert only at broadcast time.**

### Changes Made

1. **Simplified `getState()`** - Returns state with CircularBuffer instances intact (no conversion)
2. **Added `getSerializableState()`** - Converts CircularBuffers to arrays only when needed for JSON serialization
3. **Updated `broadcastAggregatedState()`** - Gets raw state first, stores trimmed version (without StreamingPressure) in `systemStates`, then gets serializable state only for broadcast
4. **Removed caching logic** - Eliminated `cachedState` and `cacheInvalidated` properties
5. **Trimmed `systemStates` storage** - Only stores state without StreamingPressure arrays to prevent long-lived array accumulation

### New Code

**StateAggregator.js:**
```javascript
// Returns state with CircularBuffers intact
getState() {
  const state = {
    ...this.state,
    Timestamp: Date.now(),
    _telemetryStatus: { /* ... */ }
  };
  return state;
}

// Converts to arrays ONLY at serialization time
getSerializableState() {
  const state = this.getState();
  
  if (state.StreamingPressure) {
    const serializable = {
      ...state,
      StreamingPressure: { ...state.StreamingPressure }
    };
    
    channels.forEach(channel => {
      if (serializable.StreamingPressure[channel] instanceof CircularBuffer) {
        serializable.StreamingPressure[channel] = 
          serializable.StreamingPressure[channel].toArray();
      }
    });
    
    return serializable;
  }
  
  return state;
}
```

**server.js / fastify-server.js (broadcastAggregatedState):**
```javascript
// Get raw state (with CircularBuffers intact) for storage
const rawState = stateAggregator.getState();

// Store TRIMMED state (without StreamingPressure arrays)
if (systemId) {
  const trimmedState = { ...rawState };
  delete trimmedState.StreamingPressure; // Prevent storing large arrays
  systemStates.set(systemId, trimmedState);
}

// Get serializable state (with arrays) ONLY for broadcast
// These arrays are short-lived and GC'd immediately after transmission
const state = stateAggregator.getSerializableState();
const stateJson = JSON.stringify(state);

// Broadcast to clients...
```

## Key Insight from Grok/ChatGPT Debate

**ChatGPT's correction:** The shallow copy in `getState()` protected `this.state`, so the original CircularBuffer instances were never lost - handlers continued pushing to live buffers correctly.

**Grok's critical addition:** The real issue was storing arrays in **two places**:
1. `this.cachedState` (now removed)
2. `systemStates` Map (now stores trimmed state without arrays)

The constant allocation churn (6 channels × 1000 elements × hundreds of times per minute) caused heap fragmentation and old-space promotion, preventing full GC recovery. This created a **steady-state inflation** rather than a classic unbounded leak.

## Expected Result

- **Memory should stabilize completely** within minutes
- No more unbounded heap growth
- Reduced GC pressure (arrays are now short-lived, die young in new-space)
- No heap fragmentation from repeated array allocations
- `systemStates` Map now stores lightweight objects without large arrays

## Verification

Monitor memory with:
```javascript
setInterval(() => {
  const { heapUsed, rss } = process.memoryUsage();
  console.log('Memory:', {
    heapMB: (heapUsed / 1024 / 1024).toFixed(2),
    rssMB: (rss / 1024 / 1024).toFixed(2),
    clients: wss.clients.size
  });
}, 10000);
```

Memory should remain stable over time, regardless of telemetry volume.
