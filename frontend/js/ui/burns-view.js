/**
 * Burns View Component
 * 
 * Handles rendering and interaction for the burns display.
 */

import { getState, onDataChange } from '../data-manager.js';

// Utility functions
const formatTimeAgo = (date) => {
  const diff = Math.floor((new Date() - new Date(date)) / 1000);
  if (diff < 60) return `${diff} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
};

const formatAddress = (address) => {
  if (!address || address.length < 12) return address || 'Unknown';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

/**
 * Initialize the burns view
 * @param {string} containerId - ID of the container element
 * @param {Object} options - Configuration options
 */
export function initBurnsView(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with ID ${containerId} not found`);
    return;
  }
  
  console.log(`Initializing burns view in ${containerId}`);
  
  // Listen for data updates
  onDataChange('burns-updated', (event) => {
    renderBurns(container, event.detail);
  });
  
  // Initial render
  renderBurns(container, getState('burns'));
  
  // Add search functionality
  const searchInput = container.closest('.tab-pane')?.querySelector('.search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderBurns(container, getState('burns'), { 
        searchTerm: searchInput.value.trim() 
      });
    });
  }
  
  // Add sort functionality
  const sortBtn = container.closest('.tab-pane')?.querySelector('.sort-btn');
  if (sortBtn) {
    sortBtn.addEventListener('click', () => {
      const icon = sortBtn.querySelector('i');
      const isDescending = icon.classList.contains('fa-sort-amount-down');
      
      // Toggle sort direction
      if (isDescending) {
        icon.classList.replace('fa-sort-amount-down', 'fa-sort-amount-up');
      } else {
        icon.classList.replace('fa-sort-amount-up', 'fa-sort-amount-down');
      }
      
      renderBurns(container, getState('burns'), { 
        sortDescending: !isDescending 
      });
    });
  }
}

/**
 * Render burns into the container
 * @param {HTMLElement} container - Container element
 * @param {Object} burnsData - Burns data object
 * @param {Object} options - Rendering options
 */
export function renderBurns(container, burnsData, options = {}) {
  if (!container) return;
  
  const burns = burnsData?.burns || [];
  
  // Default options
  const { searchTerm = '', sortDescending = true } = options;
  
  // First show loading or error message if needed
  if (!burns || burns.length === 0) {
    container.innerHTML = `
      <div class="text-center p-4">
        <p class="text-muted">No card burns found</p>
      </div>
    `;
    // Still show the count in the stats counter
    updateBurnsCount(0);
    return;
  }
  
  let filteredBurns = [...burns];
  
  // Apply search filter if specified
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filteredBurns = filteredBurns.filter(burn => 
      (burn.cardName && burn.cardName.toLowerCase().includes(term)) ||
      (burn.assetName && burn.assetName.toLowerCase().includes(term)) ||
      (burn.senderRS && burn.senderRS.toLowerCase().includes(term))
    );
  }
  
  // Sort burns
  filteredBurns = filteredBurns.sort((a, b) => {
    // Get timestamps, handling different formats
    const timeA = typeof a.timestamp === 'number' ? 
      (a.timestamp < 1e10 ? a.timestamp * 1000 : a.timestamp) : // Convert Ardor seconds to ms
      new Date(a.date || a.timestamp).getTime();
    
    const timeB = typeof b.timestamp === 'number' ? 
      (b.timestamp < 1e10 ? b.timestamp * 1000 : b.timestamp) :
      new Date(b.date || b.timestamp).getTime();
    
    return sortDescending ? timeB - timeA : timeA - timeB;
  });
  
  // Generate HTML for each burn
  const burnsHTML = filteredBurns.map(burn => {
    // Format the timestamp
    const timestamp = typeof burn.timestamp === 'number' 
      ? (burn.timestamp < 1e10 ? new Date(burn.timestamp * 1000) : new Date(burn.timestamp))
      : new Date(burn.date || burn.timestamp);
    
    const timeAgo = formatTimeAgo(timestamp);
    const quantity = burn.quantityQNT || burn.quantityFormatted || '1';
    
    return `
      <div class="transaction-card burn-card" data-id="${burn.id || burn.fullHash || ''}">
        <div class="transaction-header">
          <div class="card-badge"><i class="fas fa-fire"></i> Burn</div>
          <div class="transaction-time">${timeAgo}</div>
        </div>
        <div class="transaction-body">
          <div class="card-name">${burn.cardName || burn.assetName || 'Unknown Card'}</div>
          <div class="transaction-details">
            <div class="transaction-users">
              <span class="burner">
                <i class="fas fa-user-ninja"></i> 
                <span class="burner-name">${formatAddress(burn.senderRS || burn.sender)}</span>
              </span>
            </div>
            <div class="burn-amount">
              <i class="fas fa-flame"></i> <span class="amount">${quantity}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  // Update the container
  container.innerHTML = filteredBurns.length > 0 
    ? burnsHTML 
    : `<div class="text-center p-4"><p class="text-muted">No burns match your search</p></div>`;
  
  // Calculate total cards burned (sum of quantities)
  const totalCardsBurned = filteredBurns.reduce((total, burn) => {
    const quantity = parseInt(burn.quantityQNT || burn.quantityFormatted || '1', 10);
    return total + quantity;
  }, 0);
  
  // Update the burns counter
  updateBurnsCount(totalCardsBurned);
}

/**
 * Update the burns counter in the UI
 * @param {number} count - Number of cards burned
 */
function updateBurnsCount(count) {
  const counterEl = document.getElementById('card-burns');
  if (!counterEl) return;
  
  counterEl.textContent = count.toLocaleString();
  counterEl.title = `${count} total cards burned`;
}
