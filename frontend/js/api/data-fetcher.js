/**
 * Data Fetching Module
 * 
 * Handles all API communication and data processing.
 * Centralizes fetch operations and error handling.
 */

import { getState, setState, savePreviousData, getApiBaseUrl, getRefreshInterval } from '../state/index.js';
import { showLoading, hideLoading, updateStatusBadge, updateLastUpdateTime } from '../components/ui-manager.js';
import { updateCharts } from '../components/charts.js';
import { renderAllCards } from '../components/cards.js';
import { renderCacheTable } from '../components/cache-table.js';
import { showNotification } from '../components/notifications.js';
import { checkForNewActivity } from '../components/activity-monitor.js';

let refreshTimer = null;

// Default options for fetch requests
const defaultOptions = {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 30000 // 30 seconds timeout
};

/**
 * Fetch initial data with optional loading overlay
 * @param {boolean} showLoadingOverlay - Whether to show loading overlay
 * @returns {Promise} Promise that resolves when all data is fetched
 */
export async function fetchInitialData(showLoadingOverlay = true) {
  try {
    // Save previous data for comparison
    savePreviousData();
    
    // Fetch all data in parallel
    const [trades, crafts, burns] = await Promise.all([
      fetchTrades(),
      fetchCrafts(),
      fetchBurns()
    ]);
    
    // Store results in state
    setState('currentData.tradesData', trades);
    setState('currentData.craftsData', crafts);
    setState('currentData.burnsData', burns);
    
    return { trades, crafts, burns };
  } catch (error) {
    console.error('Error fetching initial data:', error);
    throw error;
  }
}

/**
 * Start periodic data fetching
 */
export function startPeriodicFetching() {
  stopPeriodicFetching();
  
  const interval = getRefreshInterval();
  refreshTimer = setInterval(() => {
    fetchAllData(false);
  }, interval);
  
  console.log(`Periodic data fetching started (every ${interval/1000} seconds)`);
}

/**
 * Stop periodic data fetching
 */
export function stopPeriodicFetching() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
    console.log('Periodic data fetching stopped');
  }
}

/**
 * Fetch all data from all endpoints
 * @param {boolean} showLoading - Whether to show loading overlay
 * @returns {Promise} Promise that resolves when all data is fetched
 */
async function fetchAllData(showLoading = true) {
  if (showLoading) {
    showLoading();
  }
  
  updateStatusBadge('loading');
  
  // Save current data for comparison
  savePreviousData();
  
  try {
    // Fetch all data in parallel
    const results = await Promise.all([
      fetchStats(),
      fetchActivity(),
      fetchTrades(),
      fetchGiftzSales(),
      fetchCrafts(),
      fetchMorphs(),
      fetchBurns(),
      fetchUsers(),
      fetchCacheStats()
    ]);
    
    // Store results in state
    setState('currentData.statsData', results[0]);
    setState('currentData.activityData', results[1]);
    setState('currentData.tradesData', results[2]);
    setState('currentData.giftzData', results[3]);
    setState('currentData.craftsData', results[4]);
    setState('currentData.morphsData', results[5]);
    setState('currentData.burnsData', results[6]);
    setState('currentData.usersData', results[7]);
    setState('currentData.cacheData', results[8]);
    
    // Update UI
    updateCharts();
    renderAllCards();
    renderCacheTable();
    updateLastUpdateTime();
    checkForNewActivity();
    updateStatusBadge('success');
    
    if (showLoading) {
      hideLoading();
    }
    
    return results;
  } catch (error) {
    console.error('Error fetching data:', error);
    updateStatusBadge('error');
    
    if (showLoading) {
      hideLoading();
    }
    
    showNotification('Error', 'Failed to fetch data from the server. Please try again later.', 'error');
    throw error;
  }
}

/**
 * Handle API response and check for errors
 * @param {Response} response - The fetch response object
 * @returns {Promise} Promise resolving to JSON data
 * @throws {Error} If the response status is not OK
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
 * @returns {Promise} Fetch promise with timeout
 */
async function fetchWithTimeout(url, options = {}, timeout = defaultOptions.timeout) {
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

// Individual API endpoint functions
export async function fetchStats() {
  const currentPeriod = getState('currentPeriod');
  const apiBaseUrl = getApiBaseUrl();
  
  try {
    const response = await fetchWithTimeout(`${apiBaseUrl}/stats?period=${currentPeriod}`);
    return handleResponse(response);
  } catch (error) {
    console.error('Error fetching stats:', error);
    throw error;
  }
}

export async function fetchActivity() {
  const currentPeriod = getState('currentPeriod');
  const apiBaseUrl = getApiBaseUrl();
  
  try {
    const response = await fetchWithTimeout(`${apiBaseUrl}/activity?period=${currentPeriod}`);
    return handleResponse(response);
  } catch (error) {
    console.error('Error fetching activity data:', error);
    throw error;
  }
}

export async function fetchTrades() {
  const currentPeriod = getState('currentPeriod');
  const API_BASE_URL = getApiBaseUrl();
  const response = await fetchWithTimeout(`${API_BASE_URL}/trades?period=${currentPeriod}`);
  return handleResponse(response);
}

export async function fetchGiftzSales() {
  const currentPeriod = getState('currentPeriod');
  const apiBaseUrl = getApiBaseUrl();
  
  try {
    const response = await fetchWithTimeout(`${apiBaseUrl}/giftz?period=${currentPeriod}`);
    return handleResponse(response);
  } catch (error) {
    console.error('Error fetching giftz sales:', error);
    throw error;
  }
}

export async function fetchCrafts() {
  const currentPeriod = getState('currentPeriod');
  const API_BASE_URL = getApiBaseUrl();
  const response = await fetchWithTimeout(`${API_BASE_URL}/crafts?period=${currentPeriod}`);
  return handleResponse(response);
}

export async function fetchMorphs() {
  const currentPeriod = getState('currentPeriod');
  const apiBaseUrl = getApiBaseUrl();
  
  try {
    const response = await fetchWithTimeout(`${apiBaseUrl}/morphs?period=${currentPeriod}`);
    return handleResponse(response);
  } catch (error) {
    console.error('Error fetching morphs:', error);
    throw error;
  }
}

export async function fetchBurns() {
  const currentPeriod = getState('currentPeriod');
  const API_BASE_URL = getApiBaseUrl();
  const response = await fetchWithTimeout(`${API_BASE_URL}/burns?period=${currentPeriod}`);
  return handleResponse(response);
}

export async function fetchUsers() {
  const currentPeriod = getState('currentPeriod');
  const apiBaseUrl = getApiBaseUrl();
  
  try {
    const response = await fetchWithTimeout(`${apiBaseUrl}/users?period=${currentPeriod}`);
    return handleResponse(response);
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

export async function fetchCacheStats() {
  const apiBaseUrl = getApiBaseUrl();
  
  try {
    const response = await fetchWithTimeout(`${apiBaseUrl}/cache/status`);
    return handleResponse(response);
  } catch (error) {
    console.error('Error fetching cache stats:', error);
    throw error;
  }
}
