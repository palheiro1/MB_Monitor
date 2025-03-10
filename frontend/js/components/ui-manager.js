/**
 * UI Manager Component
 * 
 * Centralizes UI operations and element access.
 */

import { getState, setState } from '../state/index.js';
import { debounce } from '../utils/helpers.js';
import { fetchAllData } from '../data-manager/index.js';

// Cache for DOM elements
const elementCache = {};

/**
 * Get a DOM element by ID with caching and error checking
 * @param {string} id - Element ID
 * @returns {HTMLElement|null} The DOM element or null if not found
 */
export function getElement(id) {
  if (!elementCache[id]) {
    elementCache[id] = document.getElementById(id);
    
    if (!elementCache[id]) {
      console.warn(`Element with id '${id}' not found`);
    }
  }
  return elementCache[id];
}

/**
 * Show the loading overlay
 */
export function showLoading() {
  const loadingOverlay = getElement('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.style.display = 'flex';
  }
  setState('isLoading', true);
}

/**
 * Hide the loading overlay
 */
export function hideLoading() {
  const loadingOverlay = getElement('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.classList.add('fade-out');
    setTimeout(() => {
      loadingOverlay.style.display = 'none';
      loadingOverlay.classList.remove('fade-out');
    }, 500);
  }
  setState('isLoading', false);
}

/**
 * Update the status badge
 * @param {string} status - Status to display (loading, success, error)
 */
export function updateStatusBadge(status) {
  const badge = getElement('status-badge');
  if (!badge) return;
  
  // Clear existing classes
  badge.className = 'badge rounded-pill me-2';
  
  // Set the appropriate class and text
  switch (status) {
    case 'loading':
      badge.classList.add('bg-warning');
      badge.innerHTML = '<i class="fas fa-sync-alt fa-spin me-1"></i> Loading';
      break;
    case 'success':
      badge.classList.add('bg-success');
      badge.innerHTML = '<i class="fas fa-check-circle me-1"></i> Live';
      break;
    case 'error':
      badge.classList.add('bg-danger');
      badge.innerHTML = '<i class="fas fa-exclamation-circle me-1"></i> Error';
      break;
    default:
      badge.classList.add('bg-secondary');
      badge.innerHTML = '<i class="fas fa-question-circle me-1"></i> Unknown';
  }
}

/**
 * Show an error message to the user
 * @param {string} message - Error message to display
 */
export function showError(message) {
  console.error(message);
  
  // Update status badge to show error
  const statusBadge = getElement('status-badge');
  if (statusBadge) {
    statusBadge.className = 'badge rounded-pill bg-danger me-2';
    statusBadge.innerHTML = '<i class="fas fa-exclamation-circle me-1"></i> Error';
  }
  
  // Try to find a toast container
  const toastContainer = document.getElementById('toast-container');
  if (toastContainer) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.innerHTML = `
      <div class="toast-header bg-danger text-white">
        <i class="fas fa-exclamation-circle me-2"></i>
        <strong class="me-auto">Error</strong>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body">
        ${message}
      </div>
    `;
    toastContainer.appendChild(toast);
    
    // Initialize and show bootstrap toast if available
    if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
      const bsToast = new bootstrap.Toast(toast);
      bsToast.show();
    }
  }
}

/**
 * Update the last update timestamp in the UI
 */
export function updateLastUpdateTimestamp() {
  const lastUpdateElement = getElement('last-update');
  if (lastUpdateElement) {
    const now = new Date();
    lastUpdateElement.textContent = now.toLocaleTimeString();
    setState('lastUpdate', now.toISOString());
  }
}

/**
 * Set up all UI elements and event listeners
 */
export function setupUI() {
  // Set up period selector buttons
  const periodButtons = document.querySelectorAll('.period-selector');
  periodButtons.forEach(button => {
    button.addEventListener('click', handlePeriodChange);
  });
  
  // Set up refresh button
  const refreshBtn = getElement('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', handleRefresh);
  }
  
  // Set up search inputs
  document.querySelectorAll('.search-input').forEach(input => {
    input.addEventListener('input', handleSearch);
  });
  
  // Set up sort buttons
  document.querySelectorAll('.sort-btn').forEach(button => {
    button.addEventListener('click', handleSort);
  });
  
  console.log('UI setup complete');
}

// Event handler functions

/**
 * Handle period change
 * @param {Event} event - Click event
 */
function handlePeriodChange(event) {
  const newPeriod = event.target.dataset.period;
  const currentPeriod = getState('currentPeriod');
  
  // If period hasn't changed, do nothing
  if (newPeriod === currentPeriod) return;
  
  console.log(`Period changed from ${currentPeriod} to ${newPeriod}`);
  
  // Update the visual state of buttons
  const periodButtons = document.querySelectorAll('.period-selector');
  periodButtons.forEach(btn => {
    btn.classList.remove('active', 'btn-primary');
    btn.classList.add('btn-outline-primary');
  });
  
  event.target.classList.remove('btn-outline-primary');
  event.target.classList.add('active', 'btn-primary');
  
  // Update application state
  setState('currentPeriod', newPeriod);
  
  // Show loading indicator
  showLoading();
  
  // Update status badge
  updateStatusBadge('loading');
  
  // Fetch new data with the selected period
  fetchAllData(true)
    .then(() => {
      updateStatusBadge('success');
      // Also dispatch a custom event for other components to react
      document.dispatchEvent(new CustomEvent('period-changed', { detail: { period: newPeriod } }));
    })
    .catch(error => {
      console.error('Error fetching data after period change:', error);
      updateStatusBadge('error');
    });
}

function handleRefresh() {
  // Implementation details
  console.log('Refresh requested');
  // Add your refresh logic here
}

function handleSearch(event) {
  // Implementation details
  console.log('Search input:', event.target.value);
  // Add your search logic here
}

function handleSort(event) {
  // Implementation details
  console.log('Sort button clicked');
  const newDirection = toggleSortDirection();
  
  // Update icon
  const icon = event.currentTarget.querySelector('i');
  if (icon) {
    icon.className = newDirection === 'desc' 
      ? 'fas fa-sort-amount-down' 
      : 'fas fa-sort-amount-up';
  }
}
