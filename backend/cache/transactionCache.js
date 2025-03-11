/**
 * Transaction Cache Module
 * 
 * Provides caching for blockchain transactions to reduce API calls
 */

// Cache settings
const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const CLEANUP_INTERVAL = 30 * 60 * 1000;  // 30 minutes in milliseconds

// In-memory cache stores
const transactionCache = new Map();

/**
 * Get a transaction from cache
 * @param {string} id - Transaction ID or hash
 * @returns {Object|null} Cached transaction or null if not found
 */
function get(id) {
  if (!id) return null;
  
  const cached = transactionCache.get(id);
  if (!cached) return null;
  
  // Return null if expired
  if (cached.expiry < Date.now()) {
    transactionCache.delete(id);
    return null;
  }
  
  return cached.data;
}

/**
 * Store a transaction in cache
 * @param {string} id - Transaction ID or hash
 * @param {Object} data - Transaction data
 * @param {number} [ttl=DEFAULT_TTL] - Time to live in milliseconds
 */
function set(id, data, ttl = DEFAULT_TTL) {
  if (!id || !data) return;
  
  transactionCache.set(id, {
    data,
    expiry: Date.now() + ttl
  });
}

/**
 * Check if a transaction exists in cache
 * @param {string} id - Transaction ID or hash
 * @returns {boolean} True if in cache and not expired
 */
function has(id) {
  if (!id) return false;
  
  const cached = transactionCache.get(id);
  if (!cached) return false;
  
  // Return false if expired
  if (cached.expiry < Date.now()) {
    transactionCache.delete(id);
    return false;
  }
  
  return true;
}

/**
 * Remove expired entries from cache
 */
function cleanup() {
  const now = Date.now();
  let removedCount = 0;
  
  for (const [key, value] of transactionCache.entries()) {
    if (value.expiry < now) {
      transactionCache.delete(key);
      removedCount++;
    }
  }
  
  if (removedCount > 0) {
    console.log(`Transaction cache cleanup: removed ${removedCount} expired entries. Current size: ${transactionCache.size}`);
  }
}

/**
 * Get cache statistics
 * @returns {Object} Cache statistics
 */
function stats() {
  const now = Date.now();
  let validCount = 0;
  let expiredCount = 0;
  
  transactionCache.forEach(value => {
    if (value.expiry >= now) {
      validCount++;
    } else {
      expiredCount++;
    }
  });
  
  return {
    size: transactionCache.size,
    valid: validCount,
    expired: expiredCount
  };
}

/**
 * Clear all cached transactions
 */
function clear() {
  const size = transactionCache.size;
  transactionCache.clear();
  console.log(`Transaction cache cleared: ${size} entries removed`);
}

// Set up periodic cleanup
setInterval(cleanup, CLEANUP_INTERVAL);

module.exports = {
  get,
  set,
  has,
  stats,
  clear
};
