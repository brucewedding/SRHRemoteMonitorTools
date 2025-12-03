/**
 * MemoryMonitor - Monitors heap usage and triggers warnings/restarts
 * 
 * Validates Requirements 3.1, 3.2, 3.3, 3.4
 */

class MemoryMonitor {
  /**
   * Create memory monitor with thresholds
   * @param {Object} options - Configuration options
   * @param {number} options.warningThresholdMB - Warning threshold (default: 350)
   * @param {number} options.criticalThresholdMB - Critical threshold (default: 400)
   * @param {Function} options.logger - Logger function
   * @param {Function} options.onCritical - Callback for critical threshold
   */
  constructor(options = {}) {
    this.warningThresholdMB = options.warningThresholdMB || 350;
    this.criticalThresholdMB = options.criticalThresholdMB || 400;
    this.logger = options.logger || console;
    this.onCritical = options.onCritical || (() => {});
    this.monitoringInterval = null;
  }

  /**
   * Get current heap usage in MB
   * @returns {number} Heap usage in megabytes
   */
  getHeapUsageMB() {
    const heapUsed = process.memoryUsage().heapUsed;
    return heapUsed / 1024 / 1024;
  }

  /**
   * Check current memory usage and take action if needed
   * @param {Object} diagnostics - Additional diagnostic info (buffer sizes, etc.)
   * @returns {Object} Memory status
   */
  check(diagnostics = {}) {
    const heapUsedMB = this.getHeapUsageMB();
    const heapTotalMB = process.memoryUsage().heapTotal / 1024 / 1024;

    const status = {
      heapUsedMB,
      heapTotalMB,
      level: 'normal',
      diagnostics
    };

    // Requirement 3.1: Track current heap usage (logging removed)

    // Requirement 3.2: Log warning when exceeding 350MB
    if (heapUsedMB >= this.warningThresholdMB && heapUsedMB < this.criticalThresholdMB) {
      status.level = 'warning';
      
      // Requirement 3.4: Include buffer sizes in warning
      const diagnosticInfo = diagnostics.bufferSizes 
        ? JSON.stringify(diagnostics.bufferSizes, null, 2)
        : 'No buffer diagnostics available';
      
      this.logger.warn(
        `Memory warning: ${heapUsedMB.toFixed(2)}MB exceeds warning threshold of ${this.warningThresholdMB}MB. ` +
        `Buffer sizes: ${diagnosticInfo}`
      );
    }

    // Requirement 3.3: Trigger graceful restart when exceeding 400MB
    if (heapUsedMB >= this.criticalThresholdMB) {
      status.level = 'critical';
      
      // Requirement 3.4: Include buffer sizes in critical error
      const diagnosticInfo = diagnostics.bufferSizes 
        ? JSON.stringify(diagnostics.bufferSizes, null, 2)
        : 'No buffer diagnostics available';
      
      this.logger.error(
        `Memory critical: ${heapUsedMB.toFixed(2)}MB exceeds critical threshold of ${this.criticalThresholdMB}MB. ` +
        `Buffer sizes: ${diagnosticInfo}. Triggering graceful restart.`
      );
      
      // Trigger the critical callback (typically process.exit(1))
      this.onCritical();
    }

    return status;
  }

  /**
   * Start periodic monitoring
   * @param {number} intervalMs - Check interval in milliseconds (default: 30000)
   */
  startMonitoring(intervalMs = 30000) {
    if (this.monitoringInterval) {
      this.logger.warn('Memory monitoring is already running');
      return;
    }

    // Requirement 3.5: Check every 30 seconds (default)
    this.monitoringInterval = setInterval(() => {
      this.check();
    }, intervalMs);

    this.logger.info(`Memory monitoring started with ${intervalMs}ms interval`);
  }

  /**
   * Stop periodic monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.logger.info('Memory monitoring stopped');
    }
  }
}

module.exports = MemoryMonitor;
