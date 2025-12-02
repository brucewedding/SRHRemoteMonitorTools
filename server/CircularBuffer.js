/**
 * CircularBuffer - Fixed-size ring buffer implementation
 * 
 * Maintains a fixed-size buffer that automatically removes oldest data
 * when capacity is reached. Provides O(1) push operations.
 */
class CircularBuffer {
  /**
   * Create a circular buffer with fixed capacity
   * @param {number} capacity - Maximum number of elements
   */
  constructor(capacity) {
    if (capacity <= 0) {
      throw new Error('Capacity must be greater than 0')
    }
    
    this.buffer = new Array(capacity)
    this.capacity = capacity
    this.head = 0  // Index of oldest element
    this.tail = 0  // Index where next element goes
    this.count = 0 // Current number of elements
  }
  
  /**
   * Add element to buffer, removing oldest if at capacity
   * O(1) complexity
   * @param {*} element - Element to add
   */
  push(element) {
    this.buffer[this.tail] = element
    this.tail = (this.tail + 1) % this.capacity
    
    if (this.count < this.capacity) {
      this.count++
    } else {
      // Buffer is full, move head forward (oldest element is overwritten)
      this.head = (this.head + 1) % this.capacity
    }
  }
  
  /**
   * Get all elements in order (oldest to newest)
   * O(n) complexity where n is the number of elements
   * @returns {Array} Array of elements in insertion order
   */
  toArray() {
    if (this.count === 0) {
      return []
    }
    
    const result = []
    for (let i = 0; i < this.count; i++) {
      const index = (this.head + i) % this.capacity
      result.push(this.buffer[index])
    }
    return result
  }
  
  /**
   * Get current number of elements
   * @returns {number} Current size
   */
  size() {
    return this.count
  }
  
  /**
   * Clear all elements
   */
  clear() {
    this.head = 0
    this.tail = 0
    this.count = 0
  }
  
  /**
   * Check if buffer is at capacity
   * @returns {boolean} True if full
   */
  isFull() {
    return this.count === this.capacity
  }
}

module.exports = CircularBuffer
