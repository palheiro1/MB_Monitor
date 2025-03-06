/**
 * UI Manager
 * 
 * Responsible for UI interactions, DOM element access, and general UI state.
 * Centralizes DOM manipulation and event handling.
 */

import { getState, setState, toggleSortDirection } from '../state/index.js';
import { fetchInitialData } from '../api/data-fetcher.js';
import { renderAllCards } from './cards.js';
import { debounce } from '../utils/helpers.js';

// DOM element cache
const elements = initElements();

/**
 * Initialize DOM element references
 * @returns {Object} Object containing all DOM element references
 */
function initElements() {
  return {
    statusBadge: document.getElementById('status-badge'),
    refreshBtn: document.getElementById('refresh-btn'),
    refreshCacheBtn: document.getElementById('refresh-cache-stats'),
    periodSelectors: document.querySelectorAll('.period-selector'),
    lastUpdateSpan: document.getElementById('last-update'),
    loadingOverlay: document.getElementById('loading-overlay'),
    
    // Charts
    activityChart: document.getElementById('activity-chart'),
    networkChart: document.getElementById('network-chart'),
    
    // Stats elements
    totalTrades: document.getElementById('total-trades'),
    activeUsers: document.getElementById('active-users'),
    cardCrafts: document.getElementById('card-crafts'),
    cardBurns: document.getElementById('card-burns'),
    giftzSales: document.getElementById('giftz-sales'),
    cardMorphs: document.getElementById('card-morphs'),
    
    // Tab content containers
    ardorTradesCards: document.getElementById('ardor-trades-cards'),
    polygonTradesCards: document.getElementById('polygon-trades-cards'),
    giftzCards: document.getElementById('giftz-cards'),
    craftsCards: document.getElementById('crafts-cards'),
    morphsCards: document.getElementById('morphs-cards'),
    burnsCards: document.getElementById('burns-cards'),
    usersCards: document.getElementById('users-cards'),
    
    // Cache stats table
    cacheStatsTable: document.getElementById('cache-stats-table')?.querySelector('tbody'),
    
    // Modal triggers
    aboutLink: document.getElementById('about-link'),
    apiDocsLink: document.getElementById('api-docs-link'),
    
    // Search & Sort elements
    sortButtons: document.querySelectorAll('.sort-btn'),
    searchInputs: document.querySelectorAll('.search-input')
  };
}

/**
 * Set up the UI components
 */
export function setupUI() {
  addAnimationToggle();
  setPeriod(getState('currentPeriod'));
}

/**
 * Set up event listeners
 */
export function setupEventListeners() {
  // Period selector buttons
  elements.periodSelectors.forEach(selector => {
    selector.addEventListener('click', () => {
      const period = selector.getAttribute('data-period');
      if (period !== getState('currentPeriod')) {
        setPeriod(period);
        fetchInitialData(true);
      }
    });
  });
  
  // Manual refresh button
  elements.refreshBtn?.addEventListener('click', () => {
    fetchInitialData(true);
  });
  
  // Cache stats refresh button
  elements.refreshCacheBtn?.addEventListener('click', () => {
    import('../api/data-fetcher.js').then(module => {
      module.fetchCacheStats();
    });
  });
  
  // About modal trigger
  elements.aboutLink?.addEventListener('click', (e) => {
    e.preventDefault();
    const aboutModal = new bootstrap.Modal(document.getElementById('about-modal'));
    aboutModal.show();
  });
  
  // API docs modal trigger
  elements.apiDocsLink?.addEventListener('click', (e) => {
    e.preventDefault();
    const apiDocsModal = new bootstrap.Modal(document.getElementById('api-docs-modal'));
    apiDocsModal.show();
  });
  
  // Sort buttons
  elements.sortButtons.forEach(button => {
    button.addEventListener('click', () => {
      const newDirection = toggleSortDirection();
      
      // Update button icon
      const icon = button.querySelector('i');
      icon.className = newDirection === 'desc' 
        ? 'fas fa-sort-amount-down' 
        : 'fas fa-sort-amount-up';
      
      // Re-render cards with new sort
      renderAllCards();
    });
  });
  
  // Search inputs with debounce
  elements.searchInputs.forEach(input => {
    input.addEventListener('input', debounce(() => {
      renderAllCards();
    }, 300));
  });
}

