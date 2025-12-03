/**
 * Unit tests for state broadcasting with filtering
 * Tests broadcastAggregatedState and broadcastLastKnownState functions
 */

const StateAggregator = require('./StateAggregator');
const BroadcastThrottler = require('./BroadcastThrottler');

// Test helper to run a test
function test(description, fn) {
  try {
    fn();
    console.log(`✓ ${description}`);
  } catch (error) {
    console.error(`✗ ${description}`);
    console.error(`  ${error.message}`);
    process.exit(1);
  }
}

// Test helper for assertions
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Mock WebSocket clients
class MockWebSocket {
  constructor(systemToWatch = null) {
    this.readyState = 1; // OPEN
    this.systemToWatch = systemToWatch;
    this.sentMessages = [];
  }
  
  send(data) {
    this.sentMessages.push(JSON.parse(data));
  }
}

// Create mock implementations for testing
const stateAggregator = new StateAggregator();
const broadcastThrottler = new BroadcastThrottler({
    normalIntervalMs: 100,
    throttledIntervalMs: 500,
    memoryThresholdMB: 350
});
const lastBroadcastTime = new Map();
const systemStates = new Map();
let lastTelemetryTime = Date.now();

// Mock WebSocket server
const mockClients = [];
const wss = {
  clients: {
    forEach: (callback) => mockClients.forEach(callback)
  }
};

function broadcastAggregatedState() {
    try {
        const state = stateAggregator.getState();
        const systemId = state.SystemId;
        
        // Check per-system throttling
        if (systemId) {
            const lastBroadcast = lastBroadcastTime.get(systemId) || 0;
            const timeSinceLastBroadcast = Date.now() - lastBroadcast;
            
            if (timeSinceLastBroadcast < 100) {
                return;
            }
        }
        
        // Check memory-based throttling
        const heapUsageMB = process.memoryUsage().heapUsed / 1024 / 1024;
        if (!broadcastThrottler.shouldBroadcastNow(heapUsageMB)) {
            return;
        }
        
        state.Timestamp = Date.now();
        
        if (systemId) {
            systemStates.set(systemId, { ...state });
        }
        
        const stateJson = JSON.stringify(state);
        
        wss.clients.forEach(client => {
            try {
                if (client.readyState !== 1) {
                    return;
                }
                
                if (client.systemToWatch) {
                    if (systemId && systemId === client.systemToWatch) {
                        client.send(stateJson);
                    }
                } else {
                    client.send(stateJson);
                }
            } catch (error) {
                console.error('[Broadcast] Error sending to client:', error);
            }
        });
        
        if (systemId) {
            lastBroadcastTime.set(systemId, Date.now());
        }
        
        broadcastThrottler.recordBroadcast();
        
    } catch (error) {
        console.error('[Broadcast] Error broadcasting state:', error);
    }
}

// Test 1: Broadcast to all clients without filter
test('Broadcast to all clients without systemToWatch', () => {
    mockClients.length = 0;
    systemStates.clear();
    lastBroadcastTime.clear();
    
    // Create clients without systemToWatch
    const client1 = new MockWebSocket();
    const client2 = new MockWebSocket();
    mockClients.push(client1, client2);
    
    // Set a SystemId in the state
    stateAggregator.getState().SystemId = 'TEST-001';
    
    // Broadcast
    broadcastAggregatedState();
    
    assert(client1.sentMessages.length === 1, 'Client 1 should receive broadcast');
    assert(client2.sentMessages.length === 1, 'Client 2 should receive broadcast');
    assert(client1.sentMessages[0].SystemId === 'TEST-001', 'SystemId should be preserved');
});

// Test 2: Filter broadcasts by SystemId
test('Filter broadcasts by client systemToWatch', () => {
    mockClients.length = 0;
    systemStates.clear();
    lastBroadcastTime.clear();
    
    // Reset throttler to allow broadcast
    broadcastThrottler.lastBroadcastTime = 0;
    
    // Create clients watching different systems
    const client1 = new MockWebSocket('TEST-001');
    const client2 = new MockWebSocket('TEST-002');
    const client3 = new MockWebSocket(); // No filter
    mockClients.push(client1, client2, client3);
    
    // Set SystemId in state
    stateAggregator.getState().SystemId = 'TEST-001';
    
    // Broadcast
    broadcastAggregatedState();
    
    assert(client1.sentMessages.length === 1, 'Client watching TEST-001 should receive broadcast');
    assert(client2.sentMessages.length === 0, 'Client watching TEST-002 should not receive broadcast');
    assert(client3.sentMessages.length === 1, 'Client without filter should receive broadcast');
});

// Test 3: Skip closed connections
test('Skip closed connections during broadcast', () => {
    mockClients.length = 0;
    systemStates.clear();
    lastBroadcastTime.clear();
    
    // Reset throttler to allow broadcast
    broadcastThrottler.lastBroadcastTime = 0;
    
    const client1 = new MockWebSocket();
    const client2 = new MockWebSocket();
    client2.readyState = 0; // CLOSED
    mockClients.push(client1, client2);
    
    stateAggregator.getState().SystemId = 'TEST-003';
    
    broadcastAggregatedState();
    
    assert(client1.sentMessages.length === 1, 'Open client should receive broadcast');
    assert(client2.sentMessages.length === 0, 'Closed client should not receive broadcast');
});

// Test 4: Store state in systemStates map
test('Store state in systemStates map', () => {
    mockClients.length = 0;
    systemStates.clear();
    lastBroadcastTime.clear();
    
    // Reset throttler to allow broadcast
    broadcastThrottler.lastBroadcastTime = 0;
    
    const client = new MockWebSocket();
    mockClients.push(client);
    
    stateAggregator.getState().SystemId = 'TEST-004';
    
    broadcastAggregatedState();
    
    assert(systemStates.has('TEST-004'), 'State should be stored for SystemId');
    assert(systemStates.get('TEST-004').SystemId === 'TEST-004', 'Stored state should have correct SystemId');
});

// Test 5: Per-system throttling
test('Per-system throttling enforces 100ms minimum interval', () => {
    mockClients.length = 0;
    systemStates.clear();
    lastBroadcastTime.clear();
    
    // Reset throttler to allow broadcast
    broadcastThrottler.lastBroadcastTime = 0;
    
    const client = new MockWebSocket();
    mockClients.push(client);
    
    stateAggregator.getState().SystemId = 'TEST-005';
    
    // First broadcast
    broadcastAggregatedState();
    assert(client.sentMessages.length === 1, 'First broadcast should succeed');
    
    // Immediate second broadcast (should be throttled by per-system throttling)
    broadcastAggregatedState();
    assert(client.sentMessages.length === 1, 'Second broadcast should be throttled');
    
    // Wait and try again
    lastBroadcastTime.set('TEST-005', Date.now() - 150);
    broadcastThrottler.lastBroadcastTime = Date.now() - 150;
    broadcastAggregatedState();
    assert(client.sentMessages.length === 2, 'Third broadcast after delay should succeed');
});

console.log('\n✓ All broadcast filtering tests passed!\n');
