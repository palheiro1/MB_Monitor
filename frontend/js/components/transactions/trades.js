/**
 * Trades Component
 * 
 * Handles rendering and management of trade transactions.
 */

import { getState } from '../../state/index.js';
import { formatAddress, formatPrice, formatDateTime } from '../../utils/formatters.js';

/**
 * Render trade cards for Ardor or Polygon
 * 
 * @param {Array} trades - Array of trade objects
 * @param {HTMLElement} container - Container to render into
 * @param {Array} newItemIds - IDs of new items to animate
 */
export function renderTradeCards(trades, container, newItemIds = []) {
  if (!container) return;
  
  // Get search term if any
  const searchInput = container.closest('.tab-pane').querySelector('.search-input');
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  // Filter and sort trades
  let filteredTrades = trades;
  
  if (searchTerm) {
    filteredTrades = trades.filter(trade => {
      return (trade.card_name && trade.card_name.toLowerCase().includes(searchTerm)) ||
             (trade.buyer && trade.buyer.toLowerCase().includes(searchTerm)) ||
             (trade.seller && trade.seller.toLowerCase().includes(searchTerm));
    });
  }
  
  // Sort trades by timestamp
  filteredTrades = [...filteredTrades].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    
    return getState('sortDirection') === 'desc' ? timeB - timeA : timeA - timeB;
  });
  
  // Clear container
  container.innerHTML = '';
  
  // Show message if no trades
  if (filteredTrades.length === 0) {
    container.innerHTML = `
      <div class="text-center p-4 text-muted">
        No trades found${searchTerm ? ' matching your search' : ''}
      </div>
    `;
    return;
  }
  
  // Get template
  const template = document.getElementById('trade-card-template');
  if (!template) return;
  
  // Create and append trade cards
  filteredTrades.forEach(trade => {
    const card = document.importNode(template.content, true);
    
    // Set card data
    card.querySelector('.card-name').textContent = trade.card_name || 'Unknown Card';
    card.querySelector('.buyer-name').textContent = formatAddress(trade.buyer);
    card.querySelector('.seller-name').textContent = formatAddress(trade.seller);
    card.querySelector('.price').textContent = formatPrice(trade.price, trade.currency);
    card.querySelector('.transaction-time').textContent = formatDateTime(trade.timestamp);
    
    // Add animation class for new items
    const cardElement = card.querySelector('.transaction-card');
    if (getState('animationsEnabled') && newItemIds.includes(trade.id)) {
      cardElement.classList.add('new-item-animation');
    }
    
    // Add blockchain badge if needed
    if (trade.blockchain) {
      const badge = document.createElement('span');
      badge.className = `blockchain-badge ${trade.blockchain}`;
      badge.textContent = trade.blockchain;
      cardElement.appendChild(badge);
    }
    
    // Append card to container
    container.appendChild(card);
  });
}

/**
 * Find new trade items by comparing old and new data
 * 
 * @param {Array} previousTrades - Previous trade data
 * @param {Array} currentTrades - Current trade data 
 * @returns {Array} Array of new trade IDs
 */
export function findNewTrades(previousTrades, currentTrades) {
  if (!previousTrades || !currentTrades) return [];
  
  const previousIds = new Set(previousTrades.map(trade => trade.id));
  return currentTrades
    .filter(trade => !previousIds.has(trade.id))
    .map(trade => trade.id);
}
