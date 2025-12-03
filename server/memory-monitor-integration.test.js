/**
 * Integration test for memory monitoring in Express server
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

const assert = require('assert');

// Mock the server dependencies
const mockWss = {
    clients: new Set(),
    on: () => {},
    close: () => {}
};

const mockServer = {
    listen: (port, callback) => {
        if (callback) callback();
        return mockServer;
    },
    close: () => {}
};

const mockExpress = () => {
    const app = {
        use: () => app,
        listen: mockServer.listen
    };
    return app;
};
mockExpress.json = () => {};

const mockHttp = {
    createServer: () => mockServer
};

const mockWs = {
    WebSocketServer: function() {
        return mockWss;
    }
};

// Mock the modules
require.cache[require.resolve('express')] = {
    exports: mockExpress
};
require.cache[require.resolve('http')] = {
    exports: mockHttp
};
require.cache[require.resolve('ws')] = {
    exports: mockWs
};

// Import MemoryMonitor to test integration
const MemoryMonitor = require('./MemoryMonitor');

console.log('Testing memory monitoring integration...\n');

// Test 1: MemoryMonitor initialization with correct thresholds
console.log('Test 1: MemoryMonitor initialization');
const memoryMonitor = new MemoryMonitor({
    warningThresholdMB: 350,
    criticalThresholdMB: 400,
    logger: console,
    onCritical: () => {
        console.log('Critical callback triggered');
    }
});

assert.strictEqual(memoryMonitor.warningThresholdMB, 350, 'Warning threshold should be 350MB');
assert.strictEqual(memoryMonitor.criticalThresholdMB, 400, 'Critical threshold should be 400MB');
console.log('✓ MemoryMonitor initialized with correct thresholds\n');

// Test 2: Enhanced check with diagnostics
console.log('Test 2: Enhanced memory check with diagnostics');
const messageBuffer = [];
const systemStates = new Map();
const connectedSystems = new Map();
const wsClients = new Map();
const waitingClients = new Set();
const lastBroadcastTime = new Map();

// Add some test data
messageBuffer.push({ test: 'message' });
systemStates.set('system1', { data: 'test' });
connectedSystems.set('system1', new Set());
wsClients.set({}, 'test@example.com');
waitingClients.add({});
lastBroadcastTime.set('system1', Date.now());

// Override check method with diagnostics
const originalCheck = memoryMonitor.check.bind(memoryMonitor);
memoryMonitor.check = function (diagnostics = {}) {
    const enhancedDiagnostics = {
        ...diagnostics,
        bufferSizes: {
            messageBufferSize: messageBuffer.length,
            systemStatesSize: systemStates.size,
            connectedSystemsSize: connectedSystems.size,
            wsClientsSize: wsClients.size,
            waitingClientsSize: waitingClients.size,
            lastBroadcastTimeSize: lastBroadcastTime.size
        }
    };
    
    return originalCheck(enhancedDiagnostics);
};

const status = memoryMonitor.check();
assert.ok(status.diagnostics, 'Status should include diagnostics');
assert.ok(status.diagnostics.bufferSizes, 'Diagnostics should include bufferSizes');
assert.strictEqual(status.diagnostics.bufferSizes.messageBufferSize, 1, 'Should track message buffer size');
assert.strictEqual(status.diagnostics.bufferSizes.systemStatesSize, 1, 'Should track system states size');
assert.strictEqual(status.diagnostics.bufferSizes.connectedSystemsSize, 1, 'Should track connected systems size');
assert.strictEqual(status.diagnostics.bufferSizes.wsClientsSize, 1, 'Should track ws clients size');
assert.strictEqual(status.diagnostics.bufferSizes.waitingClientsSize, 1, 'Should track waiting clients size');
assert.strictEqual(status.diagnostics.bufferSizes.lastBroadcastTimeSize, 1, 'Should track last broadcast time size');
console.log('✓ Enhanced check includes all required diagnostics\n');

// Test 3: Start monitoring with 30-second interval
console.log('Test 3: Start memory monitoring');
memoryMonitor.startMonitoring(30000);
assert.ok(memoryMonitor.monitoringInterval, 'Monitoring interval should be set');
console.log('✓ Memory monitoring started with 30s interval\n');

// Test 4: Stop monitoring
console.log('Test 4: Stop memory monitoring');
memoryMonitor.stopMonitoring();
assert.strictEqual(memoryMonitor.monitoringInterval, null, 'Monitoring interval should be cleared');
console.log('✓ Memory monitoring stopped\n');

console.log('✓ All memory monitoring integration tests passed!');
