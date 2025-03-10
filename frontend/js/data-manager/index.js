/**
 * Data Manager
 * 
 * Handles loading data from the API and updating the UI
 */

import { getState, setState } from '../state/index.js';
import { updateStats } from '../components/statistics.js';
import { renderAllCardsWithAnimation } from '../components/transactions/index.js';
import { updateLastUpdateTimestamp, hideLoading, showError } from '../components/ui-manager.js';
import { DEFAULT_PERIOD } from '../config.js';

// API endpoints
const API_BASE = '/api'; // Default base URL

/**
 * Fetch all data from the API
 * @param {boolean} showLoading - Whether to show loading indicator
 * @returns {Promise<Object>} Combined data from all endpoints
 */
export async function fetchAllData(showLoading = true) {
  try {
    // Get the current period from state (fallback to default if not set)
    const period = getState('currentPeriod') || DEFAULT_PERIOD;
    console.log(`Fetching all data for period: ${period}`);
    
    // Store current data as previous for comparison
    const currentData = getState('currentData');
    if (currentData) {
      setState('previousData', currentData);
    }
    
    // Fetch all data in parallel, using the current period
    const results = await Promise.allSettled([
      fetchEndpoint(`/trades?period=${period}`),
      fetchEndpoint(`/crafts?period=${period}`),
      fetchEndpoint(`/morphs?period=${period}`),
      fetchEndpoint(`/burns?period=${period}`),
      fetchEndpoint(`/users?period=${period}`),
      fetchEndpoint(`/giftz?period=${period}`)
    ]);
    
    // Destructure results with better error handling
    const [
      tradesResult, 
      craftsResult, 
      morphsResult, 
      burnsResult, 
      usersResult, 
      giftzResult
    ] = results;
    
    // Process results with detailed logging
    const tradesData = processResult(tradesResult, 'trades');
    const craftsData = processResult(craftsResult, 'crafts');
    const morphsData = processResult(morphsResult, 'morphs');
    const burnsData = processResult(burnsResult, 'burns');
    const usersData = processResult(usersResult, 'users');
    const giftzData = processResult(giftzResult, 'giftz');
    
    // Log data structure details for diagnostics
    console.log('Data structure summary:', {
      trades: {
        hasData: !!tradesData,
        ardorTrades: tradesData?.ardor_trades?.length || 0,
        polygonTrades: tradesData?.polygon_trades?.length || 0
      },
      crafts: {
        hasData: !!craftsData,
        count: craftsData?.count || 0,
        craftsArray: Array.isArray(craftsData?.crafts),
        craftsLength: craftsData?.crafts?.length || 0
      },
      morphs: {
        hasData: !!morphsData,
        count: morphsData?.count || 0,
        morphsArray: Array.isArray(morphsData?.morphs),
        morphsLength: morphsData?.morphs?.length || 0
      },
      burns: {
        hasData: !!burnsData,
        count: burnsData?.count || 0,
        burnsArray: Array.isArray(burnsData?.burns),
        burnsLength: burnsData?.burns?.length || 0
      }
    });
    
    // Combine into a single data object
    const allData = {
      tradesData,
      craftsData,
      morphsData,
      burnsData,
      usersData,
      giftzData,
      timestamp: new Date().toISOString()
    };
    
    // Update state and UI
    setState('currentData', allData);
    
    // Update stats and UI
    updateStats(allData);
    
    try {
      renderAllCardsWithAnimation();
    } catch (renderError) {
      console.error('Error rendering cards:', renderError);
      showError('Error displaying data. Please check console for details.');
    }
    
    if (typeof updateLastUpdateTimestamp === 'function') {
      updateLastUpdateTimestamp();
    }
    
    // Hide loading indicator if applicable
    if (showLoading && typeof hideLoading === 'function') {
      hideLoading();
    }
    
    // Make sure to return all the fetched data
    return allData;
  } catch (error) {
    console.error('Error fetching data:', error);
    if (showLoading && typeof hideLoading === 'function') {
      hideLoading();
    }
    showError('Failed to fetch data from server');
    return {};
  }
}

/**
 * Process API result with error handling
 * @param {Object} result - Promise.allSettled result
 * @param {string} endpoint - Endpoint name for logging
 * @returns {Object|null} The data or null if error
 */
function processResult(result, endpoint) {
  if (result.status === 'fulfilled') {
    if (Object.keys(result.value).length === 0) {
      console.warn(`${endpoint} returned empty data`);
    }
    return result.value;
  } else {
    console.error(`Error fetching ${endpoint}:`, result.reason);
    return null;
  }
}

/**
 * Fetch data from an API endpoint
 * @param {string} endpoint - API endpoint path
 * @returns {Promise<Object>} Response data
 */
async function fetchEndpoint(endpoint) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`);
    
    if (!response.ok) {
      console.error(`API error for ${endpoint}: ${response.status} ${response.statusText}`);
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Log data structure for debugging
    console.log(`Data received from ${endpoint}:`, {
      hasData: !!data,
      keys: data ? Object.keys(data) : [],
      count: data?.count || 0
    });
    
    return data;
  } catch (error) {
    console.error(`Error fetching from ${endpoint}:`, error);
    return {};
  }
}

/**
 * Refresh specific data endpoint
 * @param {string} endpoint - Endpoint to refresh
 * @param {string} stateKey - Key in state to update
 */
export async function refreshEndpoint(endpoint, stateKey) {
  try {
    const period = getState('currentPeriod') || '30d';
    const data = await fetchEndpoint(`/${endpoint}?period=${period}&refresh=true`);
    
    // Update just this part of the state
    const currentData = getState('currentData') || {};
    setState('currentData', {
      ...currentData,
      [stateKey]: data
    });
    
    // Update UI for just this component
    updateStats(getState('currentData'));
  } catch (error) {
    console.error(`Error refreshing ${endpoint}:`, error);
  }
}
