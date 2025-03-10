/**
 * MB Monitor Entry Point
 * 
 * This file serves as the main entry point for the application.
 * It initializes all required modules and starts the application.
 */

import { initState, setState } from './state/index.js';
import { setupUI } from './components/ui-manager.js';
import { initUIUpdater } from './components/ui-updater.js';
import { fetchAllData } from './data-manager/index.js';
import { DEFAULT_PERIOD } from './config.js';

/**
 * Initialize the application
 */
async function initApp() {
  console.log('Initializing MB Monitor application...');
  
  try {
    // Initialize state
    initState();
    
    // Explicitly set the current period to match our config
    setState('currentPeriod', DEFAULT_PERIOD);
    
    // Make sure the UI reflects the current period
    updatePeriodUISelection(DEFAULT_PERIOD);
    
    // Set up UI elements and event listeners
    setupUI();
    
    // Initialize UI updater
    initUIUpdater();
    
    // Initialize charts if the function exists
    if (typeof initializeCharts === 'function') {
      initializeCharts();
    }
    
    // Initialize transaction components if the function exists
    if (typeof initTransactionComponents === 'function') {
      initTransactionComponents();
    }
    
    // Initial data load
    await fetchAllData();
    
    // Set up auto refresh
    setupAutoRefresh();
    
    console.log('Application initialized successfully');
  } catch (error) {
    console.error('Failed to initialize application:', error);
  }
}

/**
 * Update the UI to reflect the currently selected period
 * @param {string} period - The period to set active
 */
function updatePeriodUISelection(period) {
  const periodButtons = document.querySelectorAll('.period-selector');
  periodButtons.forEach(button => {
    // Reset all buttons first
    button.classList.remove('active', 'btn-primary');
    button.classList.add('btn-outline-primary');
    
    // Set the active button
    if (button.dataset.period === period) {
      button.classList.remove('btn-outline-primary');
      button.classList.add('active', 'btn-primary');
    }
  });
}

/**
 * Set up automatic data refresh
 */
function setupAutoRefresh() {
  const refreshInterval = 60000; // 60 seconds
  
  // Start periodic data fetching
  setInterval(() => {
    fetchAllData(false); // Don't show loading overlay for auto-refresh
  }, refreshInterval);
  
  console.log(`Auto refresh set up, interval: ${refreshInterval}ms`);
}

// Run the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
