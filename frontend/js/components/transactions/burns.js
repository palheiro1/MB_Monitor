/**
 * Burns Component
 * 
 * Handles rendering of burn transaction cards
 */

import { formatTimeAgo, formatDate, formatAddress } from '../../utils/formatters.js';

// Ardor epoch constant
const ARDOR_EPOCH = new Date("2018-01-01T00:00:00Z").getTime();

/**
 * Convert Ardor timestamp to Date object
 * @param {number} timestamp - Ardor timestamp (seconds since epoch)
 * @returns {Date} JavaScript Date object
 */
function ardorTimestampToDate(timestamp) {
  return new Date(ARDOR_EPOCH + (timestamp * 1000));
}

/**
 * Extract card info from asset description JSON
 * @param {Object} burn - Burn object
 * @returns {Object} Card info object with name and rarity
 */
function extractCardInfo(burn) {
  const result = {
    name: 'Unknown Card',
    rarity: 'unknown'
  };
  
  try {
    // Try to find assetDescription or description field
    const description = burn.assetDescription || burn.description;
    
    if (description) {
      // Check if it's already a parsed object or needs parsing
      let descriptionObj;
      if (typeof description === 'string') {
        try {
          descriptionObj = JSON.parse(description);
        } catch (e) {
          // Not JSON, leave as is
          descriptionObj = null;
        }
      } else if (typeof description === 'object') {
        descriptionObj = description;
      }
      
      // Extract name and rarity if we have a valid object
      if (descriptionObj && descriptionObj.name) {
        result.name = descriptionObj.name;
      }
      
      if (descriptionObj && descriptionObj.rarity) {
        result.rarity = descriptionObj.rarity;
      }
    }
    
    // Fall back to asset name if no name was found in description
    if (result.name === 'Unknown Card') {
      result.name = burn.card_name || burn.cardName || burn.assetName || 'Unknown Card';
    }
  } catch (error) {
    console.error('Error extracting card info:', error, burn);
  }
  
  return result;
}

/**
 * Get rarity CSS class
 * @param {string} rarity - Card rarity
 * @returns {string} CSS class for the rarity
 */
function getRarityClass(rarity) {
  if (!rarity) return 'rarity-unknown';
  
  const normalizedRarity = rarity.toLowerCase();
  
  if (normalizedRarity === 'common') return 'rarity-common';
  if (normalizedRarity === 'rare') return 'rarity-rare';
  if (normalizedRarity === 'very rare' || normalizedRarity === 'epic') return 'rarity-epic';
  
  return 'rarity-unknown';
}

/**
 * Format rarity for display
 * @param {string} rarity - Original rarity string
 * @returns {string} Formatted rarity for display
 */
function formatRarity(rarity) {
  if (!rarity) return 'Unknown';
  
  const normalizedRarity = rarity.toLowerCase();
  
  if (normalizedRarity === 'very rare') return 'Epic';
  
  // Capitalize first letter
  return normalizedRarity.charAt(0).toUpperCase() + normalizedRarity.slice(1);
}

/**
 * Render burn cards
 * 
 * @param {Array} burns - Array of burn objects
 * @param {HTMLElement} container - Container to render into
 * @param {Array} newItemIds - IDs of new items to animate
 */
export function renderBurnCards(burns, container, newItemIds = []) {
  console.log('renderBurnCards called with:', { 
    burnsCount: Array.isArray(burns) ? burns.length : 'not array', 
    containerId: container?.id || 'missing'
  });
  
  // Validate parameters
  if (!container || !container.appendChild) {
    console.error('Invalid container provided to renderBurnCards', container);
    return;
  }
  
  if (!Array.isArray(burns)) {
    console.error('Invalid burns array provided to renderBurnCards', burns);
    container.innerHTML = `
      <div class="text-center p-4 text-muted">
        No burn operations found
      </div>
    `;
    return;
  }
  
  console.log(`Rendering ${burns.length} burn cards`);
  
  // Clear container
  container.innerHTML = '';
  
  if (burns.length === 0) {
    container.innerHTML = '<div class="text-center p-4">No burn transactions found</div>';
    return;
  }
  
  // Get template
  const template = document.getElementById('burn-card-template');
  if (!template) {
    console.error('Burn card template not found');
    return;
  }
  
  // Create and append burn cards
  burns.forEach(burn => {
    try {
      const card = document.importNode(template.content, true);
      
      // Extract card info from assetDescription
      const cardInfo = extractCardInfo(burn);
      
      // Set card name (without rarity badge)
      const cardNameEl = card.querySelector('.card-name');
      if (cardNameEl) {
        cardNameEl.textContent = cardInfo.name;
      }
      
      const burnerNameEl = card.querySelector('.burner-name');
      if (burnerNameEl) {
        // Use complete address without shortening
        burnerNameEl.textContent = burn.sender || burn.senderRS || 'Unknown';
      }
      
      // Set transaction time
      const transactionTimeEl = card.querySelector('.transaction-time');
      if (transactionTimeEl) {
        // Convert timestamp if needed
        let burnDate;
        if (burn.timestamp) {
          // Check if it's Ardor timestamp (seconds since epoch) or milliseconds
          burnDate = burn.timestamp < 1e10 
            ? ardorTimestampToDate(burn.timestamp)
            : new Date(burn.timestamp);
        } else if (burn.date) {
          burnDate = new Date(burn.date);
        } else {
          burnDate = new Date();
        }
        
        transactionTimeEl.textContent = formatTimeAgo(burnDate);
        transactionTimeEl.title = formatDate(burnDate);
      }
      
      // Set burn amount
      const amountEl = card.querySelector('.amount');
      if (amountEl) {
        amountEl.textContent = burn.quantityQNT || burn.quantityFormatted || '1';
      }
      
      // Add rarity field below amount
      const detailsEl = card.querySelector('.transaction-details');
      if (detailsEl) {
        // Create rarity element
        const rarityEl = document.createElement('div');
        rarityEl.className = `card-rarity ${getRarityClass(cardInfo.rarity)}`;
        
        // Create icon
        const rarityIcon = document.createElement('i');
        rarityIcon.className = 'fas fa-crown';
        rarityEl.appendChild(rarityIcon);
        
        // Add text
        const rarityText = document.createElement('span');
        rarityText.textContent = ` Rarity: ${formatRarity(cardInfo.rarity)}`;
        rarityEl.appendChild(rarityText);
        
        // Add to the card
        detailsEl.appendChild(rarityEl);
      }
      
      // Add to container
      container.appendChild(card);
    } catch (error) {
      console.error('Error rendering burn card:', error, burn);
    }
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
  if (!Array.isArray(previousBurns) || !Array.isArray(currentBurns)) {
    return [];
  }
  
  // Create a set of IDs from the previous burns for O(1) lookup
  const previousIds = new Set();
  previousBurns.forEach(burn => {
    const id = burn.id || burn.fullHash || burn.assetTransferFullHash;
    if (id) previousIds.add(id);
  });
  
  // Find burns that weren't in the previous data
  return currentBurns
    .filter(burn => {
      const id = burn.id || burn.fullHash || burn.assetTransferFullHash;
      return id && !previousIds.has(id);
    })
    .map(burn => burn.id || burn.fullHash || burn.assetTransferFullHash);
}
