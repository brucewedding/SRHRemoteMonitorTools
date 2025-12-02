/**
 * BufferCleaner - Periodically cleans stale streaming pressure buffers
 * 
 * Validates: Requirements 4.1, 4.2, 4.3
 */

class BufferCleaner {
  /**
   * Create buffer cleaner
   * @param {Object} stateAggregator - State aggregator instance
   * @param {Object} options - Configuration options
   * @param {number} options.timeoutMs - Timeout before cleanup (default: 300000 = 5 minutes)
   * @param {Function} options.logger - Logger function
   */
  constructor(stateAggregator, options = {}) {
    this.stateAggregator = stateAggregator;
    this.timeoutMs = options.timeoutMs || 300000; // Default 5 minutes
    this.logger = options.logger || console;
    this.cleaningInterval = null;
  }

  /**
   * Check if streaming buffers should be cleared
   * Validates: Requirements 4.1
   * @returns {boolean} True if cleanup performed
   */
  checkAndClean() {
    const state = this.stateAggregator.state;
    
    // Check if StreamingPressure exists
    if (!state.StreamingPressure) {
      return false;
    }

    const now = Date.now();
    const lastUpdate = state.StreamingPressure.lastUpdate || 0;
    const timeSinceUpdate = now - lastUpdate;

    // If no telemetry received for timeout period, clear streaming buffers
    if (timeSinceUpdate > this.timeoutMs) {
      this.clearStreamingBuffers();
      return true;
    }

    return false;
  }

  /**
   * Clear streaming pressure buffers while preserving other data
   * Validates: Requirements 4.2, 4.3
   */
  clearStreamingBuffers() {
    const state = this.stateAggregator.state;

    if (!state.StreamingPressure) {
      return;
    }

    // Clear only streaming pressure buffers
    const channels = ['leftAtrial', 'rightAtrial', 'leftVentricular', 'rightVentricular', 'aortic', 'pulmonaryArterial'];
    
    channels.forEach(channel => {
      if (state.StreamingPressure[channel]) {
        state.StreamingPressure[channel] = null;
      }
    });

    // Log cleanup action (Requirement 4.3)
    this.logger.info({
      msg: 'Cleared streaming pressure buffers due to inactivity',
      timeoutMs: this.timeoutMs,
      lastUpdate: state.StreamingPressure.lastUpdate
    });

    // Note: We preserve sampleRate, unit, and other telemetry data
    // Only the streaming buffers are cleared
  }

  /**
   * Start periodic cleanup checks
   * @param {number} intervalMs - Check interval in milliseconds
   */
  startCleaning(intervalMs) {
    if (this.cleaningInterval) {
      this.stopCleaning();
    }

    this.cleaningInterval = setInterval(() => {
      this.checkAndClean();
    }, intervalMs);

    this.logger.info({
      msg: 'BufferCleaner started',
      checkIntervalMs: intervalMs,
      timeoutMs: this.timeoutMs
    });
  }

  /**
   * Stop periodic cleanup
   */
  stopCleaning() {
    if (this.cleaningInterval) {
      clearInterval(this.cleaningInterval);
      this.cleaningInterval = null;
      this.logger.info('BufferCleaner stopped');
    }
  }
}

module.exports = BufferCleaner;
