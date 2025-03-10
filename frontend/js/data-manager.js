/**
 * Data Manager
 * 
 * Central manager for all application data.
 * Handles fetching, caching, and providing data to components.
 */

import { getTrades, getBurns, getCrafts, getCacheStatus } from './api/api-client.js';

// Application state
const state = {
  trades: { ardor_trades: [], polygon_trades: [], count: 0 },
  burns: { burns: [], count: 0 },
  crafts: { craftings: [], count: 0 },
  cacheStatus: { files: [] },
  currentPeriod: '30d',
  lastUpdate: null,
  isLoading: false
};

// Event dispatcher for data changes
const dispatcher = document.createElement('div');

/**
 * Set the current time period and reload data
 * @param {string} period - Time period ('24h', '7d', '30d', 'all')
 */
export function setPeriod(period) {
  state.currentPeriod = period;
  loadAllData();
}

/**
 * Get the current state of the data
 * @param {string} key - Optional specific data key to get
 * @returns {any} - Requested state data
 */
export function getState(key) {
  if (key) {
    return state[key];
  }
  return { ...state };
}

/**
 * Add an event listener for data changes
 * @param {string} event - Event name ('trades-updated', 'burns-updated', 'crafts-updated', 'all-updated')
 * @param {Function} callback - Callback function
 */
export function onDataChange(event, callback) {
  dispatcher.addEventListener(event, callback);
}

/**
 * Remove an event listener
 * @param {string} event - Event name
 * @param {Function} callback - Callback function
 */
export function offDataChange(event, callback) {
  dispatcher.removeEventListener(event, callback);
}

/**
 * Load all data from API
 * @param {boolean} showLoading - Whether to set loading state
 * @returns {Promise<void>}
 */
export async function loadAllData(showLoading = true) {
  if (showLoading) {
    state.isLoading = true;
    dispatcher.dispatchEvent(new CustomEvent('loading-started'));
  }
  
  try {
    // Load data in parallel
    const [tradesData, burnsData, craftsData] = await Promise.all([
      loadTrades(),
      loadBurns(),
      loadCrafts()
    ]);
    
    // Update the state
    state.trades = tradesData;
    state.burns = burnsData;
    state.crafts = craftsData;
    state.lastUpdate = new Date();
    
    // Notify listeners that all data was updated
    dispatcher.dispatchEvent(new CustomEvent('all-updated', { detail: state }));
    
  } catch (error) {
    console.error('Error loading all data:', error);
    dispatcher.dispatchEvent(new CustomEvent('loading-error', { 
      detail: { error: error.message }
    }));
  } finally {
    if (showLoading) {
      state.isLoading = false;
      dispatcher.dispatchEvent(new CustomEvent('loading-finished'));
    }
  }
}

/**
 * Load trades data
 * @returns {Promise<Object>} - Trades data
 */
export async function loadTrades() {
  try {
    const data = await getTrades(state.currentPeriod);
    state.trades = data;
    dispatcher.dispatchEvent(new CustomEvent('trades-updated', { detail: data }));
    return data;
  } catch (error) {
    console.error('Error loading trades data:', error);
    return { ardor_trades: [], polygon_trades: [], count: 0 };
  }
}

/**
 * Load burns data
 * @returns {Promise<Object>} - Burns data
 */
export async function loadBurns() {
  try {
    const data = await getBurns(state.currentPeriod);
    state.burns = data;
    dispatcher.dispatchEvent(new CustomEvent('burns-updated', { detail: data }));
    return data;
  } catch (error) {
    console.error('Error loading burns data:', error);
    return { burns: [], count: 0 };
  }
}

/**
 * Load crafts data
 * @returns {Promise<Object>} - Crafts data
 */
export async function loadCrafts() {
  try {
    const data = await getCrafts(state.currentPeriod);
    state.crafts = data;
    dispatcher.dispatchEvent(new CustomEvent('crafts-updated', { detail: data }));
    return data;
  } catch (error) {
    console.error('Error loading crafts data:', error);
    return { craftings: [], count: 0 };
  }
}

/**
 * Load cache status
 * @returns {Promise<Object>} - Cache status
 */
export async function loadCacheStatus() {
  try {
    const data = await getCacheStatus();
    state.cacheStatus = data;
    dispatcher.dispatchEvent(new CustomEvent('cache-updated', { detail: data }));
    return data;
  } catch (error) {
    console.error('Error loading cache status:', error);
    return { files: [] };
  }
}

/**
 * Start periodic data loading
 * @param {number} interval - Interval in milliseconds
 * @returns {number} - Timer ID
 */
export function startAutoRefresh(interval = 60000) {
  return setInterval(() => {
    loadAllData(false);
  }, interval);
}

// Initialize the data manager
export function initDataManager() {
  console.log('Initializing data manager');
  loadAllData();
}
