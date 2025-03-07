/**
 * API Endpoints
 * 
 * This module handles all API requests to the backend.
 * It interacts with the REST API endpoints and formats the data for the UI.
 */

import { getState } from '../state/index.js';
import { blockchainService } from '../services/blockchain-service.js';

const API_BASE_URL = '/api';

/**
 * Handle API response
 * @param {Response} response - The fetch response
 * @returns {Promise} JSON response
 */
async function handleResponse(response) {
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch with timeout
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise} Promise with fetch result
 */
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

/**
 * Fetch statistics data
 * @returns {Promise} Promise resolving to stats
 */
export async function fetchStats() {
  const currentPeriod = getState('currentPeriod');
  
  try {
    // Check if direct blockchain access is available
    const [ardorConnected, polygonConnected] = await Promise.all([
      blockchainService.checkArdorConnection(),
      blockchainService.checkPolygonConnection()
    ]);
    
    if (ardorConnected || polygonConnected) {
      console.log('Using direct blockchain connection for stats');
      
      // Get stats from both blockchains if available
      const chainStats = await blockchainService.getCombinedStats();
      
      // If we have direct blockchain access, merge with backend data
      const backendResponse = await fetchWithTimeout(`${API_BASE_URL}/stats?period=${currentPeriod}`);
      const backendData = await handleResponse(backendResponse);
      
      return {
        ...backendData,
        direct_blockchain_stats: chainStats,
        ardor_connected: ardorConnected,
        polygon_connected: polygonConnected
      };
    } else {
      // Fall back to backend API
      console.log('Using backend API for stats');
      const response = await fetchWithTimeout(`${API_BASE_URL}/stats?period=${currentPeriod}`);
      return handleResponse(response);
    }
  } catch (error) {
    console.error('Error fetching stats:', error);
    // Fall back to backend API
    const response = await fetchWithTimeout(`${API_BASE_URL}/stats?period=${currentPeriod}`);
    return handleResponse(response);
  }
}

/**
 * Fetch activity chart data
 * @returns {Promise} Promise resolving to activity data
 */
export async function fetchActivity() {
  const currentPeriod = getState('currentPeriod');
  const response = await fetchWithTimeout(`${API_BASE_URL}/activity?period=${currentPeriod}`);
  return handleResponse(response);
}

/**
 * Fetch trades data
 * @returns {Promise} Promise resolving to trades data
 */
export async function fetchTrades() {
  const currentPeriod = getState('currentPeriod');
  
  try {
    // Check if direct blockchain access is available
    const [ardorConnected, polygonConnected] = await Promise.all([
      blockchainService.checkArdorConnection(),
      blockchainService.checkPolygonConnection()
    ]);
    
    if (ardorConnected || polygonConnected) {
      console.log('Using direct blockchain connection for trades');
      
      // Build trades data object
      const tradesData = {};
      
      // Get Ardor trades if available
      if (ardorConnected) {
        tradesData.ardor_trades = await blockchainService.getArdorMythicalBeingsTrades({
          period: currentPeriod
        });
        tradesData.ardor_direct_data = true;
      }
      
      // Get Polygon trades if available
      if (polygonConnected) {
        const polygonTransfers = await blockchainService.getPolygonMythicalBeingsTransfers({
          period: currentPeriod
        });
        tradesData.polygon_trades = polygonTransfers.transfers;
        tradesData.polygon_direct_data = true;
      }
      
      // If we're missing data from either chain, get it from backend
      if (!ardorConnected || !polygonConnected) {
        const backendResponse = await fetchWithTimeout(`${API_BASE_URL}/trades?period=${currentPeriod}`);
        const backendData = await handleResponse(backendResponse);
        
        // Fill in missing data
        if (!ardorConnected) {
          tradesData.ardor_trades = backendData.ardor_trades || [];
        }
        
        if (!polygonConnected) {
          tradesData.polygon_trades = backendData.polygon_trades || [];
        }
      }
      
      return tradesData;
    } else {
      // Fall back to backend API
      console.log('Using backend API for trades');
      const response = await fetchWithTimeout(`${API_BASE_URL}/trades?period=${currentPeriod}`);
      return handleResponse(response);
    }
  } catch (error) {
    console.error('Error fetching trades:', error);
    // Fall back to backend API
    const response = await fetchWithTimeout(`${API_BASE_URL}/trades?period=${currentPeriod}`);
    return handleResponse(response);
  }
}

/**
 * Fetch Giftz sales data
 * @returns {Promise} Promise resolving to giftz data
 */
export async function fetchGiftzSales() {
  const currentPeriod = getState('currentPeriod');
  const response = await fetchWithTimeout(`${API_BASE_URL}/giftz?period=${currentPeriod}`);
  return handleResponse(response);
}

/**
 * Fetch crafting data
 * @returns {Promise} Promise resolving to crafts data
 */
export async function fetchCrafts() {
  const currentPeriod = getState('currentPeriod');
  const response = await fetchWithTimeout(`${API_BASE_URL}/ardor/craftings`);
  return handleResponse(response);
}

