/**
 * API rate limiting middleware
 */

// Simple in-memory store for rate limiting
const requestStore = new Map();

/**
 * Create a rate limiter middleware
 * @param {number} maxRequests - Max requests allowed in window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} Express middleware
 */
function createRateLimiter(maxRequests = 100, windowMs = 60000) {
  return (req, res, next) => {
    // Get client IP or user identifier
    const identifier = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const now = Date.now();
    
    // Initialize or get existing record
    if (!requestStore.has(identifier)) {
      requestStore.set(identifier, {
        count: 0,
        resetAt: now + windowMs
      });
    }
    
    const record = requestStore.get(identifier);
    
    // Reset if window expired
    if (record.resetAt <= now) {
      record.count = 1;
      record.resetAt = now + windowMs;
      requestStore.set(identifier, record);
      return next();
    }
    
    // Check if limit exceeded
    if (record.count >= maxRequests) {
      return res.status(429).json({
        status: 'error',
        message: 'Too many requests, please try again later',
        retryAfter: Math.ceil((record.resetAt - now) / 1000)
      });
    }
    
    // Increment request count
    record.count++;
    requestStore.set(identifier, record);
    
    // Add headers
    res.set('X-RateLimit-Limit', maxRequests);
    res.set('X-RateLimit-Remaining', maxRequests - record.count);
    res.set('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000));
    
    next();
  };
}

// Cleanup function to prevent memory leaks
function cleanupExpiredRecords() {
  const now = Date.now();
  requestStore.forEach((record, key) => {
    if (record.resetAt <= now) {
      requestStore.delete(key);
    }
  });
}

// Run cleanup every minute
setInterval(cleanupExpiredRecords, 60000);

module.exports = createRateLimiter;
