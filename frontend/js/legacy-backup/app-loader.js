/**
 * App Loader
 * 
 * Initializes all UI components and starts data loading.
 * This file provides a bridge between the legacy app-core.js and the new modular architecture.
 */

import { initDataManager, loadAllData, startAutoRefresh } from './data-manager.js';
import { initTradesView } from './ui/trades-view.js';
import { initBurnsView } from './ui/burns-view.js';
import { initCraftsView } from './ui/crafts-view.js';

// ARDOR_EPOCH for timestamp conversion
const ARDOR_EPOCH = new Date("2018-01-01T00:00:00Z").getTime();

/**
 * Initialize the application
 */
export function initApp() {
  console.log('Initializing MB Monitor with new architecture...');
  
  try {
    // Initialize data manager
    initDataManager();
    
    // Initialize UI components
    initTradesView('ardor-trades-cards');
    initBurnsView('burns-cards');
    initCraftsView('crafts-cards');
    
    // Start auto-refresh
    const refreshInterval = 60000; // 60 seconds
    const refreshTimer = startAutoRefresh(refreshInterval);
    
    // Initial load
    loadAllData();
    
    console.log('New architecture initialized successfully');
    
    return {
      refreshTimer,
      refreshInterval
    };
  } catch (error) {
    console.error('Error initializing application with new architecture:', error);
    return null;
  }
}

/**
 * Converts Ardor timestamp to Date object
 * @param {number} timestamp - Ardor timestamp (seconds since epoch)
 * @returns {Date} JavaScript Date object
 */
export function ardorTimestampToDate(timestamp) {
  return new Date(ARDOR_EPOCH + (timestamp * 1000));
}

/**
 * Format time ago for display
 * @param {Date|number|string} date - Date to format
 * @returns {string} Time ago string
 */
export function formatTimeAgo(date) {
  if (!date) return 'Unknown';
  
  try {
    let past;
    
    if (date instanceof Date) {
      past = date;
    } else if (typeof date === 'number') {
      // Check if it's an Ardor timestamp (seconds since epoch)
      if (date < 1e10) {
        past = ardorTimestampToDate(date);
      } else {
        past = new Date(date);
      }
    } else {
      past = new Date(date);
    }
    
    const now = new Date();
    const seconds = Math.floor((now - past) / 1000);
    
    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  } catch (error) {
    console.error('Error calculating time ago:', error);
    return 'Unknown time';
  }
}

// Initialize when imported
document.addEventListener('DOMContentLoaded', () => {
  // Check if we should initialize the new architecture
  const useNewArchitecture = true; // Can be controlled by a feature flag
  
  if (useNewArchitecture) {
    initApp();
  }
});
