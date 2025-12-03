/**
 * Manual test script for graceful shutdown
 * This script demonstrates that the SIGTERM/SIGINT handler works correctly
 */

console.log('Starting server for manual shutdown test...');
console.log('The server will start, then automatically shut down after 3 seconds');
console.log('Watch for the cleanup messages:\n');

// Start the server
require('./server.js');

// After 3 seconds, trigger shutdown
setTimeout(() => {
    console.log('\n=== Triggering graceful shutdown ===\n');
    process.emit('SIGTERM');
}, 3000);