/**
 * Add animation toggle to debug panel
 */
function addAnimationToggle() {
  const cacheHeader = document.querySelector('.card-header:has(#refresh-cache-stats)');
  if (!cacheHeader) return;
  
  // Check if toggle already exists
  if (document.getElementById('animation-toggle')) return;
  
  const animToggle = document.createElement('div');
  animToggle.className = 'form-check form-switch ms-3 d-inline-block';
  animToggle.innerHTML = `
    <input class="form-check-input" type="checkbox" id="animation-toggle" ${getState('animationsEnabled') ? 'checked' : ''}>
    <label class="form-check-label text-white small" for="animation-toggle">Animations</label>
  `;
  cacheHeader.appendChild(animToggle);
  
  document.getElementById('animation-toggle').addEventListener('change', (e) => {
    setState('animationsEnabled', e.target.checked);
  });
}

/**
 * Set active period and update UI
 * @param {string} period - Period to set active
 */
export function setPeriod(period) {
  setState('currentPeriod', period);
  
  // Update UI to reflect the selected period
  elements.periodSelectors.forEach(selector => {
    const selectorPeriod = selector.getAttribute('data-period');
    if (selectorPeriod === period) {
      selector.classList.remove('btn-outline-primary');
      selector.classList.add('btn-primary', 'active');
    } else {
      selector.classList.remove('btn-primary', 'active');
      selector.classList.add('btn-outline-primary');
    }
  });
}

/**
 * Update the status badge
 * @param {string} status - Status to show (loading, success, error)
 */
export function updateStatusBadge(status) {
  if (!elements.statusBadge) return;
  
  switch (status) {
    case 'loading':
      elements.statusBadge.className = 'badge rounded-pill bg-warning me-2';
      elements.statusBadge.innerHTML = '<i class="fas fa-sync-alt fa-spin me-1"></i> Loading';
      break;
    
    case 'success':
      elements.statusBadge.className = 'badge rounded-pill bg-success me-2';
      elements.statusBadge.innerHTML = '<i class="fas fa-check-circle me-1"></i> Updated';
      
      // Reset to "Live" after 3 seconds
      setTimeout(() => {
        if (elements.statusBadge) {
          elements.statusBadge.innerHTML = '<i class="fas fa-check-circle me-1"></i> Live';
        }
      }, 3000);
      break;
    
    case 'error':
      elements.statusBadge.className = 'badge rounded-pill bg-danger me-2';
      elements.statusBadge.innerHTML = '<i class="fas fa-exclamation-circle me-1"></i> Error';
      break;
  }
}

/**
 * Update the last updated timestamp
 */
export function updateLastUpdateTime() {
  if (!elements.lastUpdateSpan) return;
  
  const now = new Date();
  setState('lastUpdate', now);
  
  import('../utils/formatters.js').then(module => {
    elements.lastUpdateSpan.textContent = module.formatDateTime(now);
  });
}

/**
 * Show loading overlay
 */
export function showLoading() {
  setState('isLoading', true);
  if (elements.loadingOverlay) {
    elements.loadingOverlay.classList.add('active');
  }
}

/**
 * Hide loading overlay
 */
export function hideLoading() {
  setState('isLoading', false);
  if (elements.loadingOverlay) {
    elements.loadingOverlay.classList.remove('active');
  }
}

/**
 * Get a DOM element by reference name
 * @param {string} name - Element reference name
 * @returns {HTMLElement|null} DOM element or null if not found
 */
export function getElement(name) {
  return elements[name] || null;
}

/**
 * Get all DOM elements
 * @returns {Object} Object containing all DOM elements
 */
export function getAllElements() {
  return elements;
}
