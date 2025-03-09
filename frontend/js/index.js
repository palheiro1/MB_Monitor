/**
 * MB Monitor Entry Point
 * 
 * This file serves as the main entry point for the application.
 * It imports necessary modules and initializes the application.
 */

// Import core modules
import { initState } from './state/index.js';
import { setupUI } from './components/ui-manager.js';
import { initializeCharts } from './components/charts.js';
import { fetchInitialData, startPeriodicFetching } from './api/data-fetcher.js';
import { renderCacheTable } from './components/cache-table.js';
import { initTransactionComponents } from './components/transactions/index.js';

/**
 * Initialize the application
 */
async function initApp() {
  console.log('Initializing MB Monitor application...');
  
  try {
    // Initialize state
    initState();
    
    // Setup UI elements and event listeners
    setupUI();
    
    // Initialize charts
    initializeCharts();
    
    // Initialize transaction components
    initTransactionComponents();
    
    // Initial data load
    await fetchInitialData();
    
    // Start periodic data fetching
    startPeriodicFetching();
    
    // Render cache table
    renderCacheTable();
    
    console.log('Application initialized successfully');
  } catch (error) {
    console.error('Failed to initialize application:', error);
  }
}

// Run the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
