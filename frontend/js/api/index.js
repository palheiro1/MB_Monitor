/**
 * Unified API Client
 * 
 * Central point for all backend API communication.
 * Handles requests, responses, error handling and caching.
 */

// Base configuration
const config = {
  // Get API URL from config element or use default
  BASE_URL: (() => {
    const configEl = document.getElementById('app-config');
    return configEl?.dataset.apiUrl || '/api';
  })(),
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY: 1000
};

console.log(`API base URL configured as: ${config.BASE_URL}`);

/**
 * Make an API request with standardized error handling
 * @param {string} endpoint - API endpoint path
 * @param {Object} options - Request options
 * @returns {Promise<any>} Response data
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${config.BASE_URL}/${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.TIMEOUT);
  
  console.log(`Making API request to: ${url}`);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // Log all API responses for debugging
    console.log(`API ${options.method || 'GET'} ${url}: ${response.status}`);
    
    // Check for redirect - might indicate API route issue
    if (response.redirected) {
      console.warn(`API request was redirected to ${response.url} - this may indicate a routing issue`);
    }
    
    if (!response.ok) {
      // Handle error response
      let errorMessage;
      try {
        const errorBody = await response.text();
        errorMessage = errorBody || `${response.status} ${response.statusText}`;
      } catch (e) {
        errorMessage = `${response.status} ${response.statusText}`;
      }
      
      throw new Error(`API Error: ${errorMessage}`);
    }
    
    // Read response text once and parse it
    const text = await response.text();
    if (!text || !text.trim()) {
      console.warn('Empty response received');
      return {};
    }
    
    try {
      return JSON.parse(text);
    } catch (error) {
      console.error('JSON parse error:', error);
      console.error('Raw response:', text);
      throw new Error('Invalid JSON response');
    }
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${config.TIMEOUT}ms`);
    }
    
    throw error;
  }
}

// Domain-specific API endpoints

/**
 * Trade-related API calls
 */
export const tradeApi = {
  getAll: (period = '30d') => apiRequest(`trades?period=${period}`),
  getArdorTrades: (period = '30d') => apiRequest(`ardor/trades?period=${period}`),
  getPolygonTrades: (period = '30d') => apiRequest(`polygon/trades?period=${period}`)
};

/**
 * Crafting-related API calls
 */
export const craftApi = {
  getAll: (period = '30d') => apiRequest(`crafts?period=${period}`)
};

/**
 * Burns-related API calls
 */
export const burnApi = {
  getAll: (period = '30d') => apiRequest(`burns?period=${period}`),
  getCardBurns: (period = '30d') => apiRequest(`ardor/card-burns?period=${period}`),
  getGEMBurns: (period = '30d') => apiRequest(`ardor/gem-burns?period=${period}`)
};

/**
 * Cache-related API calls
 */
export const cacheApi = {
  getStatus: () => apiRequest('cache/status'),
  getCacheFile: (filename) => apiRequest(`cache/file/${filename}`)
};

/**
 * User-related API calls
 */
export const userApi = {
  getActiveUsers: (period = '30d') => apiRequest(`users?period=${period}`)
};

/**
 * Morphing-related API calls
 */
export const morphApi = {
  getAll: (period = '30d') => apiRequest(`morphs?period=${period}`)
};

// Export the raw request function for advanced use cases
export { apiRequest };
