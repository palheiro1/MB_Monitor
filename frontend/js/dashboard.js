/**
 * Core dashboard functionality
 */

import { getData, setData, getUiState, setUiState } from './state.js';

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  // Set up event handlers
  setupTabHandlers();
  setupPeriodSelectors();
  setupRefreshButton();
  
  // Initial data load
  loadAllData();
  
  // Hide loading overlay
  document.getElementById('loading-overlay').style.display = 'none';
});

// Load all required data based on current period
async function loadAllData() {
  const period = getUiState('currentPeriod');
  
  try {
    // Show loading overlay
    document.getElementById('loading-overlay').style.display = 'flex';
    
    // Fetch all data types in parallel
    const [stats, activity, trades, crafts, burns] = await Promise.all([
      fetch(`/api/stats?period=${period}`).then(r => r.json()),
      fetch(`/api/activity?period=${period}`).then(r => r.json()),
      fetch(`/api/trades?period=${period}`).then(r => r.json()),
      fetch(`/api/craftings?period=${period}`).then(r => r.json()),
      fetch(`/api/burns?period=${period}`).then(r => r.json())
    ]);
    
    // Update state with new data
    setData('stats', stats);
    setData('activity', activity);
    setData('trades', trades);
    setData('crafts', crafts);
    setData('burns', burns);
    
    // Update UI components
    updateStats(stats);
    updateActivityChart(activity);
    
    // Update last update timestamp
    document.getElementById('last-update').textContent = new Date().toLocaleString();
  } catch (error) {
    console.error('Failed to load data:', error);
  } finally {
    // Hide loading overlay
    document.getElementById('loading-overlay').style.display = 'none';
  }
}

// Setup handlers for remaining functionality...
