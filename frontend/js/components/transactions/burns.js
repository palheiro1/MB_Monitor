/**
 * Burns Component
 * 
 * Handles rendering and management of card burning transactions.
 */

import { getState } from '../../state/index.js';
import { formatAddress, formatDateTime } from '../../utils/formatters.js';
import { ardorTimestampToDate } from '../../utils/ardor-utils.js';

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
  
  // Filter and sort burns
  let filteredBurns = burns;
  
  if (searchTerm) {
    filteredBurns = burns.filter(burn => {
      return (burn.cardName && burn.cardName.toLowerCase().includes(searchTerm)) ||
             (burn.assetName && burn.assetName.toLowerCase().includes(searchTerm)) ||
             (burn.sender && burn.sender.toLowerCase().includes(searchTerm));
    });
  }
  
  // Sort burns by timestamp
  filteredBurns = [...filteredBurns].sort((a, b) => {
    // Get timestamp in milliseconds for consistent comparison
    const timeA = getTimestampInMillis(a);
    const timeB = getTimestampInMillis(b);
    
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
    card.querySelector('.card-name').textContent = burn.cardName || burn.assetName || 'Unknown Card';
    card.querySelector('.burner-name').textContent = formatAddress(burn.sender || 'Unknown');
    
    // Handle the burn time display
    const burnTime = card.querySelector('.burn-time');
    if (burnTime) {
      // Use timestampISO if available, otherwise try to format based on what we have
      if (burn.timestampISO) {
        burnTime.textContent = formatDateTime(burn.timestampISO);
      } else {
        const burnDate = getFormattedDate(burn);
        if (burnDate) {
          burnTime.textContent = formatDateTime(burnDate);
        } else {
          burnTime.textContent = 'Unknown time';
        }
      }
    }
    
    // Add animation class for new items
    const cardElement = card.querySelector('.transaction-card');
    if (getState('animationsEnabled') && newItemIds.includes(burn.id)) {
      cardElement.classList.add('new-item-animation');
    }
    
    // Add blockchain badge if needed
    if (burn.blockchain) {
      const badge = document.createElement('span');
      badge.className = `blockchain-badge ${burn.blockchain}`;
      badge.textContent = burn.blockchain;
      cardElement.appendChild(badge);
    }
    
    // Append card to container
    container.appendChild(card);
  });
}

// Helper functions for consistent timestamp handling
function getTimestampInMillis(item) {
  if (item.timestampISO) {
    return new Date(item.timestampISO).getTime();
  } else if (item.date) {
    return new Date(item.date).getTime();
  } else if (item.timestamp) {
    // If it's an Ardor timestamp (seconds since Ardor epoch)
    if (typeof item.timestamp === 'number' && item.timestamp < 1e10) {
      return ardorTimestampToDate(item.timestamp).getTime();
    }
    // Otherwise assume it's a standard timestamp
    return new Date(item.timestamp).getTime();
  }
  return 0; // Default to 0 if no timestamp found
}

function getFormattedDate(item) {
  if (item.timestampISO) {
    return item.timestampISO;
  } else if (item.date) {
    return new Date(item.date).toISOString();
  } else if (item.timestamp) {
    // If it's an Ardor timestamp (seconds since Ardor epoch)
    if (typeof item.timestamp === 'number' && item.timestamp < 1e10) {
      return ardorTimestampToDate(item.timestamp).toISOString();
    }
    // Otherwise assume it's a standard timestamp
    return new Date(item.timestamp).toISOString();
  }
  return null;
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
