/**
 * Craft Transactions Renderer
 * Handles rendering of craft cards and finding new craft operations
 */

import { getState } from '../../state/index.js';
import { formatTimeAgo, formatNumber } from '../../utils/formatters.js';

// Cache for craft operations
let craftCache = [];

/**
 * Format craft details for display
 * @param {Object} craft - Craft operation data
 * @returns {Object} Formatted craft data
 */
function formatCraftDetails(craft) {
  return {
    id: craft.id,
    timestamp: craft.timestamp,
    date: craft.date,
    cardName: craft.cardName || 'Unknown Card',
    cardRarity: craft.cardRarity || 'unknown',
    crafter: craft.recipient,
    crafterName: craft.recipient.slice(0, 6) + '...' + craft.recipient.slice(-5),
    craftResult: `${craft.cardsUsed || 1} card${craft.cardsUsed > 1 ? 's' : ''} used`,
    timeAgo: formatTimeAgo(new Date(craft.date)),
    assetId: craft.assetId,
    fullHash: craft.fullHash
  };
}

/**
 * Render craft cards
 * 
 * @param {Array} crafts - Array of craft objects
 * @param {HTMLElement} container - Container to render into
 * @param {Array} newItemIds - IDs of new items to animate
 * @param {Object} options - Optional rendering settings
 */
export function renderCraftCards(crafts, container, newItemIds = [], options = {}) {
  console.log('renderCraftCards called with:', { 
    craftsCount: Array.isArray(crafts) ? crafts.length : 'not array', 
    container: container?.id || 'missing' 
  });
  
  // Validate parameters
  if (!container || !container.appendChild) {
    console.error('Invalid container provided to renderCraftCards', container);
    return;
  }
  
  if (!Array.isArray(crafts)) {
    console.error('Invalid crafts array provided to renderCraftCards', crafts);
    container.innerHTML = `
      <div class="text-center p-4 text-muted">
        No crafting operations found
      </div>
    `;
    return;
  }
  
  console.log(`Rendering ${crafts.length} craft operations`);
  const { animateEntrance = true } = options;
  
  // Get the template
  const template = document.getElementById('craft-card-template');
  if (!template) {
    console.error('Craft card template not found');
    container.innerHTML = `
      <div class="text-center p-4 text-muted">
        Error: Craft card template not found
      </div>
    `;
    return;
  }
  
  // Clear the container first
  container.innerHTML = '';
  
  // Show message if no crafts
  if (crafts.length === 0) {
    container.innerHTML = `
      <div class="text-center p-4 text-muted">
        No crafting operations found
      </div>
    `;
    return;
  }
  
  // Update the cache
  craftCache = [...crafts];
  
  // Create a document fragment to improve performance
  const fragment = document.createDocumentFragment();
  
  // Process each craft
  crafts.forEach(craft => {
    try {
      // Clone the template
      const card = template.content.cloneNode(true);
      
      // Set card data - use simplified approach to avoid errors
      const cardNameEl = card.querySelector('.card-name');
      if (cardNameEl) {
        cardNameEl.textContent = craft.cardName || craft.assetName || 'Unknown Card';
      }
      
      const timeElement = card.querySelector('.transaction-time');
      if (timeElement) {
        timeElement.textContent = formatTimeAgo(craft.date || craft.timestamp);
      }
      
      const crafterElement = card.querySelector('.crafter-name');
      if (crafterElement) {
        crafterElement.textContent = craft.recipient ? 
          (craft.recipient.slice(0, 6) + '...' + craft.recipient.slice(-5)) : 
          'Unknown';
      }
      
      const craftResultElement = card.querySelector('.craft-result');
      if (craftResultElement) {
        craftResultElement.textContent = craft.cardName || craft.assetName || 'Unknown Card';
      }
      
      // Add animation class if needed
      const cardElement = card.querySelector('.transaction-card');
      if (cardElement && animateEntrance) {
        cardElement.classList.add('animate__animated', 'animate__fadeInRight');
      }
      
      fragment.appendChild(card);
    } catch (error) {
      console.error('Error rendering craft card:', error, craft);
    }
  });
  
  container.appendChild(fragment);
}

/**
 * Find new craft operations not present in the current cache
 * @param {Array} previousCrafts - Previously displayed crafts
 * @param {Array} currentCrafts - Current crafting operations 
 * @returns {Array} New craft IDs
 */
export function findNewCrafts(previousCrafts, currentCrafts) {
  if (!Array.isArray(previousCrafts) || !Array.isArray(currentCrafts)) {
    return [];
  }
  
  // Store all existing IDs for quick lookup
  const existingIds = new Set((previousCrafts || []).map(craft => craft.id));
  
  // Filter out only the new craft IDs
  return currentCrafts
    .filter(craft => craft.id && !existingIds.has(craft.id))
    .map(craft => craft.id);
}
