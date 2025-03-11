/**
 * Cache API Client
 * 
 * Provides functions for interacting with the cache API
 */
import { apiRequest } from './api-client.js';

const API_BASE_URL = '/api/cache';

/**
 * Fetch cache statistics
 * @returns {Promise<Object>} Cache statistics
 */
export async function fetchCacheStats() {
  return apiRequest(`${API_BASE_URL}/status`);
}

/**
 * Clear all caches
 * @returns {Promise<Object>} Result of operation
 */
export async function clearAllCaches() {
  return apiRequest(`${API_BASE_URL}/all`, {
    method: 'DELETE'
  });
}

/**
 * Clear a specific cache
 * @param {string} cacheKey - Cache key to clear
 * @returns {Promise<Object>} Result of operation
 */
export async function clearSpecificCache(cacheKey) {
  return apiRequest(`${API_BASE_URL}/file/${cacheKey}`, {
    method: 'DELETE'
  });
}

/**
 * Get specific cache file content
 * @param {string} cacheKey - Cache key to get
 * @returns {Promise<Object>} Cache file content
 */
export async function getCacheFile(cacheKey) {
  return apiRequest(`${API_BASE_URL}/file/${cacheKey}`);
}

/**
 * Get cache debug information
 * @returns {Promise<Object>} Cache debug info
 */
export async function getCacheDebugInfo() {
  return apiRequest(`${API_BASE_URL}/debug`);
}
