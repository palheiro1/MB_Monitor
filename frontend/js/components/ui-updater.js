/**
 * UI Updater
 * 
 * Handles automatic UI updates based on data changes
 */

import { getState, setState } from '../state/index.js';
import { updateStats } from './statistics.js';
import { renderAllCards } from './transactions/index.js';
import { fetchAllData } from '../data-manager/index.js';
import { hideLoading, showLoading, updateLastUpdateTimestamp, updateStatusBadge } from './ui-manager.js';

/**
 * Initialize the UI updater
 * Sets up event listeners for data changes
 */
export function initUIUpdater() {
  console.log('Initializing UI updater...');
  
  // Listen for period change events
  document.addEventListener('period-changed', handlePeriodChanged);
  
  // Listen for refresh button clicks
  document.addEventListener('refresh-requested', handleRefreshRequested);
  
  // Listen for search changes
  document.addEventListener('search-changed', handleSearchChanged);
  
  // Listen for sort changes
  document.addEventListener('sort-changed', handleSortChanged);
  
  console.log('UI updater initialized');
}

/**
 * Handle period change event
 * @param {CustomEvent} event - The period change event
 */
function handlePeriodChanged(event) {
  const period = event.detail.period;
  console.log(`UI Updater: Period changed to ${period}`);
  
  // Update all UI components that might need period-specific updates
  const data = getState('currentData');
  if (data) {
    updateUI(data);
  }
  
  // You could also add code here to update charts or other visualizations
  // that need to reflect the new time period
  if (typeof updateCharts === 'function') {
    updateCharts(period);
  }
}

/**
 * Handle refresh button click
 */
function handleRefreshRequested() {
  console.log('Refresh requested');
  
  // Show loading indicator
  showLoading();
  
  // Update status
  updateStatusBadge('loading');
  
  // Fetch fresh data
  fetchAllData(true)
    .then(() => {
      updateStatusBadge('success');
    })
    .catch(() => {
      updateStatusBadge('error');
    });
}

/**
 * Handle search input change
 * @param {CustomEvent} event - The search change event
 */
function handleSearchChanged(event) {
  const query = event.detail.query;
  console.log(`Search query changed: "${query}"`);
  
  // Update state
  setState('searchQuery', query);
  
  // Re-render cards with current data and search filter
  renderAllCards();
}

/**
 * Handle sort direction change
 * @param {CustomEvent} event - The sort change event
 */
function handleSortChanged(event) {
  const direction = event.detail.direction;
  console.log(`Sort direction changed to: ${direction}`);
  
  // Re-render cards with new sort
  renderAllCards();
}

/**
 * Update all UI components with new data
 * @param {Object} data - The data to display
 */
export function updateUI(data) {
  updateStats(data);
  renderAllCards();
  updateLastUpdateTimestamp();
}
