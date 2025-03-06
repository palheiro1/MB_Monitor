/**
 * Mythical Beings Monitor - Frontend Application
 * 
 * This application monitors blockchain activities related to Mythical Beings NFTs.
 * It provides real-time data visualization for trades, crafting, morphing, and other
 * blockchain activities across Ardor and Polygon networks.
 * 
 * @author MB Monitor Team
 * @version 1.0.0
 */

import { REFRESH_INTERVAL } from './config.js';
import { state, storePreviousData } from './state.js';
import { fetchStats, fetchActivity, fetchTrades, fetchGiftzSales, fetchCrafts, fetchMorphs, fetchBurns, fetchUsers, fetchCacheStats, fetchTrackedAssets } from './api/endpoints.js';
import { renderCharts } from './components/charts.js';
import { updateStatsWithAnimation } from './components/stats.js';
import { renderAllCardsWithAnimation, initTransactionComponents } from './components/transactions/index.js';
import { renderCacheTable } from './components/cache-table.js';
import { showNotification } from './services/notifications.js';
import { checkForNewActivity } from './services/activityDetector.js';
import { updateStatusBadge, updateLastUpdatedTime, showLoadingOverlay, hideLoadingOverlay } from './utils/helpers.js';
import { setupEventListeners } from './eventHandlers.js';

/**
 * Document ready handler
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('MB Monitor initialized');
  
  // Initialize components
  initTransactionComponents();
  
  // Set up event listeners
  setupEventListeners();
  
  // Initial data fetch
  fetchInitialData();
  
  // Set up periodic refresh
  setInterval(refreshData, REFRESH_INTERVAL);
});

// Setup event listeners for controls
function setupEventListeners() {
  // Period selector buttons
  document.querySelectorAll('.period-selector').forEach(button => {
    button.addEventListener('click', handlePeriodChange);
  });
  
  // Refresh button
  document.getElementById('refresh-btn').addEventListener('click', refreshData);
  
  // Sort buttons
  document.querySelectorAll('.sort-btn').forEach(button => {
    button.addEventListener('click', handleSortToggle);
  });
  
  // Search inputs
  document.querySelectorAll('.search-input').forEach(input => {
    input.addEventListener('input', handleSearch);
  });
}

// Initial data fetch
function fetchInitialData() {
  showLoadingOverlay();
  fetchData()
    .then(data => {
      updateStats(data.stats);
      renderCharts(data.activity);
      renderTransactionCards(data.trades, data.giftz, data.crafts, data.morphs, data.burns, data.users);
      hideLoadingOverlay();
      updateLastUpdatedTime();
    })
    .catch(error => {
      console.error('Error fetching initial data:', error);
      hideLoadingOverlay();
      showNotification('Error', 'Failed to load data. Please try again.', 'error');
    });
}

/**
 * Fetch all required data
 * @returns {Promise<Object>} All fetched data
 */
