/**
 * Trades View Component
 * 
 * Handles rendering and interaction for the trades display.
 */

import { getState, onDataChange } from '../data-manager.js';

// Utility functions
const formatTimeAgo = (date) => {
  // Simplified - in real use we'd use a proper function
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
 * Initialize the trades view
 * @param {string} containerId - ID of the container element
 * @param {Object} options - Configuration options
 */
export function initTradesView(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with ID ${containerId} not found`);
    return;
  }
  
  console.log(`Initializing trades view in ${containerId}`);
  
  // Listen for data updates
  onDataChange('trades-updated', (event) => {
    renderTrades(container, event.detail);
  });
  
  // Initial render
  renderTrades(container, getState('trades'));
  
  // Add search functionality
  const searchInput = container.closest('.tab-pane')?.querySelector('.search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderTrades(container, getState('trades'), { 
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
      
      renderTrades(container, getState('trades'), { 
        sortDescending: !isDescending 
      });
    });
  }
}

/**
 * Render trades into the container
 * @param {HTMLElement} container - Container element
 * @param {Object} tradesData - Trades data object
 * @param {Object} options - Rendering options
 */
export function renderTrades(container, tradesData, options = {}) {
  if (!container) return;
  
  const trades = tradesData?.ardor_trades || [];
  
  // Default options
  const { searchTerm = '', sortDescending = true } = options;
  
  // First show loading or error message if needed
  if (!trades || trades.length === 0) {
    container.innerHTML = `
      <div class="text-center p-4">
        <p class="text-muted">No trades found</p>
      </div>
    `;
    // Still show the count in the stats counter
    updateTradeCount(tradesData?.count || 0);
    return;
  }
  
  let filteredTrades = [...trades];
  
  // Apply search filter if specified
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filteredTrades = filteredTrades.filter(trade => 
      (trade.card_name && trade.card_name.toLowerCase().includes(term)) ||
      (trade.buyer && trade.buyer.toLowerCase().includes(term)) ||
      (trade.seller && trade.seller.toLowerCase().includes(term))
    );
  }
  
  // Sort trades
  filteredTrades = filteredTrades.sort((a, b) => {
    // Get timestamps, handling different formats
    const timeA = typeof a.timestamp === 'number' ? 
      (a.timestamp < 1e10 ? a.timestamp * 1000 : a.timestamp) : // Convert Ardor seconds to ms
      new Date(a.timestampISO || a.timestamp).getTime();
    
    const timeB = typeof b.timestamp === 'number' ? 
      (b.timestamp < 1e10 ? b.timestamp * 1000 : b.timestamp) :
      new Date(b.timestampISO || b.timestamp).getTime();
    
    return sortDescending ? timeB - timeA : timeA - timeB;
  });
  
  // Generate HTML for each trade
  const tradesHTML = filteredTrades.map(trade => {
    // Format the timestamp
    const timestamp = typeof trade.timestamp === 'number' 
      ? (trade.timestamp < 1e10 ? new Date(trade.timestamp * 1000) : new Date(trade.timestamp))
      : new Date(trade.timestampISO || trade.timestamp);
    
    const timeAgo = formatTimeAgo(timestamp);
    
    return `
      <div class="transaction-card trade-card" data-id="${trade.id || trade.fullHash || ''}">
        <div class="transaction-header">
          <div class="card-badge"><i class="fas fa-exchange-alt"></i> Trade</div>
          <div class="transaction-time">${timeAgo}</div>
        </div>
        <div class="transaction-body">
          <div class="card-name">${trade.card_name || 'Unknown Card'}</div>
          <div class="transaction-details">
            <div class="transaction-users">
              <span class="buyer">
                <i class="fas fa-shopping-cart"></i> 
                <span class="buyer-name">${formatAddress(trade.buyer)}</span>
              </span>
              <i class="fas fa-long-arrow-alt-left transaction-arrow"></i>
              <span class="seller">
                <i class="fas fa-store"></i> 
                <span class="seller-name">${formatAddress(trade.seller)}</span>
              </span>
            </div>
            <div class="price-tag">
              <i class="fas fa-tag"></i> 
              <span class="price">${trade.price || 0} ${trade.currency || 'IGNIS'}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  // Update the container
  container.innerHTML = filteredTrades.length > 0 
    ? tradesHTML 
    : `<div class="text-center p-4"><p class="text-muted">No trades match your search</p></div>`;
  
  // Update the trade counter
  updateTradeCount(tradesData?.count || trades.length, filteredTrades.length);
}

/**
 * Update the trade counter in the UI
 * @param {number} totalCount - Total number of trades
 * @param {number} filteredCount - Number of trades after filtering
 */
function updateTradeCount(totalCount, filteredCount) {
  const counterEl = document.getElementById('total-trades');
  if (!counterEl) return;
  
  if (filteredCount !== undefined && filteredCount !== totalCount) {
    counterEl.textContent = `${filteredCount}/${totalCount}`;
    counterEl.title = `Showing ${filteredCount} of ${totalCount} total trades`;
  } else {
    counterEl.textContent = totalCount.toLocaleString();
    counterEl.title = `${totalCount} total trades`;
  }
}
