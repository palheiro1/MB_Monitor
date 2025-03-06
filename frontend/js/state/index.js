/**
 * State Management Module
 * 
 * Centralizes application state management using a simple store pattern.
 * Maintains the single source of truth for all application data.
 */

// Default application configuration
const DEFAULT_CONFIG = {
  API_BASE_URL: '/api',
  REFRESH_INTERVAL: 60000, // 60 seconds
  DEFAULT_PERIOD: '30d',
  ANIMATION_ENABLED: true,
  CHART_ANIMATION_DURATION: 800,
  COUNTER_ANIMATION_DURATION: 1000,
  MAX_NOTIFICATIONS: 3,
  NOTIFICATION_DURATION: 5000
};

// Load configuration from environment or defaults
const config = loadConfig();

// Application state store
let state = {
  // Configuration
  config,
  
  // UI state
  currentPeriod: config.DEFAULT_PERIOD,
  isLoading: false,
  sortDirection: 'desc',
  animationsEnabled: config.ANIMATION_ENABLED,
  
  // Chart references
  charts: {
    activity: null,
    network: null
  },
  
  // Periodic refresh
  refreshTimer: null,
  lastUpdate: null,
  
  // Data storage
  previousData: {},
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
  }
};

/**
 * Load configuration from environment variables or data attributes
 * @returns {Object} Configuration object
 */
function loadConfig() {
  // Try to load from script data attributes
  const configScript = document.getElementById('app-config');
  
  if (configScript) {
    const dataset = configScript.dataset;
    
    return {
      API_BASE_URL: dataset.apiUrl || DEFAULT_CONFIG.API_BASE_URL,
      REFRESH_INTERVAL: parseInt(dataset.refreshInterval) || DEFAULT_CONFIG.REFRESH_INTERVAL,
      DEFAULT_PERIOD: dataset.defaultPeriod || DEFAULT_CONFIG.DEFAULT_PERIOD,
      ANIMATION_ENABLED: dataset.animationEnabled !== 'false',
      CHART_ANIMATION_DURATION: parseInt(dataset.chartAnimationDuration) || DEFAULT_CONFIG.CHART_ANIMATION_DURATION,
      COUNTER_ANIMATION_DURATION: parseInt(dataset.counterAnimationDuration) || DEFAULT_CONFIG.COUNTER_ANIMATION_DURATION,
      MAX_NOTIFICATIONS: parseInt(dataset.maxNotifications) || DEFAULT_CONFIG.MAX_NOTIFICATIONS,
      NOTIFICATION_DURATION: parseInt(dataset.notificationDuration) || DEFAULT_CONFIG.NOTIFICATION_DURATION
    };
  }
  
  return { ...DEFAULT_CONFIG };
}

/**
 * Initialize application state
 * @param {Object} initialState - Optional initial state to override defaults
 */
export function initState(initialState = {}) {
  state = {
    ...state,
    ...initialState
  };
}

/**
 * Get the current state or a specific part of it
 * @param {string} path - Optional dot-notation path (e.g., 'currentData.statsData')
 * @returns {*} The requested state portion or the entire state
 */
export function getState(path) {
  if (!path) return { ...state };
  
  return path.split('.').reduce((obj, key) => 
    obj && obj[key] !== undefined ? obj[key] : null, state);
}

/**
 * Update application state
 * @param {string} path - Dot-notation path to update (e.g., 'currentData.statsData')
 * @param {*} value - New value to set
 * @returns {Object} Updated state
 */
export function setState(path, value) {
  if (!path) return state;
  
  const parts = path.split('.');
  const lastKey = parts.pop();
  let current = state;
  
  // Navigate to the parent object
  for (const part of parts) {
    if (!current[part]) current[part] = {};
    current = current[part];
  }
  
  // Update the value
  current[lastKey] = value;
  
  return state;
}

/**
 * Save current data as previous data for comparison
 */
export function savePreviousData() {
  state.previousData = { ...state.currentData };
}

/**
 * Toggle sort direction
 * @returns {string} New sort direction ('asc' or 'desc')
 */
export function toggleSortDirection() {
  state.sortDirection = state.sortDirection === 'desc' ? 'asc' : 'desc';
  return state.sortDirection;
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
