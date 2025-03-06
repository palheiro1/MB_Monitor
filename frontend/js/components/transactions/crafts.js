/**
 * Crafts Component
 * 
 * Handles rendering and management of card crafting transactions.
 */

import { getState } from '../../state/index.js';
import { formatAddress, formatDateTime } from '../../utils/formatters.js';

/**
 * Render craft cards
 * 
 * @param {Array} crafts - Array of craft objects
 * @param {HTMLElement} container - Container to render into
 * @param {Array} newItemIds - IDs of new items to animate
 */
export function renderCraftCards(crafts, container, newItemIds = []) {
  if (!container) return;
  
  // Get search term if any
  const searchInput = container.closest('.tab-pane').querySelector('.search-input');
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  // Filter crafts based on search term
  let filteredCrafts = crafts;
  
  if (searchTerm) {
    filteredCrafts = crafts.filter(craft => {
      return (craft.result_card && craft.result_card.toLowerCase().includes(searchTerm)) ||
             (craft.crafter && craft.crafter.toLowerCase().includes(searchTerm)) ||
             (craft.input_cards && craft.input_cards.some(card => 
               card.toLowerCase().includes(searchTerm)
             ));
    });
  }
  
  // Sort crafts by timestamp
  filteredCrafts = [...filteredCrafts].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return getState('sortDirection') === 'desc' ? timeB - timeA : timeA - timeB;
  });
  
  // Clear container
  container.innerHTML = '';
  
  // Show message if no crafts
  if (filteredCrafts.length === 0) {
    container.innerHTML = `
      <div class="text-center p-4 text-muted">
        No crafts found${searchTerm ? ' matching your search' : ''}
      </div>
    `;
    return;
  }
  
  // Get template
  const template = document.getElementById('craft-card-template');
  if (!template) return;
  
  // Create and append craft cards
  filteredCrafts.forEach(craft => {
    const card = document.importNode(template.content, true);
    
    // Set card data
    card.querySelector('.card-name').textContent = craft.result_card || 'Unknown Card';
    card.querySelector('.crafter-name').textContent = formatAddress(craft.crafter);
    card.querySelector('.craft-result').textContent = craft.result_card || 'New Card';
    card.querySelector('.transaction-time').textContent = formatDateTime(craft.timestamp);
    
    // Add animation class for new items
    const cardElement = card.querySelector('.transaction-card');
    if (getState('animationsEnabled') && newItemIds.includes(craft.id)) {
      cardElement.classList.add('new-item-animation');
    }
    
    // Append card to container
    container.appendChild(card);
  });
}

/**
 * Find new crafts by comparing old and new data
 * 
 * @param {Array} previousCrafts - Previous craft data
 * @param {Array} currentCrafts - Current craft data 
 * @returns {Array} Array of new craft IDs
 */
export function findNewCrafts(previousCrafts, currentCrafts) {
  if (!previousCrafts || !currentCrafts) return [];
  
  const previousIds = new Set(previousCrafts.map(craft => craft.id));
  return currentCrafts
    .filter(craft => !previousIds.has(craft.id))
    .map(craft => craft.id);
}
