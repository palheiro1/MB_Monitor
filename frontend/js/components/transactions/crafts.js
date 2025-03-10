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
 */
export function renderCraftCards(crafts, container, newItemIds = []) {
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
    return;
  }
  
  // Update the cache
  craftCache = [...crafts];
  
  // Create a document fragment to improve performance
  const fragment = document.createDocumentFragment();
  
  // Process each craft
  crafts.forEach(craft => {
    try {
      const formattedCraft = formatCraftDetails(craft);
      
      // Clone the template
      const card = template.content.cloneNode(true);
      
      // Set the card data
      card.querySelector('.card-name').textContent = formattedCraft.cardName;
      card.querySelector('.transaction-time').textContent = formattedCraft.timeAgo;
      card.querySelector('.crafter-name').textContent = formattedCraft.crafterName;
      card.querySelector('.craft-result').textContent = formattedCraft.craftResult;
      
      // Add CSS class based on card rarity
      const cardElement = card.querySelector('.craft-card');
      if (formattedCraft.cardRarity) {
        cardElement.classList.add(`rarity-${formattedCraft.cardRarity.toLowerCase().replace(/\s+/g, '-')}`);
      }
      
      // Add data attributes for filtering/sorting
      cardElement.dataset.id = formattedCraft.id;
      cardElement.dataset.timestamp = formattedCraft.timestamp;
      cardElement.dataset.cardName = formattedCraft.cardName;
      cardElement.dataset.crafter = formattedCraft.crafter;
      
      // Add animation class if needed
      if (animateEntrance) {
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
 * @param {Array} craftings - New crafting operations
 * @returns {Array} New craft operations not present in cache
 */
export function findNewCrafts(craftings) {
  if (!craftings || !Array.isArray(craftings)) {
    return [];
  }
  
  // Store all existing IDs for quick lookup
  const existingIds = new Set(craftCache.map(craft => craft.id));
  
  // Filter out only the new crafts
  return craftings.filter(craft => !existingIds.has(craft.id));
}
