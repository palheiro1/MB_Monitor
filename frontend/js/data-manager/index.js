/**
 * Data Manager
 * 
 * Handles loading data from the API and updating the UI
 */

import { getState, setState } from '../state/index.js';
import { updateStats } from '../components/statistics.js';
import { renderAllCards } from '../components/transactions/index.js';
import { 
  updateLastUpdateTimestamp, 
  showLoading,
  hideLoading, 
  showError,
  updateStatusBadge
} from '../components/ui-manager.js';
// Import all the necessary fetch functions from data.js
import {
  fetchTrades,
  fetchCrafts,
  fetchMorphs,
  fetchBurns,
  fetchUsers, 
  fetchGiftz,
  fetchActivityData
} from '../api/data.js';
import { DEFAULT_PERIOD } from '../config.js';

// API endpoints
const API_BASE = '/api'; // Default base URL

/**
 * Fetch all data for the application
 * @param {boolean} shouldShowLoading - Whether to show loading indicator
 * @returns {Promise<Object>} Combined data object
 */
export async function fetchAllData(shouldShowLoading = false) {
  // Get current period from state
  const currentPeriod = getState('currentPeriod') || 'all';
  console.log(`Fetching all data for period: ${currentPeriod}`);
  
  if (shouldShowLoading) {
    showLoading();
    updateStatusBadge('loading');
  }

  try {
    // Store previous data to detect changes
    const previousData = getState('currentData');
    if (previousData) {
      setState('previousData', previousData);
    }

    // Fetch all data in parallel with the current period
    // Use the functions from data.js
    const [tradesData, burnsData, craftsData, morphsData, giftzData, usersData, activityData] = await Promise.all([
      fetchTrades(currentPeriod),
      fetchBurns(currentPeriod),
      fetchCrafts(currentPeriod),
      fetchMorphs(currentPeriod),
      fetchGiftz(currentPeriod),
      fetchUsers(currentPeriod),
      fetchActivityData(currentPeriod)
    ]);

    // Create combined data object
    const data = {
      tradesData,
      burnsData,
      craftsData,
      morphsData,
      giftzData,
      usersData,
      activityData,
      timestamp: new Date().toISOString()
    };

    // Update state with new data
    setState('currentData', data);
    
    // Log what we got for debugging purposes
    console.log('Fetched data by period:', currentPeriod, {
      trades: tradesData?.count || 0,
      burns: burnsData?.count || 0,
      crafts: craftsData?.count || 0,
      morphs: morphsData?.count || 0,
      giftz: giftzData?.count || 0,
      users: usersData?.count || 0
    });

    // Update UI with new data
    updateStats(data);
    renderAllCards();
    updateLastUpdateTimestamp();

    if (shouldShowLoading) {
      hideLoading();
      updateStatusBadge('success');
    }

    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    if (shouldShowLoading) {
      hideLoading();
      updateStatusBadge('error');
      showError(`Failed to load data: ${error.message}`);
    }
    throw error;
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
    
    // Special processing for crafts endpoint
    if (endpoint === 'crafts' && result.value) {
      // Log the structure
      console.log(`Crafts data structure from API:`, {
        hasCrafts: Array.isArray(result.value.crafts),
        hasCraftings: Array.isArray(result.value.craftings),
        craftCount: (result.value.crafts || []).length,
        craftingsCount: (result.value.craftings || []).length,
        count: result.value.count
      });
      
      // Ensure both properties exist
      if (Array.isArray(result.value.craftings) && !Array.isArray(result.value.crafts)) {
        result.value.crafts = result.value.craftings;
      } else if (Array.isArray(result.value.crafts) && !Array.isArray(result.value.craftings)) {
        result.value.craftings = result.value.crafts;
      }
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
