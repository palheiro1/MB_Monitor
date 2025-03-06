/**
 * Simple in-memory cache implementation
 * In a production environment, consider using Redis or another dedicated cache solution
 */

const cache = {
  // Internal store for cache items
  _store: new Map(),
  
  /**
   * Get an item from the cache
   * @param {string} key - The cache key
   * @returns {*} The cached value or undefined if not found
   */
  get: (key) => {
    const item = cache._store.get(key);
    
    // Return undefined if item doesn't exist or has expired
    if (!item) return undefined;
    if (item.expiry && item.expiry < Date.now()) {
      cache._store.delete(key);
      return undefined;
    }
    
    return item.value;
  },
  
  /**
   * Set an item in the cache
   * @param {string} key - The cache key
   * @param {*} value - The value to store
   * @param {number} [ttlSeconds=60] - Time to live in seconds
   */
  set: (key, value, ttlSeconds = 60) => {
    const expiry = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : null;
    cache._store.set(key, { value, expiry });
  },
  
  /**
   * Remove an item from the cache
   * @param {string} key - The cache key
   */
  delete: (key) => {
    cache._store.delete(key);
  },
  
  /**
   * Clear all items from the cache
   */
  clear: () => {
    cache._store.clear();
  },
  
  /**
   * Get all keys in the cache
   * @returns {Array} Array of cache keys
   */
  keys: () => {
    return Array.from(cache._store.keys());
  },
  
  /**
   * Check if a key exists and is not expired in the cache
   * @param {string} key - The cache key
   * @returns {boolean} True if the key exists and is not expired
   */
  has: (key) => {
    const item = cache._store.get(key);
    if (!item) return false;
    if (item.expiry && item.expiry < Date.now()) {
      cache._store.delete(key);
      return false;
    }
    return true;
  },
  
  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  stats: () => {
    const stats = {
      totalItems: 0,
      expiredItems: 0,
      keys: []
    };
    
    const now = Date.now();
    
    cache._store.forEach((item, key) => {
      stats.totalItems++;
      if (item.expiry && item.expiry < now) {
        stats.expiredItems++;
      } else {
        stats.keys.push(key);
      }
    });
    
    return stats;
  }
};

module.exports = cache;
