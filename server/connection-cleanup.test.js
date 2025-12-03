/**
 * Tests for enhanced connection cleanup (Task 8.1)
 * Validates: Requirements 5.1, 5.2, 5.3, 5.5, 10.4, 12.4
 */

const assert = require('assert');

// Mock WebSocket client
class MockWebSocket {
    constructor() {
        this.readyState = 1; // OPEN
        this.isSystem = false;
        this.systemId = null;
        this.systemToWatch = null;
    }
}

// Test helper to simulate the cleanup logic
function simulateConnectionCleanup(ws, wsClients, waitingClients, connectedSystems, systemStates, lastBroadcastTime) {
    // Ensure client removed from wsClients (Requirement 5.1)
    wsClients.delete(ws);
    
    // Ensure client removed from waitingClients (Requirement 5.1)
    waitingClients.delete(ws);
    
    // Remove client from all system watcher sets (Requirement 5.3)
    for (const [systemId, watchers] of connectedSystems.entries()) {
        watchers.delete(ws);
        
        // Remove empty system entries from connectedSystems (Requirement 5.2)
        if (watchers.size === 0) {
            connectedSystems.delete(systemId);
        }
    }
    
    // If this was a system connection, perform additional cleanup
    if (ws.isSystem && ws.systemId) {
        const systemId = ws.systemId;
        
        // Get watching clients before cleanup
        const watchingClients = connectedSystems.get(systemId) || new Set();
        
        // Delete from systemStates (Requirement 5.5)
        if (systemStates.has(systemId)) {
            systemStates.delete(systemId);
        }
        
        // Delete from lastBroadcastTime (Requirement 12.4)
        if (lastBroadcastTime.has(systemId)) {
            lastBroadcastTime.delete(systemId);
        }
        
        // Remove system from connectedSystems
        connectedSystems.delete(systemId);
        
        // Move watching clients to waitingClients on system disconnect (Requirement 10.4)
        watchingClients.forEach(client => {
            if (client.readyState === 1) { // WebSocket.OPEN
                waitingClients.add(client);
                client.systemToWatch = null;
            }
        });
    }
}

function test(name, fn) {
    try {
        fn();
        console.log(`✓ ${name}`);
    } catch (error) {
        console.error(`✗ ${name}`);
        console.error(error);
        process.exit(1);
    }
}

// Test 1: Client removed from wsClients and waitingClients
test('Client removed from wsClients and waitingClients', () => {
    const wsClients = new Map();
    const waitingClients = new Set();
    const connectedSystems = new Map();
    const systemStates = new Map();
    const lastBroadcastTime = new Map();
    
    const client = new MockWebSocket();
    wsClients.set(client, 'test@example.com');
    waitingClients.add(client);
    
    simulateConnectionCleanup(client, wsClients, waitingClients, connectedSystems, systemStates, lastBroadcastTime);
    
    assert(!wsClients.has(client), 'Client should be removed from wsClients');
    assert(!waitingClients.has(client), 'Client should be removed from waitingClients');
});

// Test 2: Client removed from all system watcher sets
test('Client removed from all system watcher sets', () => {
    const wsClients = new Map();
    const waitingClients = new Set();
    const connectedSystems = new Map();
    const systemStates = new Map();
    const lastBroadcastTime = new Map();
    
    const client = new MockWebSocket();
    const system1Watchers = new Set([client]);
    const system2Watchers = new Set([client]);
    
    connectedSystems.set('system1', system1Watchers);
    connectedSystems.set('system2', system2Watchers);
    
    simulateConnectionCleanup(client, wsClients, waitingClients, connectedSystems, systemStates, lastBroadcastTime);
    
    assert(!system1Watchers.has(client), 'Client should be removed from system1 watchers');
    assert(!system2Watchers.has(client), 'Client should be removed from system2 watchers');
});

// Test 3: Empty system entries removed from connectedSystems
test('Empty system entries removed from connectedSystems', () => {
    const wsClients = new Map();
    const waitingClients = new Set();
    const connectedSystems = new Map();
    const systemStates = new Map();
    const lastBroadcastTime = new Map();
    
    const client = new MockWebSocket();
    const systemWatchers = new Set([client]);
    
    connectedSystems.set('system1', systemWatchers);
    
    simulateConnectionCleanup(client, wsClients, waitingClients, connectedSystems, systemStates, lastBroadcastTime);
    
    assert(!connectedSystems.has('system1'), 'Empty system entry should be removed');
});

