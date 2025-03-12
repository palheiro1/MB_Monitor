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

/**
 * Update the stats section with the latest data
 * @param {string} period - The time period for stats (24h, 7d, 30d, all)
 */
async function updateStats(period = '24h') {
    try {
        // FIXED: Ensure period is explicitly passed to fetchStats
        const stats = await fetchStats(period);
        
        // Debug log to help verify data
        console.log(`Fetched data by period: ${period}`, stats);
        
        // FIXED: Pass the period to updateStatistics
        updateStatistics(stats, period);
        
        // FIXED: If we have morphs count but not totalQuantity, fetch it separately
        if (stats.morphs && !stats.totalMorphs) {
            console.log("Stats object missing totalMorphs, fetching details...");
            // Get full morphs data to get accurate totalQuantity
            const morphsData = await fetchMorphs(period);
            if (morphsData && morphsData.totalQuantity) {
                // Update specific morph stats with the correct filtered total
                updateMorphsDisplay({
                    morphs: Array(stats.morphs).fill({}), // Just need the length
                    totalQuantity: morphsData.totalQuantity
                });
                console.log(`Updated total morphs count to ${morphsData.totalQuantity} for period ${period}`);
            }
        }
        
        return stats;
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

/**
 * Handle period change event
 * @param {string} period - New time period
 */
async function handlePeriodChange(period) {
    // FIXED: Set the current period early so all updates use it
    currentPeriod = period;
    
    // Update period selection UI
    document.querySelectorAll('.period-option').forEach(option => {
        option.classList.toggle('active', option.dataset.period === period);
    });
    
    console.log(`Period changed to: ${period}`);
    
    // FIXED: Explicitly pass period to all update functions
    await updateStats(period);
    await updateTradesCards(period);
    await updateGiftzCards(period);
    await updateCraftCards(period);
    await updateMorphCards(period);
    await updateBurnCards(period);
    
    // Dispatch event for other components
    document.dispatchEvent(new CustomEvent('period-change', { detail: { period } }));
}

/**
 * Update all statistics based on current period
 */
function updateAllStats() {
  const period = currentPeriod || '30d'; // Ensure we have a period
  
  // Fetch combined stats with current period parameter
  fetchStats(period)
    .then(data => {
      console.log(`Fetched data by period: ${period}`, data);
      
      // Update the stats display with period parameter
      updateStatistics(data, period);
      
      // ...existing code...
    })
    .catch(error => {
      console.error('Error fetching stats:', error);
    });
}

// Attach event listener to period selector
document.getElementById('period-selector').addEventListener('change', function() {
  const selectedPeriod = this.value;
  currentPeriod = selectedPeriod;
  
  console.log(`Period changed to: ${selectedPeriod}`);
  
  // Update all stats with the new period
  updateAllStats();
  
  // Update charts
  updateCharts(selectedPeriod);
  
  // Also update each tab's data with the new period
  updateActiveTab();
});
