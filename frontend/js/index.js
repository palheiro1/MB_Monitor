/**
 * MB Monitor Entry Point
 * 
 * This file serves as the main entry point for the application.
 * It initializes all required modules and starts the application.
 */

import { initState } from './state/index.js';
import { setupUI } from './components/ui-manager.js';
import { initUIUpdater } from './components/ui-updater.js';
import { fetchAllData } from './data-manager/index.js';
import { initializeCharts } from './components/charts.js';
import { initTransactionComponents } from './components/transactions/index.js';

/**
 * Initialize the application
 */
async function initApp() {
  console.log('Initializing MB Monitor application...');
  
  try {
    // Initialize state
    initState();
    
    // Set up UI elements and event listeners
    setupUI();
    
    // Initialize UI updater
    initUIUpdater();
    
    // Initialize charts
    initializeCharts();
    
    // Initialize transaction components
    initTransactionComponents();
    
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
