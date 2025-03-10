/**
 * Trades Component
 * 
 * Handles rendering and management of trade cards
 */

import { getState } from '../../state/index.js';
import { formatTimeAgo, formatDate, formatAddress } from '../../utils/formatters.js';

/**
 * Render trade cards
 * 
 * @param {Array} trades - Array of trade objects
 * @param {HTMLElement} container - Container to render into
 * @param {Array} newItemIds - IDs of new items to animate
 */
export function renderTradeCards(trades, container, newItemIds = []) {
  console.log('renderTradeCards called with:', { 
    tradesCount: Array.isArray(trades) ? trades.length : 'not array', 
    container: container?.id || 'missing' 
  });
  
  // Validate parameters
  if (!container || !container.appendChild) {
    console.error('Invalid container provided to renderTradeCards', container);
    return;
  }
  
  if (!Array.isArray(trades)) {
    console.error('Invalid trades array provided to renderTradeCards', trades);
    container.innerHTML = `
      <div class="text-center p-4 text-muted">
        No trades found
      </div>
    `;
    return;
  }
  
  console.log(`Rendering ${trades.length} trade cards`);
  
  // Get search term if any
  const searchInput = container.closest('.tab-pane')?.querySelector('.search-input');
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  // Filter trades based on search term
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
    const timeA = a.timestamp || Date.parse(a.timestampISO) / 1000;
    const timeB = b.timestamp || Date.parse(b.timestampISO) / 1000;
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
  
  // Create a document fragment to improve performance
  const fragment = document.createDocumentFragment();
  
  // Create and append trade cards
  filteredTrades.forEach(trade => {
    try {
      const card = document.importNode(template.content, true);
      
      const buyerNameEl = card.querySelector('.buyer-name');
      if (buyerNameEl) {
        // Use full address instead of formatted/shortened
        buyerNameEl.textContent = trade.buyer || 'Unknown';
      }
      
      const sellerNameEl = card.querySelector('.seller-name');
      if (sellerNameEl) {
        // Use full address instead of formatted/shortened
        sellerNameEl.textContent = trade.seller || 'Unknown';
      }
      
      // Format timestamp and date
      const tradeDate = new Date(trade.timestampISO || trade.timestamp * 1000);
      
      const transactionTimeEl = card.querySelector('.transaction-time');
      if (transactionTimeEl) {
        transactionTimeEl.textContent = formatTimeAgo(tradeDate);
      }
      
      // Format the date in a more readable way
      const formattedDateEl = card.querySelector('.formatted-date');
      if (formattedDateEl) {
        formattedDateEl.textContent = formatDate(tradeDate);
      }
      
      // Set price - extract from raw_data.priceNQTPerShare and divide by 100,000,000
      let priceValue = 0;
      if (trade.raw_data && trade.raw_data.priceNQTPerShare) {
        // Convert NQT price to IGNIS (divide by 100,000,000)
        priceValue = parseInt(trade.raw_data.priceNQTPerShare) / 100000000;
      } else if (trade.price) {
        priceValue = trade.price;
      }
      
      const priceEl = card.querySelector('.price');
      if (priceEl) {
        priceEl.textContent = priceValue.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        });
      }
      
      // Set quantity
      const quantityValue = trade.quantity || 
                           (trade.raw_data && trade.raw_data.quantityQNT) || 1;
      
      const quantityEl = card.querySelector('.quantity');
      if (quantityEl) {
        quantityEl.textContent = quantityValue.toLocaleString();
      }
      
      // Add animation class for new items
      const cardElement = card.querySelector('.transaction-card');
      if (cardElement && getState('animationsEnabled') && newItemIds.includes(trade.id)) {
        cardElement.classList.add('new-item-animation');
      }
      
      fragment.appendChild(card);
    } catch (error) {
      console.error('Error rendering trade card:', error, trade);
    }
  });
  
  // Append all cards at once
  container.appendChild(fragment);
}

/**
 * Find new trades by comparing previous and current data
 * @param {Array} previousTrades - Previous trades data 
 * @param {Array} currentTrades - Current trades data
 * @returns {Array} Array of new trade IDs
 */
export function findNewTrades(previousTrades, currentTrades) {
  if (!Array.isArray(previousTrades) || !Array.isArray(currentTrades)) {
    return [];
  }
  
  // Get all previous IDs for quick lookup
  const previousIds = new Set(previousTrades.map(trade => trade.id));
  
  // Find trades that weren't in the previous data
  return currentTrades
    .filter(trade => trade.id && !previousIds.has(trade.id))
    .map(trade => trade.id);
}
