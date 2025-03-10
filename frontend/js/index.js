/**
 * Main Application Entry Point
 * 
 * This file initializes the MB Monitor application.
 */

import { initState } from './state/index.js';
import { loadEnvConfig } from './config.js';
import { initializeCharts, updateCharts } from './components/charts.js';
import { setupUI } from './components/ui-manager.js';

/**
 * Initialize the application
 */
async function initApp() {
  console.log('Initializing MB Monitor application...');
  
  try {
    // Load environment configuration
    const envConfig = loadEnvConfig();
    console.log('Loaded configuration:', envConfig);
    
    // Initialize state with config
    initState({ 
      config: envConfig
    });
    
    // Setup UI components and event handlers
    setupUI();
    
    // Initialize charts
    console.log('Initializing charts...');
    initializeCharts();
    
    // Initial data fetch and chart update
    setTimeout(() => {
      console.log('Performing initial chart update...');
      updateCharts();
    }, 100);
    
    console.log('Application initialized successfully');
  } catch (error) {
    console.error('Error initializing application:', error);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// Expose for debugging
window.updateCharts = updateCharts;
window.initApp = initApp;
