/**
 * API Client
 * 
 * Centralized API client for handling all server requests.
 * Properly returns fresh JSON without relying on 304 responses.
 */

// Cache is still used only as a fallback (if desired), but no branch for 304 exists.
const responseCache = new Map();

export async function apiRequest(endpoint, options = {}) {
  const baseUrl = '/api';
  const url = `${baseUrl}/${endpoint}`;
  
  console.log(`API Request: ${url}`);
  
  try {
    options.headers = {
      'Accept': 'application/json',
      ...options.headers
    };
    
    const response = await fetch(url, options);
    console.log(`Response from ${url}: Status ${response.status}`);
    
    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText}`);
      let errorDetails;
      try {
        errorDetails = await response.text();
      } catch (e) {
        errorDetails = 'Could not read error details';
      }
      throw new Error(`API error ${response.status}: ${errorDetails}`);
    }
    
    // We assume the backend always sends full JSON.
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn(`Expected JSON but got ${contentType}`);
      const text = await response.text();
      if (!text || !text.trim()) {
        console.warn('Empty response received');
        return {};
      }
      try {
        const data = JSON.parse(text);
        responseCache.set(url, data);
        return data;
      } catch (e) {
        console.error('Response is not valid JSON:', text);
        throw new Error(`Invalid JSON response from server: ${e.message}`);
      }
    }
    
    const data = await response.json();
    responseCache.set(url, data);
    return data;
  } catch (error) {
    console.error(`Error in API request to ${url}:`, error);
    throw error;
  }
}

export async function getTrades(period = '30d') {
  try {
    return await apiRequest(`trades?period=${period}`);
  } catch (error) {
    console.error('Failed to fetch trades:', error);
    return { ardor_trades: [], polygon_trades: [], count: 0 };
  }
}

export async function getBurns(period = '30d') {
  try {
    return await apiRequest(`burns?period=${period}`);
  } catch (error) {
    console.error('Failed to fetch burns:', error);
    return { burns: [], count: 0 };
  }
}

export async function getCrafts(period = '30d') {
  try {
    return await apiRequest(`crafts?period=${period}`);
  } catch (error) {
    console.error('Failed to fetch crafts:', error);
    return { craftings: [], count: 0 };
  }
}

export async function getCacheStatus() {
  try {
    return await apiRequest('cache/status');
  } catch (error) {
    console.error('Failed to fetch cache status:', error);
    return { files: [] };
  }
}
