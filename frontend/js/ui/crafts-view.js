/**
 * Crafts View Component
 * 
 * Handles rendering and interaction for the crafts display.
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
 * Initialize the crafts view
 * @param {string} containerId - ID of the container element
 * @param {Object} options - Configuration options
 */
export function initCraftsView(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with ID ${containerId} not found`);
    return;
  }
  
  console.log(`Initializing crafts view in ${containerId}`);
  
  // Listen for data updates
  onDataChange('crafts-updated', (event) => {
    renderCrafts(container, event.detail);
  });
  
  // Initial render
  renderCrafts(container, getState('crafts'));
  
  // Add search functionality
  const searchInput = container.closest('.tab-pane')?.querySelector('.search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderCrafts(container, getState('crafts'), { 
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
      
      renderCrafts(container, getState('crafts'), { 
        sortDescending: !isDescending 
      });
    });
  }
}

/**
 * Render crafts into the container
 * @param {HTMLElement} container - Container element
 * @param {Object} craftsData - Crafts data object
 * @param {Object} options - Rendering options
 */
export function renderCrafts(container, craftsData, options = {}) {
  if (!container) return;
  
  const crafts = craftsData?.craftings || [];
  
  // Default options
  const { searchTerm = '', sortDescending = true } = options;
  
  // First show loading or error message if needed
  if (!crafts || crafts.length === 0) {
    container.innerHTML = `
      <div class="text-center p-4">
        <p class="text-muted">No crafting operations found</p>
      </div>
    `;
    // Still show the count in the stats counter
    updateCraftsCount(0);
    return;
  }
  
  let filteredCrafts = [...crafts];
  
  // Apply search filter if specified
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filteredCrafts = filteredCrafts.filter(craft => 
      (craft.cardName && craft.cardName.toLowerCase().includes(term)) ||
      (craft.assetName && craft.assetName.toLowerCase().includes(term)) ||
      (craft.recipient && craft.recipient.toLowerCase().includes(term))
    );
  }
  
  // Sort crafts
  filteredCrafts = filteredCrafts.sort((a, b) => {
    // Get timestamps, handling different formats
    const timeA = typeof a.timestamp === 'number' ? 
      (a.timestamp < 1e10 ? a.timestamp * 1000 : a.timestamp) : // Convert Ardor seconds to ms
      new Date(a.date || a.timestamp).getTime();
    
    const timeB = typeof b.timestamp === 'number' ? 
      (b.timestamp < 1e10 ? b.timestamp * 1000 : b.timestamp) :
      new Date(b.date || b.timestamp).getTime();
    
    return sortDescending ? timeB - timeA : timeA - timeB;
  });
  
  // Generate HTML for each craft
  const craftsHTML = filteredCrafts.map(craft => {
    // Format the timestamp
    const timestamp = typeof craft.timestamp === 'number' 
      ? (craft.timestamp < 1e10 ? new Date(craft.timestamp * 1000) : new Date(craft.timestamp))
      : new Date(craft.date || craft.timestampISO || craft.timestamp);
    
    const timeAgo = formatTimeAgo(timestamp);
    const cardsUsed = craft.cardsUsed || craft.details?.cardsUsed || 1;
    
    return `
      <div class="transaction-card craft-card" data-id="${craft.id || craft.fullHash || ''}">
        <div class="transaction-header">
          <div class="card-badge"><i class="fas fa-hammer"></i> Craft</div>
          <div class="transaction-time">${timeAgo}</div>
        </div>
        <div class="transaction-body">
          <div class="card-name">${craft.cardName || craft.assetName || 'Unknown Card'}</div>
          <div class="transaction-details">
            <div class="transaction-users">
              <span class="crafter">
                <i class="fas fa-user-cog"></i> 
                <span class="crafter-name">${formatAddress(craft.recipient || 'Unknown')}</span>
              </span>
            </div>
            <div class="crafted-item">
              <i class="fas fa-magic"></i> 
              <span class="craft-result">${cardsUsed} card${cardsUsed !== 1 ? 's' : ''} used</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  // Update the container
  container.innerHTML = filteredCrafts.length > 0 
    ? craftsHTML 
    : `<div class="text-center p-4"><p class="text-muted">No crafting operations match your search</p></div>`;
  
  // Update the crafts counter
  updateCraftsCount(craftsData?.count || crafts.length);
}

/**
 * Update the crafts counter in the UI
 * @param {number} count - Number of craft operations
 */
function updateCraftsCount(count) {
  const counterEl = document.getElementById('card-crafts');
  if (!counterEl) return;
  
  counterEl.textContent = count.toLocaleString();
  counterEl.title = `${count} total crafting operations`;
}
