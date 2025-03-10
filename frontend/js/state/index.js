/**
 * State Management Module
 * 
 * Centralizes application state management using a simple store pattern.
 * Maintains the single source of truth for all application data.
 */

import { DEFAULT_PERIOD } from '../config.js';

// Application state store
let state = {
  // Configuration
  config: {
    API_BASE_URL: '/api',
    REFRESH_INTERVAL: 60000, // 60 seconds
    DEFAULT_PERIOD: DEFAULT_PERIOD,
    ANIMATION_ENABLED: true,
    CHART_ANIMATION_DURATION: 800,
    COUNTER_ANIMATION_DURATION: 1000
  },
  
  // UI state
  currentPeriod: DEFAULT_PERIOD,
  isLoading: false,
  sortDirection: 'desc',
  searchQuery: '',
  animationsEnabled: true,
  
  // Chart references
  charts: {
    activity: null,
    network: null
  },
  
  // Periodic refresh
  refreshTimer: null,
  lastUpdate: null,
  
  // Data storage
  currentData: {
    statsData: null,
    activityData: null,
    tradesData: null,
    giftzData: null,
    craftsData: null,
    morphsData: null,
    burnsData: null,
    usersData: null,
    cacheData: null
  },
  
  // Previous data (for comparison)
  previousData: {}
};

/**
 * Load configuration from data attributes in the script tag
 */
function loadConfig() {
  const configEl = document.getElementById('app-config');
  
  if (configEl) {
    if (configEl.dataset.apiUrl) state.config.API_BASE_URL = configEl.dataset.apiUrl;
    if (configEl.dataset.refreshInterval) state.config.REFRESH_INTERVAL = parseInt(configEl.dataset.refreshInterval);
    if (configEl.dataset.defaultPeriod) state.config.DEFAULT_PERIOD = configEl.dataset.defaultPeriod;
    if (configEl.dataset.animationEnabled) state.config.ANIMATION_ENABLED = configEl.dataset.animationEnabled === 'true';
  }
  
  // Update currentPeriod to match config
  state.currentPeriod = state.config.DEFAULT_PERIOD;
  state.animationsEnabled = state.config.ANIMATION_ENABLED;
}

/**
 * Initialize application state
 * @param {Object} initialState - Optional initial state to override defaults
 */
export function initState(initialState = {}) {
  // Load config from DOM first
  loadConfig();
  
  // Then merge any provided initialState
  Object.assign(state, initialState);
}

/**
 * Get state value
 * @param {string} key - State key to get (supports dot notation for nested props)
 * @param {*} defaultValue - Default value if key not found
 * @returns {*} State value
 */
export function getState(key, defaultValue = null) {
  if (!key) return { ...state };
  
  // Handle dot notation for nested properties
  const keys = key.split('.');
  let value = state;
  
  for (const k of keys) {
    if (value === null || value === undefined || typeof value !== 'object') {
      return defaultValue;
    }
    value = value[k];
    if (value === undefined) {
      return defaultValue;
    }
  }
  
  return value;
}

/**
 * Set state value
 * @param {string} key - State key to set
 * @param {*} value - New value
 */
export function setState(key, value) {
  if (!key) return;
  
  // Handle dot notation for nested properties
  const keys = key.split('.');
  
  if (keys.length === 1) {
    state[key] = value;
    return;
  }
  
  // Handle nested properties
  let current = state;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!(k in current)) {
      current[k] = {};
    }
    current = current[k];
  }
  
  current[keys[keys.length - 1]] = value;
}

/**
 * Save current data as previous data for comparison
 */
export function savePreviousData() {
  state.previousData = JSON.parse(JSON.stringify(state.currentData));
}

/**
 * Toggle sort direction and return new value
 * @returns {string} New sort direction ('asc' or 'desc')
 */
export function toggleSortDirection() {
  const newDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
  state.sortDirection = newDirection;
  return newDirection;
}

/**
 * Get the API base URL
 * @returns {string} API base URL
 */
export function getApiBaseUrl() {
  return state.config.API_BASE_URL;
}

/**
 * Get the refresh interval
 * @returns {number} Refresh interval in milliseconds
 */
export function getRefreshInterval() {
  return state.config.REFRESH_INTERVAL;
}