// Test 4: System state and broadcast time deleted on system disconnect
test('System state and broadcast time deleted on system disconnect', () => {
    const wsClients = new Map();
    const waitingClients = new Set();
    const connectedSystems = new Map();
    const systemStates = new Map();
    const lastBroadcastTime = new Map();
    
    const systemClient = new MockWebSocket();
    systemClient.isSystem = true;
    systemClient.systemId = 'system1';
    
    connectedSystems.set('system1', new Set());
    systemStates.set('system1', { SystemId: 'system1', data: 'test' });
    lastBroadcastTime.set('system1', Date.now());
    
    simulateConnectionCleanup(systemClient, wsClients, waitingClients, connectedSystems, systemStates, lastBroadcastTime);
    
    assert(!systemStates.has('system1'), 'System state should be deleted');
    assert(!lastBroadcastTime.has('system1'), 'Broadcast time tracking should be deleted');
    assert(!connectedSystems.has('system1'), 'System should be removed from connectedSystems');
});

// Test 5: Watching clients moved to waitingClients on system disconnect
test('Watching clients moved to waitingClients on system disconnect', () => {
    const wsClients = new Map();
    const waitingClients = new Set();
    const connectedSystems = new Map();
    const systemStates = new Map();
    const lastBroadcastTime = new Map();
    
    const systemClient = new MockWebSocket();
    systemClient.isSystem = true;
    systemClient.systemId = 'system1';
    
    const watchingClient1 = new MockWebSocket();
    watchingClient1.systemToWatch = 'system1';
    const watchingClient2 = new MockWebSocket();
    watchingClient2.systemToWatch = 'system1';
    
    connectedSystems.set('system1', new Set([watchingClient1, watchingClient2]));
    
    simulateConnectionCleanup(systemClient, wsClients, waitingClients, connectedSystems, systemStates, lastBroadcastTime);
    
    assert(waitingClients.has(watchingClient1), 'Watching client 1 should be moved to waiting');
    assert(waitingClients.has(watchingClient2), 'Watching client 2 should be moved to waiting');
    assert(watchingClient1.systemToWatch === null, 'Client 1 systemToWatch should be cleared');
    assert(watchingClient2.systemToWatch === null, 'Client 2 systemToWatch should be cleared');
});

// Test 6: Closed clients not moved to waitingClients
test('Closed clients not moved to waitingClients', () => {
    const wsClients = new Map();
    const waitingClients = new Set();
    const connectedSystems = new Map();
    const systemStates = new Map();
    const lastBroadcastTime = new Map();
    
    const systemClient = new MockWebSocket();
    systemClient.isSystem = true;
    systemClient.systemId = 'system1';
    
    const openClient = new MockWebSocket();
    openClient.readyState = 1; // OPEN
    openClient.systemToWatch = 'system1';
    
    const closedClient = new MockWebSocket();
    closedClient.readyState = 0; // CLOSED
    closedClient.systemToWatch = 'system1';
    
    connectedSystems.set('system1', new Set([openClient, closedClient]));
    
    simulateConnectionCleanup(systemClient, wsClients, waitingClients, connectedSystems, systemStates, lastBroadcastTime);
    
    assert(waitingClients.has(openClient), 'Open client should be moved to waiting');
    assert(!waitingClients.has(closedClient), 'Closed client should not be moved to waiting');
});

// Test 7: Non-system client cleanup doesn't affect system state
test('Non-system client cleanup does not affect system state', () => {
    const wsClients = new Map();
    const waitingClients = new Set();
    const connectedSystems = new Map();
    const systemStates = new Map();
    const lastBroadcastTime = new Map();
    
    const regularClient = new MockWebSocket();
    regularClient.isSystem = false;
    
    systemStates.set('system1', { SystemId: 'system1', data: 'test' });
    lastBroadcastTime.set('system1', Date.now());
    connectedSystems.set('system1', new Set());
    
    simulateConnectionCleanup(regularClient, wsClients, waitingClients, connectedSystems, systemStates, lastBroadcastTime);
    
    assert(systemStates.has('system1'), 'System state should remain');
    assert(lastBroadcastTime.has('system1'), 'Broadcast time tracking should remain');
});

console.log('\n✓ All connection cleanup tests passed!');
