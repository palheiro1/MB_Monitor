/**
 * Blockchain Client
 * Unified API client for interacting with backend services
 */

export class BlockchainClient {
  constructor() {
    // Base URL for API endpoints
    this.apiBase = '/api';
    
    // Request cache
    this.cache = new Map();
    
    // Cache expiration (5 minutes)
    this.cacheExpiration = 5 * 60 * 1000;
  }

  /**
   * Make API request with caching
   */
  async request(endpoint, params = {}, options = {}) {
    const { skipCache = false, forceRefresh = false } = options;
    
    // Build URL with query parameters
    const url = new URL(this.apiBase + endpoint, window.location.origin);
    
    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });
    
    const cacheKey = url.toString();
    
    // Check cache unless skipCache is true
    if (!skipCache && !forceRefresh) {
      const cachedData = this.getFromCache(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }
    
    try {
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Cache the result unless skipCache is true
      if (!skipCache) {
        this.saveToCache(cacheKey, data);
      }
      
      return data;
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Store data in cache
   */
  saveToCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Get data from cache if valid
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }
    
    // Check if cache is expired
    if (Date.now() - cached.timestamp > this.cacheExpiration) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Fetch all transactions data
   */
  async fetchAllData(period = 'all') {
    return this.request('/unified-data', { period });
  }

  /**
   * Fetch card burns
   */
  async fetchBurns(period = 'all') {
    return this.request('/burns', { period });
  }

  /**
   * Fetch card crafts
   */
  async fetchCrafts(period = 'all') {
    return this.request('/craftings', { period });
  }

  /**
   * Fetch card trades
   */
  async fetchTrades(period = 'all') {
    return this.request('/trades', { period });
  }

  /**
   * Fetch card morphs
   */
  async fetchMorphs(period = 'all') {
    return this.request('/morphs', { period });
  }

  /**
   * Fetch cache status
   */
  async fetchCacheStatus() {
    return this.request('/cache/status', {}, { skipCache: true });
  }

  /**
   * Clear server cache
   */
  async clearServerCache(cacheType) {
    const endpoint = cacheType ? `/cache/${cacheType}/clear` : '/cache/clear';
    return this.request(endpoint, {}, { 
      skipCache: true,
      method: 'POST'
    });
  }
}