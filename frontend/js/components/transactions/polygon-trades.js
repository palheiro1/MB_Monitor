/**
 * Polygon Trades Component
 * 
 * Handles rendering and management of Polygon blockchain trades and transfers.
 */

import { getState } from '../../state/index.js';
import { formatAddress, formatPrice, formatDateTime } from '../../utils/formatters.js';

/**
 * Render Polygon trade/transfer cards
 * 
 * @param {Array} transfers - Array of Polygon transfer objects
 * @param {HTMLElement} container - Container to render into
 * @param {Array} newItemIds - IDs of new items to animate
 */
export function renderPolygonTradeCards(transfers, container, newItemIds = []) {
  if (!container) return;
  
  // Get search term if any
  const searchInput = container.closest('.tab-pane').querySelector('.search-input');
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  // Filter and sort transfers
  let filteredTransfers = transfers;
  
  if (searchTerm) {
    filteredTransfers = transfers.filter(transfer => {
      return (transfer.card_name && transfer.card_name.toLowerCase().includes(searchTerm)) ||
             (transfer.buyer && transfer.buyer.toLowerCase().includes(searchTerm)) ||
             (transfer.seller && transfer.seller.toLowerCase().includes(searchTerm)) ||
             (transfer.tokenId && transfer.tokenId.toString().includes(searchTerm));
    });
  }
  
  // Sort transfers by timestamp
  filteredTransfers = [...filteredTransfers].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    
    return getState('sortDirection') === 'desc' ? timeB - timeA : timeA - timeB;
  });
  
  // Clear container
  container.innerHTML = '';
  
  // Show message if no transfers
  if (filteredTransfers.length === 0) {
    container.innerHTML = `
      <div class="text-center p-4 text-muted">
        No Polygon transfers found${searchTerm ? ' matching your search' : ''}
      </div>
    `;
    return;
  }
  
  // Get template
  const template = document.getElementById('polygon-trade-card-template') || 
                   document.getElementById('trade-card-template'); // Fallback to generic template
  if (!template) return;
  
  // Create and append trade cards
  filteredTransfers.forEach(transfer => {
    const card = document.importNode(template.content, true);
    
    // Set card data
    card.querySelector('.card-name').textContent = transfer.card_name || `Token #${transfer.tokenId || 'Unknown'}`;
    
    // Handle seller/buyer display (which could be mint/burn addresses)
    const seller = transfer.seller || transfer.from || 'Unknown';
    const buyer = transfer.buyer || transfer.to || 'Unknown';
    
    // Special handling for mint/burn addresses
    const isNullAddress = address => address === '0x0000000000000000000000000000000000000000';
    
    if (isNullAddress(seller)) {
      card.querySelector('.seller-name').textContent = 'Minted';
      card.querySelector('.seller-name').classList.add('text-success');
    } else {
      card.querySelector('.seller-name').textContent = formatAddress(seller);
    }
    
    if (isNullAddress(buyer)) {
      card.querySelector('.buyer-name').textContent = 'Burned';
      card.querySelector('.buyer-name').classList.add('text-danger');
    } else {
      card.querySelector('.buyer-name').textContent = formatAddress(buyer);
    }
    
    // Handle price display
    if (card.querySelector('.price')) {
      const price = transfer.price || '0';
      const currency = transfer.currency || 'MATIC';
      card.querySelector('.price').textContent = formatPrice(price, currency);
    }
    
    // Transaction time
    card.querySelector('.transaction-time').textContent = formatDateTime(transfer.timestamp);
    
    // Add quantity indicator if available
    if (transfer.quantity && transfer.quantity > 1) {
      const quantityBadge = document.createElement('span');
      quantityBadge.className = 'badge bg-secondary ms-2';
      quantityBadge.textContent = `x${transfer.quantity}`;
      card.querySelector('.card-name').appendChild(quantityBadge);
    }
    
    // Add token ID if available and not already part of card name
    if (transfer.tokenId && !transfer.card_name?.includes(transfer.tokenId.toString())) {
      const idBadge = document.createElement('span');
      idBadge.className = 'badge bg-light text-dark ms-2';
      idBadge.textContent = `#${transfer.tokenId}`;
      card.querySelector('.card-name').appendChild(idBadge);
    }
    
    // Add animation class for new items
    const cardElement = card.querySelector('.transaction-card');
    if (getState('animationsEnabled') && newItemIds.includes(transfer.id)) {
      cardElement.classList.add('new-item-animation');
    }
    
    // Add blockchain badge
    const badge = document.createElement('span');
    badge.className = 'blockchain-badge polygon';
    badge.textContent = 'polygon';
    cardElement.appendChild(badge);
    
    // Append card to container
    container.appendChild(card);
  });
}

/**
 * Find new Polygon transfers by comparing old and new data
 * 
 * @param {Array} previousTransfers - Previous transfers data
 * @param {Array} currentTransfers - Current transfers data 
 * @returns {Array} Array of new transfer IDs
 */
export function findNewPolygonTransfers(previousTransfers, currentTransfers) {
  if (!previousTransfers || !currentTransfers) return [];
  
  const previousIds = new Set(previousTransfers.map(transfer => transfer.id));
  return currentTransfers
    .filter(transfer => !previousIds.has(transfer.id))
    .map(transfer => transfer.id);
}
