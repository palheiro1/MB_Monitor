/**
 * Data Manager
 * 
 * Centralized data fetching and state management.
 * Coordinates API requests and updates application state.
 */

import { tradeApi, craftApi, burnApi, cacheApi, userApi } from '../api/index.js';
import { setState, getState, savePreviousData } from '../state/index.js';
import { showNotification } from '../components/notifications.js';

// Event system for data updates
const dataEvents = new EventTarget();

/**
 * Fetch all data from APIs
 * @param {boolean} showLoading - Whether to show loading indicators
 * @returns {Promise<boolean>} Success status
 */
export async function fetchAllData(showLoading = true) {
  try {
    if (showLoading) {
      // Dispatch loading event
      dataEvents.dispatchEvent(new CustomEvent('data-loading'));
    }
    
    // Save current data for comparison
    savePreviousData();
    
    // Add error handling timeouts and better logging
    const options = { 
      timeout: 10000 // 10 second timeout for each request
    };
    
    // Fetch all data in parallel with reasonable timeouts
    const [trades, crafts, burns, users, cacheStatus] = await Promise.allSettled([
      fetchWithErrorHandling(() => tradeApi.getAll(getState('currentPeriod')), 'trades'),
      fetchWithErrorHandling(() => craftApi.getAll(getState('currentPeriod')), 'crafts'),
      fetchWithErrorHandling(() => burnApi.getAll(getState('currentPeriod')), 'burns'),
      fetchWithErrorHandling(() => userApi.getActiveUsers(getState('currentPeriod')), 'users'),
      fetchWithErrorHandling(() => cacheApi.getStatus(), 'cache')
    ]);
    
    // Store results in state, handling potential rejections
    updateStateFromResult('currentData.tradesData', trades);
    updateStateFromResult('currentData.craftsData', crafts);
    updateStateFromResult('currentData.burnsData', burns);
    updateStateFromResult('currentData.usersData', users);
    updateStateFromResult('currentData.cacheData', cacheStatus);
    
    // Update last fetch timestamp
    setState('lastUpdate', new Date().toISOString());
    
    // Dispatch data loaded event
    dataEvents.dispatchEvent(new CustomEvent('data-loaded', {
      detail: {
        trades: trades.status === 'fulfilled',
        crafts: crafts.status === 'fulfilled',
        burns: burns.status === 'fulfilled',
        users: users.status === 'fulfilled',
        cacheStatus: cacheStatus.status === 'fulfilled'
      }
    }));
    
    return true;
  } catch (error) {
    console.error('Error fetching data:', error);
    showNotification('Error', 'Failed to fetch data from server', 'error');
    
    // Dispatch error event
    dataEvents.dispatchEvent(new CustomEvent('data-error', {
      detail: { error }
    }));
    
    return false;
  } finally {
    if (showLoading) {
      // Dispatch loading finished event
      dataEvents.dispatchEvent(new CustomEvent('data-loading-finished'));
    }
  }
}

/**
 * Helper to update state from Promise result
 * @param {string} statePath - Path in state to update
 * @param {PromiseSettledResult} result - Promise result
 */
function updateStateFromResult(statePath, result) {
  if (result.status === 'fulfilled') {
    setState(statePath, result.value);
  } else {
    console.error(`Error fetching ${statePath}:`, result.reason);
  }
}

/**
 * Helper to fetch with better error handling
 * @param {Function} fetchFn - Function that returns a promise
 * @param {string} entityName - Name of entity being fetched for logging
 * @returns {Promise} Resolved promise with data or error
 */
async function fetchWithErrorHandling(fetchFn, entityName) {
  try {
    console.log(`Fetching ${entityName} data...`);
    const result = await fetchFn();
    console.log(`Successfully fetched ${entityName} data`);
    return result;
  } catch (error) {
    console.error(`Error fetching ${entityName} data:`, error);
    if (error.message.includes('HTML') || error.message.includes('Invalid JSON')) {
      console.warn(`Received HTML instead of JSON for ${entityName} - check API routes`);
    }
    throw error;
  }
}

/**
 * Subscribe to data events
 * @param {string} event - Event name ('data-loading', 'data-loaded', 'data-error', 'data-loading-finished')
 * @param {Function} callback - Callback function
 */
export function onDataEvent(event, callback) {
  dataEvents.addEventListener(event, callback);
}

/**
 * Unsubscribe from data events
 * @param {string} event - Event name
 * @param {Function} callback - Callback function to remove
 */
export function offDataEvent(event, callback) {
  dataEvents.removeEventListener(event, callback);
}

// Individual data fetching functions
export async function fetchTrades() {
  try {
    const data = await tradeApi.getAll(getState('currentPeriod'));
    setState('currentData.tradesData', data);
    return data;
  } catch (error) {
    console.error('Error fetching trades:', error);
    return null;
  }
}

export async function fetchCrafts() {
  try {
    const data = await craftApi.getAll(getState('currentPeriod'));
    setState('currentData.craftsData', data);
    return data;
  } catch (error) {
    console.error('Error fetching crafts:', error);
    return null;
  }
}

export async function fetchBurns() {
  try {
    const data = await burnApi.getAll(getState('currentPeriod'));
    setState('currentData.burnsData', data);
    return data;
  } catch (error) {
    console.error('Error fetching burns:', error);
    return null;
  }
}
