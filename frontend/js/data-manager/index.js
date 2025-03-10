/**
 * Data Manager
 * 
 * Handles loading data from the API and updating the UI
 */

import { getState, setState } from '../state/index.js';
import { updateStats } from '../components/statistics.js';
import { renderAllCardsWithAnimation } from '../components/transactions/index.js';
import { updateLastUpdateTimestamp, hideLoading } from '../components/ui-manager.js';

// API endpoints
const API_BASE = '/api'; // Default base URL

/**
 * Fetch all data from the API
 * @param {boolean} showLoading - Whether to show loading indicator
 * @returns {Promise<Object>} Combined data from all endpoints
 */
export async function fetchAllData(showLoading = true) {
  try {
    const period = getState('currentPeriod') || '30d';
    console.log(`Fetching all data for period: ${period}`);
    
    // Store current data as previous for comparison
    const currentData = getState('currentData');
    if (currentData) {
      setState('previousData', currentData);
    }
    
    // Fetch all data in parallel
    const [tradesData, craftsData, morphsData, burnsData, usersData, giftzData] = await Promise.all([
      fetchEndpoint(`/trades?period=${period}`),
      fetchEndpoint(`/crafts?period=${period}`),
      fetchEndpoint(`/morphs?period=${period}`),
      fetchEndpoint(`/burns?period=${period}`),
      fetchEndpoint(`/users?period=${period}`),
      fetchEndpoint(`/giftz?period=${period}`)
    ]);
    
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
    
    // Only call these functions if they exist
    if (typeof renderAllCardsWithAnimation === 'function') {
      renderAllCardsWithAnimation();
    }
    
    if (typeof updateLastUpdateTimestamp === 'function') {
      updateLastUpdateTimestamp();
    }
    
    // Hide loading indicator if applicable
    if (showLoading && typeof hideLoading === 'function') {
      hideLoading();
    }
    
    return allData;
  } catch (error) {
    console.error('Error fetching data:', error);
    if (showLoading && typeof hideLoading === 'function') {
      hideLoading();
    }
    return {};
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
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
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
