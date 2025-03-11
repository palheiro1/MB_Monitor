/**
 * Utility functions for making API requests with enhanced reliability
 */
const axios = require('axios');
const { ARDOR_API_URL, ARDOR_FALLBACK_API_URL } = require('../config');

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
 * Make an API request with automatic retry on failure and node fallback
 * @param {Object} options - Request options
 * @param {string} options.url - The URL to request (will be replaced with current node)
 * @param {Object} options.params - The query parameters
 * @param {number} [options.maxRetries=3] - Maximum number of retry attempts
 * @param {number} [options.initialDelay=1000] - Initial delay before retry in ms
 * @param {number} [options.maxDelay=10000] - Maximum delay between retries in ms
 * @returns {Promise<Object>} - The API response
 */
async function makeRetryableRequest(options) {
  // Try to check if primary is healthy again
  await checkPrimaryHealth();
  
  const {
    url: originalUrl,
    params,
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000
  } = options;
  
  let url = originalUrl;
  
  // If this is an Ardor API request, use the current node URL
  if (originalUrl === ARDOR_API_URL || originalUrl === ARDOR_FALLBACK_API_URL) {
    url = nodeStatus.currentUrl;
  }
  
  let lastError;
  let delay = initialDelay;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Show the target URL on first attempt to help with debugging
      if (attempt === 0 && params && params.requestType) {
        console.log(`Calling API: ${url} (${params.requestType})`);
      }
      
      // Make the request
      const response = await axios.get(url, { params });
      return response;
    } catch (error) {
      lastError = error;
      
      // Check if this is a network error or server error for an Ardor request
      if ((originalUrl === ARDOR_API_URL || originalUrl === ARDOR_FALLBACK_API_URL) && 
          (!error.response || (error.response && error.response.status >= 500))) {
        
        // If we're using the primary node, try switching to fallback
        if (!nodeStatus.usingFallback) {
          switchToFallback();
          url = nodeStatus.currentUrl;
          console.log(`Retrying request with fallback node: ${url}`);
          
          // Reset attempt counter to give the fallback node a fair chance
          attempt = 0;
          delay = initialDelay;
          continue;
        }
      }
      
      // Regular retry logic
      if (attempt < maxRetries) {
        // If it's a network error or 5xx, we should retry
        const shouldRetry = !error.response || (error.response && error.response.status >= 500);
        
        if (shouldRetry) {
          console.log(`Request failed (attempt ${attempt + 1}/${maxRetries + 1}): ${error.message}. Retrying in ${delay}ms...`);
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Exponential backoff with jitter
          delay = Math.min(delay * 1.5 + Math.random() * 1000, maxDelay);
        } else {
          // Don't retry client errors (4xx)
          throw error;
        }
      } else {
        // We've exhausted all retries
        console.error(`Request failed after ${maxRetries + 1} attempts: ${error.message}`);
        throw error;
      }
    }
  }
  
  throw lastError;
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
  nodeStatus
};
