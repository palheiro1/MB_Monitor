/**
 * Application Configuration
 * 
 * Central configuration for the application.
 * Contains settings for API endpoints, timeouts, and other constants.
 */

// API Configuration
export const API_CONFIG = {
  // Application backend API
  BACKEND_API_URL: '/api',
  
  // Blockchain node URLs
  ARDOR: {
    NODE_URL: 'http://localhost:27876',
    API_PATH: '/nxt',  // Default API path for Ardor nodes
    REQUEST_TIMEOUT: 30000, // 30 seconds timeout for Ardor API requests
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000, // 2 seconds between retries
    TESTNET: false, // Set to true to use testnet
    CHAIN_ID: 1, // Main chain - change if querying child chains
  },
  
  POLYGON: {
    NODE_URL: 'https://polygon-rpc.com', // Default Polygon RPC URL
    SCAN_API_URL: 'https://api.polygonscan.com/api',
    API_KEY: '', // Add your Polygonscan API key if you have one
    REQUEST_TIMEOUT: 30000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000,
  }
};

// Application Settings
export const REFRESH_INTERVAL = 60000; // Data refresh interval in ms
export const DEFAULT_PERIOD = 'all'; // Changed from '30d' to 'all'
export const UI_ANIMATION_ENABLED = true;
export const CHART_ANIMATION_DURATION = 800;
export const COUNTER_ANIMATION_DURATION = 1000;
export const MAX_NOTIFICATIONS = 3;
export const NOTIFICATION_DURATION = 5000;

// Time periods in milliseconds for filtering data
export const TIME_PERIODS = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  'all': null // null means no time filter
};

/**
 * Load environment-specific configuration
 * Allows overriding default config with values from HTML data attributes
 * 
 * @returns {Object} Merged configuration
 */
export function loadEnvConfig() {
  const defaultConfig = {
    API_BASE_URL: API_CONFIG.BACKEND_API_URL,
    REFRESH_INTERVAL,
    DEFAULT_PERIOD,
    ANIMATION_ENABLED: UI_ANIMATION_ENABLED,
    CHART_ANIMATION_DURATION,
    COUNTER_ANIMATION_DURATION,
    MAX_NOTIFICATIONS,
    NOTIFICATION_DURATION
  };
  
  // Check for config data in script tag
  const configScript = document.getElementById('app-config');
  if (!configScript) return defaultConfig;
  
  // Extract and merge config data from data attributes
  const dataset = configScript.dataset;
  return {
    API_BASE_URL: dataset.apiUrl || defaultConfig.API_BASE_URL,
    ARDOR_NODE_URL: dataset.ardorNodeUrl || API_CONFIG.ARDOR.NODE_URL,
    POLYGON_NODE_URL: dataset.polygonNodeUrl || API_CONFIG.POLYGON.NODE_URL,
    REFRESH_INTERVAL: parseInt(dataset.refreshInterval) || defaultConfig.REFRESH_INTERVAL,
    DEFAULT_PERIOD: dataset.defaultPeriod || defaultConfig.DEFAULT_PERIOD,
    ANIMATION_ENABLED: dataset.animationEnabled !== 'false',
    CHART_ANIMATION_DURATION: parseInt(dataset.chartAnimationDuration) || defaultConfig.CHART_ANIMATION_DURATION,
    COUNTER_ANIMATION_DURATION: parseInt(dataset.counterAnimationDuration) || defaultConfig.COUNTER_ANIMATION_DURATION,
    MAX_NOTIFICATIONS: parseInt(dataset.maxNotifications) || defaultConfig.MAX_NOTIFICATIONS,
    NOTIFICATION_DURATION: parseInt(dataset.notificationDuration) || defaultConfig.NOTIFICATION_DURATION
  };
}