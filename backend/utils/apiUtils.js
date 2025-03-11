/**
 * Utility functions for making API requests with enhanced reliability
 */
const axios = require('axios');
const { ARDOR_API_URL, ARDOR_FALLBACK_API_URL } = require('../config');
const cacheService = require('../services/cacheService');

// Track current node status
const nodeStatus = {
  currentUrl: ARDOR_API_URL,
  primaryUrl: ARDOR_API_URL,
  fallbackUrl: ARDOR_FALLBACK_API_URL,
  usingFallback: false,
  primaryHealthy: true,
  lastCheck: 0,
  checkInterval: 60000 // Check primary again after 1 minute
};

// Request cache for GET requests - using a Map with compound keys
const requestCache = new Map();
const REQUEST_CACHE_TTL = 5 * 60 * 1000; // 5 minutes by default

/**
 * Create a cache key from request parameters
 * @param {string} url - The URL
 * @param {Object} params - Request parameters
 * @returns {string} Cache key
 */
function createCacheKey(url, params) {
  return `${url}|${JSON.stringify(params || {})}`;
}

/**
 * Get the current API URL to use, with fallback logic
 * @returns {string} The API URL to use
 */
function getCurrentApiUrl() {
  return nodeStatus.currentUrl;
}

/**
 * Switch to fallback node
 */
function switchToFallback() {
  if (!nodeStatus.usingFallback) {
    console.log(`⚠️ Switching from primary node (${nodeStatus.primaryUrl}) to fallback node (${nodeStatus.fallbackUrl})`);
    nodeStatus.currentUrl = nodeStatus.fallbackUrl;
    nodeStatus.usingFallback = true;
    nodeStatus.primaryHealthy = false;
    nodeStatus.lastCheck = Date.now();
  }
}

/**
 * Switch back to primary node
 */
function switchToPrimary() {
  if (nodeStatus.usingFallback) {
    console.log(`✓ Primary node is healthy again, switching back from fallback`);
    nodeStatus.currentUrl = nodeStatus.primaryUrl;
    nodeStatus.usingFallback = false;
    nodeStatus.primaryHealthy = true;
  }
}

/**
 * Periodically check if primary node is healthy again
 */
async function checkPrimaryHealth() {
  // Don't check too frequently
  if (!nodeStatus.usingFallback || Date.now() - nodeStatus.lastCheck < nodeStatus.checkInterval) {
    return;
  }
  
  try {
    const response = await axios.get(nodeStatus.primaryUrl, {
      params: {
        requestType: 'getBlockchainStatus'
      },
      timeout: 2000
    });
    
    if (response.data && !response.data.errorCode) {
      switchToPrimary();
    }
  } catch (error) {
    // Still not healthy, stay on fallback
    nodeStatus.lastCheck = Date.now();
  }
}

/**
 * Make a retryable API request with caching
 */
async function makeRetryableRequest(options) {
  // Try to check if primary is healthy again
  await checkPrimaryHealth();
  
  const {
    url: originalUrl,
    params,
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    useCache = true, // Default to using cache
    cacheTTL = 300 // 5 minutes
  } = options;
  
  let url = originalUrl;
  
  // If this is an Ardor API request, use the current node URL
  if (originalUrl === ARDOR_API_URL || originalUrl === ARDOR_FALLBACK_API_URL) {
    url = nodeStatus.currentUrl;
  }
  
  // For GET requests, check cache first if enabled
  if (useCache) {
    const cacheKey = createCacheKey(url, params);
    const cachedData = cacheService.request.get(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
  }
  
  // Not in cache or cache disabled, make the API request
  let retries = 0;
  let delay = initialDelay;
  
  while (true) {
    try {
      const response = await axios.get(url, { params });
      
      // Cache successful responses if enabled
      if (useCache) {
        const cacheKey = createCacheKey(url, params);
        cacheService.request.set(cacheKey, response, cacheTTL);
      }
      
      return response;
    } catch (error) {
      // Handle network errors that might need failover to another node
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || 
          error.response?.status >= 500 || error.message.includes('timeout')) {
        
        if (url === nodeStatus.primaryUrl) {
          // Switch to fallback node
          switchToFallback();
          url = nodeStatus.currentUrl;
          continue; // Retry immediately with fallback
        }
        
        // Already using fallback or not an Ardor API URL, try retrying
        if (retries < maxRetries) {
          retries++;
          await sleep(delay);
          delay = Math.min(delay * 2, maxDelay); // Exponential backoff
          continue;
        }
      }
      
      // For all other errors or if retries exhausted
      throw error;
    }
  }
}

