/**
 * UI Manager Component
 * 
 * Centralizes UI operations and element access.
 */

import { getState, setState, toggleSortDirection } from '../state/index.js';
import { debounce } from '../utils/helpers.js';

// Cache for DOM elements
const elementCache = {};

/**
 * Get a DOM element by ID with caching
 * @param {string} id - Element ID
 * @returns {HTMLElement|null} The DOM element or null if not found
 */
export function getElement(id) {
  if (!elementCache[id]) {
    elementCache[id] = document.getElementById(id);
  }
  return elementCache[id];
}

/**
 * Show the loading overlay
 */
export function showLoading() {
  const overlay = getElement('loading-overlay');
  if (overlay) overlay.style.display = 'flex';
  setState('isLoading', true);
}

/**
 * Hide the loading overlay
 */
export function hideLoading() {
  const overlay = getElement('loading-overlay');
  if (overlay) overlay.style.display = 'none';
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
 * Update the last update time display
 */
export function updateLastUpdateTime() {
  const timeElement = getElement('last-update');
  if (!timeElement) return;
  
  const now = new Date();
  const formattedTime = now.toLocaleTimeString();
  const formattedDate = now.toLocaleDateString();
  
  timeElement.textContent = `${formattedDate} ${formattedTime}`;
  setState('lastUpdate', now.toISOString());
}

/**
 * Set up event handlers for user interface elements
 */
export function setupUI() {
  // Set up period selectors
  const periodSelectors = document.querySelectorAll('.period-selector');
  periodSelectors.forEach(selector => {
    selector.addEventListener('click', function() {
      // Update UI
      periodSelectors.forEach(s => {
        s.classList.remove('active', 'btn-primary');
        s.classList.add('btn-outline-primary');
      });
      this.classList.remove('btn-outline-primary');
      this.classList.add('active', 'btn-primary');
      
      // Update state
      const period = this.dataset.period;
      setState('currentPeriod', period);
      
      // Trigger data refresh
      document.dispatchEvent(new CustomEvent('period-changed', {
        detail: { period }
      }));
    });
  });
  
  // Set up refresh button
  const refreshBtn = getElement('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function() {
      document.dispatchEvent(new CustomEvent('refresh-requested'));
    });
  }
  
  // Set up sorting buttons
  const sortButtons = document.querySelectorAll('.sort-btn');
  sortButtons.forEach(button => {
    button.addEventListener('click', function() {
      const newDirection = toggleSortDirection();
      
      // Update icon
      const icon = this.querySelector('i');
      if (icon) {
        icon.className = newDirection === 'desc' 
          ? 'fas fa-sort-amount-down' 
          : 'fas fa-sort-amount-up';
      }
      
      // Trigger re-render
      document.dispatchEvent(new CustomEvent('sort-changed', {
        detail: { direction: newDirection }
      }));
    });
  });
  
  // Set up search inputs
  const searchInputs = document.querySelectorAll('.search-input');
  searchInputs.forEach(input => {
    input.addEventListener('input', debounce(function() {
      document.dispatchEvent(new CustomEvent('search-changed', {
        detail: { query: this.value.trim() }
      }));
    }, 300));
  });
}