/**
 * Fetch morphing data
 * @returns {Promise} Promise resolving to morphs data
 */
export async function fetchMorphs() {
  const currentPeriod = getState('currentPeriod');
  const response = await fetchWithTimeout(`${API_BASE_URL}/morphs?period=${currentPeriod}`);
  return handleResponse(response);
}

/**
 * Fetch burning data
 * @returns {Promise} Promise resolving to burns data
 */
export async function fetchBurns() {
  const currentPeriod = getState('currentPeriod');
  const response = await fetchWithTimeout(`${API_BASE_URL}/burns?period=${currentPeriod}`);
  return handleResponse(response);
}

/**
 * Fetch active users data
 * @returns {Promise} Promise resolving to users data
 */
export async function fetchUsers() {
  const currentPeriod = getState('currentPeriod');
  
  try {
    // Check if direct blockchain access is available
    const [ardorConnected, polygonConnected] = await Promise.all([
      blockchainService.checkArdorConnection(),
      blockchainService.checkPolygonConnection()
    ]);
    
    if (ardorConnected || polygonConnected) {
      console.log('Using direct blockchain connection for users');
      
      // Build users data object
      const usersData = {};
      
      // Get blockchain users where available
      const usersPromises = [];
      
      if (polygonConnected) {
        usersPromises.push(
          blockchainService.getPolygonUsers({ period: currentPeriod })
            .then(users => {
              usersData.polygon_users = users;
              usersData.polygon_direct_data = true;
            })
        );
      }
      
      // Implement Ardor users fetch when available
      if (ardorConnected) {
        // This is a placeholder - implement actual Ardor users logic
        usersPromises.push(Promise.resolve());
      }
      
      // Wait for all user data to be fetched
      await Promise.all(usersPromises);
      
      // If we're missing data from either chain, get it from backend
      if (!ardorConnected || !polygonConnected) {
        const backendResponse = await fetchWithTimeout(`${API_BASE_URL}/users?period=${currentPeriod}`);
        const backendData = await handleResponse(backendResponse);
        
        // Fill in missing data
        if (!ardorConnected) {
          usersData.ardor_users = backendData.ardor_users || [];
        }
        
        if (!polygonConnected) {
          usersData.polygon_users = backendData.polygon_users || [];
        }
      }
      
      return usersData;
    } else {
      // Fall back to backend API
      console.log('Using backend API for users');
      const response = await fetchWithTimeout(`${API_BASE_URL}/users?period=${currentPeriod}`);
      return handleResponse(response);
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    // Fall back to backend API
    const response = await fetchWithTimeout(`${API_BASE_URL}/users?period=${currentPeriod}`);
    return handleResponse(response);
  }
}

/**
 * Fetch cache statistics
 * @returns {Promise} Promise resolving to cache stats
 */
export async function fetchCacheStats() {
  const response = await fetchWithTimeout(`${API_BASE_URL}/cache/status`);
  return handleResponse(response);
}

/**
 * Check for new activity since last update
 * @returns {Promise} Promise resolving to new activity data
 */
export async function checkForNewActivity() {
  try {
    const newActivities = await blockchainService.checkForNewActivities();
    return newActivities;
  } catch (error) {
    console.error('Error checking for new activities:', error);
    return { totalCount: 0, error: error.message };
  }
}

/**
 * Fetch tracked assets from both blockchains (Ardor and Polygon)
 * @returns {Promise} Promise resolving to tracked assets data
 */
export async function fetchTrackedAssets() {
  try {
    // Check if direct blockchain access is available
    const [ardorConnected, polygonConnected] = await Promise.all([
      blockchainService.checkArdorConnection(),
      blockchainService.checkPolygonConnection()
    ]);
    
    if (ardorConnected && polygonConnected) {
      console.log('Using direct blockchain connection for tracked assets');
      
      // If we have direct access to both blockchains, use blockchain service to fetch data
      const [ardorAssets, polygonTokens] = await Promise.all([
        blockchainService.getArdorTrackedAssets(),
        blockchainService.getPolygonTrackedTokens()
      ]);
      
      return {
        ardor: ardorAssets,
        polygon: polygonTokens,
        summary: {
          ardorRegularCardsCount: ardorAssets.regularCards.length,
          ardorSpecialCardsCount: ardorAssets.specialCards.length,
          ardorSpecificTokensCount: ardorAssets.specificTokens.length,
          polygonTokensCount: polygonTokens.tokens.length,
          totalAssetsTracked: 
            ardorAssets.regularCards.length + 
            ardorAssets.specialCards.length + 
            ardorAssets.specificTokens.length +
            polygonTokens.tokens.length
        },
        direct_data: true,
        timestamp: new Date().toISOString()
      };
    }
    
    // Fall back to backend API
    console.log('Using backend API for tracked assets');
    const response = await fetchWithTimeout(`${API_BASE_URL}/tracked-assets`);
    return handleResponse(response);
  } catch (error) {
    console.error('Error fetching tracked assets:', error);
    // Fall back to backend API
    const response = await fetchWithTimeout(`${API_BASE_URL}/tracked-assets`);
    return handleResponse(response);
  }
}