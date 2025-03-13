/**
 * Debug Monitor to prevent infinite loops in API calls
 */
(function() {
  console.log('[DEBUG-MONITOR] Initializing API call monitor');
  
  // Keep track of API calls
  const apiCallTracker = {
    calls: {},
    totalCalls: 0,
    lastReset: Date.now(),
    
    // Limits for API calls
    MAX_CALLS_PER_ENDPOINT: 100,
    MAX_TOTAL_CALLS: 500,
    RESET_INTERVAL: 60000, // 1 minute
    
    // Track a call to a specific endpoint
    trackCall: function(endpoint, params) {
      // Reset counters if needed
      if (Date.now() - this.lastReset > this.RESET_INTERVAL) {
        this.calls = {};
        this.totalCalls = 0;
        this.lastReset = Date.now();
        console.log('[DEBUG-MONITOR] Reset API call counters');
      }
      
      // Create a key from the endpoint and params
      const key = endpoint + '-' + JSON.stringify(params);
      
      if (!this.calls[key]) {
        this.calls[key] = 0;
      }
      
      this.calls[key]++;
      this.totalCalls++;
      
      // Check for potential infinite loops
      if (this.calls[key] > this.MAX_CALLS_PER_ENDPOINT) {
        console.error(`[DEBUG-MONITOR] Possible infinite loop detected! Endpoint called ${this.calls[key]} times: ${key}`);
        return false;
      }
      
      if (this.totalCalls > this.MAX_TOTAL_CALLS) {
        console.error(`[DEBUG-MONITOR] Too many API calls (${this.totalCalls})! Possible infinite loop.`);
        return false;
      }
      
      return true;
    }
  };
  
  // Override fetch to monitor API calls
  const originalFetch = window.fetch;
  window.fetch = function(resource, init) {
    // Check if this is an API call
    if (typeof resource === 'string' && (resource.includes('/api') || resource.includes('requestType='))) {
      const bodyParams = init && init.body ? JSON.parse(init.body) : {};
      const shouldProceed = apiCallTracker.trackCall(resource, bodyParams);
      
      if (!shouldProceed) {
        console.error('[DEBUG-MONITOR] Blocking API call due to excessive calls');
        return Promise.reject(new Error('API call blocked by debug monitor due to excessive calls'));
      }
    }
    return originalFetch.apply(this, arguments);
  };
  
  // Override XMLHttpRequest to monitor API calls
  const originalXhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    // Check if this is an API call
    if (typeof url === 'string' && (url.includes('/api') || url.includes('requestType='))) {
      const shouldProceed = apiCallTracker.trackCall(url, {});
      
      if (!shouldProceed) {
        console.error('[DEBUG-MONITOR] Blocking XMLHttpRequest due to excessive calls');
        throw new Error('XMLHttpRequest blocked by debug monitor due to excessive calls');
      }
    }
    
    // Call original with proper arguments
    return originalXhrOpen.apply(this, arguments);
  };
  
  console.log('[DEBUG-MONITOR] API call monitoring initialized');
})();
