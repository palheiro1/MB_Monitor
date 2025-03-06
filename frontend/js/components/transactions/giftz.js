/**
 * Giftz Component
 * 
 * Handles rendering and management of giftz sales transactions.
 */

import { getState } from '../../state/index.js';
import { formatAddress, formatPrice, formatDateTime } from '../../utils/formatters.js';

/**
 * Render giftz sales cards
 * 
 * @param {Array} sales - Array of giftz sale objects
 * @param {HTMLElement} container - Container to render into
 * @param {Array} newItemIds - IDs of new items to animate
 */
export function renderGiftzCards(sales, container, newItemIds = []) {
  if (!container) return;
  
  // Get search term if any
  const searchInput = container.closest('.tab-pane').querySelector('.search-input');
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  // Filter sales based on search term
  let filteredSales = sales;
  
  if (searchTerm) {
    filteredSales = sales.filter(sale => {
      return (sale.item_name && sale.item_name.toLowerCase().includes(searchTerm)) ||
             (sale.buyer && sale.buyer.toLowerCase().includes(searchTerm)) ||
             (sale.type && sale.type.toLowerCase().includes(searchTerm));
    });
  }
  
  // Sort sales by timestamp
  filteredSales = [...filteredSales].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return getState('sortDirection') === 'desc' ? timeB - timeA : timeA - timeB;
  });
  
  // Clear container
  container.innerHTML = '';
  
  // Show message if no sales
  if (filteredSales.length === 0) {
    container.innerHTML = `
      <div class="text-center p-4 text-muted">
        No giftz sales found${searchTerm ? ' matching your search' : ''}
      </div>
    `;
    return;
  }
  
  // Get template
  const template = document.getElementById('giftz-card-template');
  if (!template) return;
  
  // Create and append giftz cards
  filteredSales.forEach(sale => {
    const card = document.importNode(template.content, true);
    
    // Set card data
    card.querySelector('.card-name').textContent = sale.item_name || 'Unknown Item';
    card.querySelector('.buyer-name').textContent = formatAddress(sale.buyer);
    card.querySelector('.price').textContent = formatPrice(sale.price, sale.currency);
    card.querySelector('.transaction-time').textContent = formatDateTime(sale.timestamp);
    
    // Add animation class for new items
    const cardElement = card.querySelector('.transaction-card');
    if (getState('animationsEnabled') && newItemIds.includes(sale.id)) {
      cardElement.classList.add('new-item-animation');
    }
    
    // Append card to container
    container.appendChild(card);
  });
}

/**
 * Find new giftz sales by comparing old and new data
 * 
 * @param {Array} previousSales - Previous giftz sales data
 * @param {Array} currentSales - Current giftz sales data 
 * @returns {Array} Array of new giftz sale IDs
 */
export function findNewGiftzSales(previousSales, currentSales) {
  if (!previousSales || !currentSales) return [];
  
  const previousIds = new Set(previousSales.map(sale => sale.id));
  return currentSales
    .filter(sale => !previousIds.has(sale.id))
    .map(sale => sale.id);
}
