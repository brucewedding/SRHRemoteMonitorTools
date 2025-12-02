/**
 * BroadcastThrottler - Reduces broadcast frequency during memory pressure
 * 
 * This class monitors memory usage and adjusts broadcast intervals to reduce
 * system load when memory usage is high. When memory exceeds the threshold,
 * broadcasts are throttled to a slower rate. When memory returns to normal,
 * the broadcast rate is restored.
 */
class BroadcastThrottler {
  /**
   * Create broadcast throttler
   * @param {Object} options - Configuration options
   * @param {number} options.normalIntervalMs - Normal broadcast interval (default: 100)
   * @param {number} options.throttledIntervalMs - Throttled interval (default: 500)
   * @param {number} options.memoryThresholdMB - Threshold to trigger throttling (default: 350)
   */
  constructor(options = {}) {
    this.normalIntervalMs = options.normalIntervalMs || 100;
    this.throttledIntervalMs = options.throttledIntervalMs || 500;
    this.memoryThresholdMB = options.memoryThresholdMB || 350;
    this.lastBroadcastTime = 0;
    this.isThrottled = false;
  }

  /**
   * Check if broadcast should be throttled based on memory
   * @param {number} heapUsageMB - Current heap usage in MB
   * @returns {boolean} True if should throttle
   */
  shouldThrottle(heapUsageMB) {
    return heapUsageMB >= this.memoryThresholdMB;
  }

  /**
   * Get current broadcast interval based on memory usage
   * @param {number} heapUsageMB - Current heap usage in MB (optional)
   * @returns {number} Interval in milliseconds
   */
  getCurrentInterval(heapUsageMB) {
    if (heapUsageMB !== undefined) {
      this.isThrottled = this.shouldThrottle(heapUsageMB);
    }
    return this.isThrottled ? this.throttledIntervalMs : this.normalIntervalMs;
  }

  /**
   * Check if enough time has passed since last broadcast
   * @param {number} heapUsageMB - Current heap usage in MB (optional)
   * @returns {boolean} True if should broadcast now
   */
  shouldBroadcastNow(heapUsageMB) {
    const now = Date.now();
    const interval = this.getCurrentInterval(heapUsageMB);
    const timeSinceLastBroadcast = now - this.lastBroadcastTime;
    
    return timeSinceLastBroadcast >= interval;
  }

  /**
   * Record that a broadcast occurred
   */
  recordBroadcast() {
    this.lastBroadcastTime = Date.now();
  }
}

module.exports = BroadcastThrottler;