/**
 * Clean up expired cache entries
 */
function cleanupExpiredCache() {
  const now = Date.now();
  let expiredCount = 0;
  
  for (const [key, value] of requestCache.entries()) {
    if (value.expiry < now) {
      requestCache.delete(key);
      expiredCount++;
    }
  }
  
  if (expiredCount > 0) {
    console.log(`Cleaned up ${expiredCount} expired cache entries. Current cache size: ${requestCache.size}`);
  }
}

/**
 * Get cache statistics
 * @returns {Object} Cache statistics
 */
function getCacheStats() {
  const now = Date.now();
  let validCount = 0;
  let expiredCount = 0;
  
  requestCache.forEach(value => {
    if (value.expiry >= now) {
      validCount++;
    } else {
      expiredCount++;
    }
  });
  
  return {
    total: requestCache.size,
    valid: validCount,
    expired: expiredCount
  };
}

/**
 * Log information about the API node being used
 * @param {string} apiUrl - The API URL from config
 */
function logApiNodeInfo(apiUrl) {
  console.log('\n=== API NODE INFORMATION ===');
  console.log(`Primary Ardor API: ${nodeStatus.primaryUrl}`);
  console.log(`Fallback Ardor API: ${nodeStatus.fallbackUrl}`);
  console.log(`Currently using: ${nodeStatus.currentUrl}`);
  
  // Determine if this is likely a local or remote node
  if (nodeStatus.currentUrl.includes('localhost') || nodeStatus.currentUrl.includes('127.0.0.1') || nodeStatus.currentUrl.includes('::1')) {
    console.log('✓ Using LOCAL Ardor node (with public fallback)');
  } else if (nodeStatus.currentUrl.includes('ardor.jelurida.com')) {
    console.log('⚠ Using Jelurida PUBLIC node (has rate limits)');
    
    if (nodeStatus.usingFallback) {
      console.log('  → This is a FALLBACK node because local node was not available');
    } else {
      console.log('  → Consider using a local Ardor node instead');
    }
  } else {
    console.log('⚠ Using REMOTE Ardor node');
  }
  console.log('===========================\n');
}

/**
 * Check if the Ardor node is accessible
 * @param {string} apiUrl - The API URL to check
 * @returns {Promise<boolean>} Whether the node is accessible
 */
async function checkNodeConnectivity(apiUrl) {
  try {
    const response = await axios.get(apiUrl, {
      params: {
        requestType: 'getBlockchainStatus'
      },
      timeout: 3000 // 3 second timeout
    });
    
    const isHealthy = response.data && !response.data.errorCode;
    
    // If this is the primary URL and it's not healthy, switch to fallback
    if (apiUrl === nodeStatus.primaryUrl && !isHealthy) {
      switchToFallback();
    }
    
    return isHealthy;
  } catch (error) {
    console.log(`Failed to connect to Ardor node at ${apiUrl}: ${error.message}`);
    
    // If this is the primary URL, switch to fallback
    if (apiUrl === nodeStatus.primaryUrl) {
      switchToFallback();
    }
    
    return false;
  }
}

module.exports = {
  makeRetryableRequest,
  logApiNodeInfo,
  checkNodeConnectivity,
  getCurrentApiUrl,
  nodeStatus,
  // Remove outdated getCacheStats and clearRequestCache
  // as we now use the unified cacheService
};
