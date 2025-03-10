/**
 * Giftz Component
 * 
 * Handles rendering and management of Giftz sales cards
 */

import { getState } from '../../state/index.js';
import { formatTimeAgo, formatAddress } from '../../utils/formatters.js';

/**
 * Render Giftz sales cards
 * 
 * @param {Array} sales - Array of Giftz sale objects
 * @param {HTMLElement} container - Container to render into
 * @param {Array} newItemIds - IDs of new items to animate
 */
export function renderGiftzCards(sales, container, newItemIds = []) {
  console.log('renderGiftzCards called with:', { 
    salesCount: Array.isArray(sales) ? sales.length : 'not array', 
    container: container?.id || 'missing' 
  });
  
  // Validate parameters
  if (!container || !container.appendChild) {
    console.error('Invalid container provided to renderGiftzCards', container);
    return;
  }
  
  if (!Array.isArray(sales)) {
    console.error('Invalid sales array provided to renderGiftzCards', sales);
    container.innerHTML = `
      <div class="text-center p-4 text-muted">
        No Giftz sales found
      </div>
    `;
    return;
  }
  
  console.log(`Rendering ${sales.length} Giftz sales cards`);
  
  // Get search term if any
  const searchInput = container.closest('.tab-pane')?.querySelector('.search-input');
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  // Filter sales based on search term
  let filteredSales = sales;
  if (searchTerm) {
    filteredSales = sales.filter(sale => {
      return (sale.item_name && sale.item_name.toLowerCase().includes(searchTerm)) ||
             (sale.buyer && sale.buyer.toLowerCase().includes(searchTerm));
    });
  }
  
  // Sort sales by timestamp
  filteredSales = [...filteredSales].sort((a, b) => {
    const timeA = a.timestamp || Date.parse(a.timestampISO) / 1000;
    const timeB = b.timestamp || Date.parse(b.timestampISO) / 1000;
    return getState('sortDirection') === 'desc' ? timeB - timeA : timeA - timeB;
  });
  
  // Clear container
  container.innerHTML = '';
  
  // Show message if no sales
  if (filteredSales.length === 0) {
    container.innerHTML = `
      <div class="text-center p-4 text-muted">
        No Giftz sales found${searchTerm ? ' matching your search' : ''}
      </div>
    `;
    return;
  }
  
  // Get template
  const template = document.getElementById('giftz-card-template');
  if (!template) return;
  
  // Create a document fragment to improve performance
  const fragment = document.createDocumentFragment();
  
  // Create and append sale cards
  filteredSales.forEach(sale => {
    try {
      const card = document.importNode(template.content, true);
      
      // Set card data
      const cardNameEl = card.querySelector('.card-name');
      if (cardNameEl) {
        cardNameEl.textContent = sale.item_name || 'GIFTZ Token';
      }
      
      const buyerNameEl = card.querySelector('.buyer-name');
      if (buyerNameEl) {
        // Use complete address instead of formatted
        buyerNameEl.textContent = sale.buyer || sale.buyerId || 'Unknown';
      }
      
      const timeEl = card.querySelector('.transaction-time');
      if (timeEl) {
        const saleDate = sale.timestampISO ? new Date(sale.timestampISO) : 
                        (sale.timestamp ? new Date(sale.timestamp * 1000) : new Date());
        timeEl.textContent = formatTimeAgo(saleDate);
      }
      
      // Set quantity - replaced price with quantity
      const quantityEl = card.querySelector('.quantity');
      if (quantityEl) {
        quantityEl.textContent = (sale.quantity || 1).toLocaleString();
      }
      
      // Add animation class for new items
      const cardElement = card.querySelector('.transaction-card');
      if (cardElement && getState('animationsEnabled') && newItemIds.includes(sale.id)) {
        cardElement.classList.add('new-item-animation');
      }
      
      fragment.appendChild(card);
    } catch (error) {
      console.error('Error rendering Giftz sale card:', error, sale);
    }
  });
  
  // Append all cards at once
  container.appendChild(fragment);
}

/**
 * Find new Giftz sales by comparing previous and current data
 * @param {Array} previousSales - Previous sales data 
 * @param {Array} currentSales - Current sales data
 * @returns {Array} Array of new sale IDs
 */
export function findNewGiftzSales(previousSales, currentSales) {
  if (!Array.isArray(previousSales) || !Array.isArray(currentSales)) {
    return [];
  }
  
  // Get all previous IDs for quick lookup
  const previousIds = new Set(previousSales.map(sale => sale.id));
  
  // Find sales that weren't in the previous data
  return currentSales
    .filter(sale => sale.id && !previousIds.has(sale.id))
    .map(sale => sale.id);
}
