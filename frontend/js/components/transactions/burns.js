/**
 * Burns Component
 * 
 * Handles rendering and management of card burning transactions.
 */

import { getState } from '../../state/index.js';
import { formatAddress, formatDateTime } from '../../utils/formatters.js';

/**
 * Render burn cards
 * 
 * @param {Array} burns - Array of burn objects
 * @param {HTMLElement} container - Container to render into
 * @param {Array} newItemIds - IDs of new items to animate
 */
export function renderBurnCards(burns, container, newItemIds = []) {
  if (!container) return;
  
  // Get search term if any
  const searchInput = container.closest('.tab-pane').querySelector('.search-input');
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  // Filter burns based on search term
  let filteredBurns = burns;
  
  if (searchTerm) {
    filteredBurns = burns.filter(burn => {
      return (burn.card_name && burn.card_name.toLowerCase().includes(searchTerm)) ||
             (burn.burner && burn.burner.toLowerCase().includes(searchTerm));
    });
  }
  
  // Sort burns by timestamp
  filteredBurns = [...filteredBurns].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return getState('sortDirection') === 'desc' ? timeB - timeA : timeA - timeB;
  });
  
  // Clear container
  container.innerHTML = '';
  
  // Show message if no burns
  if (filteredBurns.length === 0) {
    container.innerHTML = `
      <div class="text-center p-4 text-muted">
        No burns found${searchTerm ? ' matching your search' : ''}
      </div>
    `;
    return;
  }
  
  // Get template
  const template = document.getElementById('burn-card-template');
  if (!template) return;
  
  // Create and append burn cards
  filteredBurns.forEach(burn => {
    const card = document.importNode(template.content, true);
    
    // Set card data
    card.querySelector('.card-name').textContent = burn.card_name || 'Burned Card';
    card.querySelector('.burner-name').textContent = formatAddress(burn.burner);
    card.querySelector('.amount').textContent = burn.amount || '1';
    card.querySelector('.transaction-time').textContent = formatDateTime(burn.timestamp);
    
    // Add animation class for new items
    const cardElement = card.querySelector('.transaction-card');
    if (getState('animationsEnabled') && newItemIds.includes(burn.id)) {
      cardElement.classList.add('new-item-animation');
    }
    
    // Append card to container
    container.appendChild(card);
  });
}

/**
 * Find new burns by comparing old and new data
 * 
 * @param {Array} previousBurns - Previous burn data
 * @param {Array} currentBurns - Current burn data 
 * @returns {Array} Array of new burn IDs
 */
export function findNewBurns(previousBurns, currentBurns) {
  if (!previousBurns || !currentBurns) return [];
  
  const previousIds = new Set(previousBurns.map(burn => burn.id));
  return currentBurns
    .filter(burn => !previousIds.has(burn.id))
    .map(burn => burn.id);
}