async function fetchData() {
  // Store previous data for diff calculation
  storePreviousData(state.currentData);
  
  try {
    // Fetch all data in parallel
    const [stats, activity, trades, giftz, crafts, morphs, burns, users, cacheStats, assets] = await Promise.all([
      fetchStats(),       // Summary statistics
      fetchActivity(),    // Activity timeline data
      fetchTrades(),      // Ardor and Polygon trades
      fetchGiftzSales(),  // Giftz marketplace sales
      fetchCrafts(),      // Card crafting events
      fetchMorphs(),      // Card morphing events 
      fetchBurns(),       // Card burning events
      fetchUsers(),       // User activity data
      fetchCacheStats(),  // Cache status (for debugging)
      fetchTrackedAssets() // Tracked assets from both chains
    ]);
    
    // Store results in application state
    state.currentData = {
      statsData: stats,
      activityData: activity,
      tradesData: trades,
      giftzData: giftz,
      craftsData: crafts,
      morphsData: morphs,
      burnsData: burns,
      usersData: users,
      cacheData: cacheStats,
      assetsData: assets
    };
    
    return {
      stats,
      activity,
      trades,
      giftz,
      crafts,
      morphs,
      burns,
      users,
      cacheStats,
      assets
    };
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}

/**
 * Refresh data and update UI
 */
async function refreshData() {
  try {
    const data = await fetchData();
    updateStats(data.stats);
    renderCharts(data.activity);
    
    // Get stats about new items
    const newItemStats = renderAllCardsWithAnimation();
    
    // Update cache table if debugging is enabled
    if (document.getElementById('cache-table-container')) {
      renderCacheTable(data.cacheStats);
    }
    
    updateLastUpdatedTime();
    
    // Show notification if there are new items
    if (newItemStats.total > 0) {
      showNotification(
        'New Activity Detected', 
        `${newItemStats.total} new items: ${formatNewItemsMessage(newItemStats)}`, 
        'info'
      );
    }
  } catch (error) {
    console.error('Error refreshing data:', error);
    showNotification('Error', 'Failed to refresh data.', 'error');
  }
}

/**
 * Format message about new items
 * @param {Object} stats - New item statistics
 * @returns {string} Formatted message
 */
function formatNewItemsMessage(stats) {
  const messages = [];
  
  if (stats.ardorTrades > 0) messages.push(`${stats.ardorTrades} Ardor trades`);
  if (stats.polygonTrades > 0) messages.push(`${stats.polygonTrades} Polygon trades`);
  if (stats.giftzSales > 0) messages.push(`${stats.giftzSales} GIFTZ sales`);
  if (stats.crafts > 0) messages.push(`${stats.crafts} crafts`);
  if (stats.morphs > 0) messages.push(`${stats.morphs} morphs`);
  if (stats.burns > 0) messages.push(`${stats.burns} burns`);
  if (stats.ardorUsers > 0) messages.push(`${stats.ardorUsers} Ardor users`);
  if (stats.polygonUsers > 0) messages.push(`${stats.polygonUsers} Polygon users`);
  
  return messages.join(', ');
}

/**
 * Update stats and handle animations
 * @param {Object} data - Stats data
 */
function updateStats(data) {
  updateStatsWithAnimation(data);
  
  // Update blockchain status indicators
  if (data.ardor_connected) {
    updateStatusBadge('ardor-status', 'connected');
  } else {
    updateStatusBadge('ardor-status', 'disconnected');
  }
  
  if (data.polygon_connected) {
    updateStatusBadge('polygon-status', 'connected');
  } else {
    updateStatusBadge('polygon-status', 'disconnected');
  }
}

/**
 * Handle period change
 * @param {Event} event - Click event
 */
function handlePeriodChange(event) {
  const button = event.target;
  const period = button.getAttribute('data-period');
  
  // Update active button
  document.querySelectorAll('.period-selector').forEach(btn => {
    btn.classList.remove('active');
  });
  button.classList.add('active');
  
  // Update state and refresh data
  state.currentPeriod = period;
  refreshData();
}

/**
 * Handle sort toggle
 * @param {Event} event - Click event
 */
function handleSortToggle(event) {
  const button = event.target;
  const sortField = button.getAttribute('data-sort');
  const container = button.closest('.card-container');
  
  // Toggle sort direction
  const currentDirection = button.getAttribute('data-direction') || 'desc';
  const newDirection = currentDirection === 'desc' ? 'asc' : 'desc';
  
  button.setAttribute('data-direction', newDirection);
  button.textContent = `Sort ${newDirection === 'desc' ? '↓' : '↑'}`;
  
  // Apply sorting to the container
  // Implementation depends on the specific transaction type
}

/**
 * Handle search filter
 * @param {Event} event - Input event
 */
function handleSearch(event) {
  const input = event.target;
  const searchTerm = input.value.toLowerCase();
  const container = input.closest('.section-container').querySelector('.card-container');
  
  // Apply search filter to the container
  // Implementation depends on the specific transaction type
}

/**
 * Render all transaction cards
 * @param {Object} tradesData - Trades data
 * @param {Object} giftzData - Giftz sales data
 * @param {Object} craftsData - Crafting data
 * @param {Object} morphsData - Morphing data
 * @param {Object} burnsData - Burns data
 * @param {Object} usersData - Users data
 */
function renderTransactionCards(tradesData, giftzData, craftsData, morphsData, burnsData, usersData) {
  const newItemStats = renderAllCardsWithAnimation();
  
  // Show initial notification if items exist
  if (newItemStats.total > 0) {
    showNotification(
      'Data Loaded', 
      `Found ${newItemStats.total} items: ${formatNewItemsMessage(newItemStats)}`, 
      'info'
    );
  }
}

// Export public functions if needed
export { refreshData };
