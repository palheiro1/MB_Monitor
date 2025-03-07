/**
 * Crafts Component
 * 
 * Handles rendering and management of card crafting transactions.
 */

import { getState } from '../../state/index.js';
import { formatAddress, formatDateTime } from '../../utils/formatters.js';
import { ardorTimestampToDate } from '../../utils/ardor-utils.js';

/**
 * Render craft cards
 * 
 * @param {Array} crafts - Array of craft objects
 * @param {HTMLElement} container - Container to render into
 * @param {Array} newItemIds - IDs of new items to animate
 */
export function renderCraftCards(crafts, container, newItemIds = []) {
  console.log("Rendering craft cards:", crafts?.length || 0);
  if (!container) {
    console.error("Craft container element not found");
    return;
  }
  
  // Get search term if any
  const searchInput = container.closest('.tab-pane')?.querySelector('.search-input');
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  // Filter and sort crafts
  let filteredCrafts = crafts || [];
  
  if (searchTerm) {
    filteredCrafts = filteredCrafts.filter(craft => {
      return (craft.cardName && craft.cardName.toLowerCase().includes(searchTerm)) ||
             (craft.assetName && craft.assetName.toLowerCase().includes(searchTerm)) ||
             (craft.recipient && craft.recipient.toLowerCase().includes(searchTerm));
    });
  }
  
  // Sort crafts by timestamp
  filteredCrafts = [...filteredCrafts].sort((a, b) => {
    // Get timestamp in milliseconds for consistent comparison
    const timeA = getTimestampInMillis(a);
    const timeB = getTimestampInMillis(b);
    
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
  if (!template) {
    console.error("Craft card template not found");
    return;
  }
  
  // Create and append craft cards
  filteredCrafts.forEach(craft => {
    const card = document.importNode(template.content, true);
    
    // Set card data
    card.querySelector('.card-name').textContent = craft.cardName || craft.assetName || 'Unknown Card';
    card.querySelector('.crafter-name').textContent = formatAddress(craft.recipient || 'Unknown');
    
    // Handle the craft time display
    const craftTime = card.querySelector('.craft-time');
    if (craftTime) {
      // Use timestampISO if available, otherwise try to format based on what we have
      if (craft.timestampISO) {
        craftTime.textContent = formatDateTime(craft.timestampISO);
      } else {
        const craftDate = getFormattedDate(craft);
        if (craftDate) {
          craftTime.textContent = formatDateTime(craftDate);
        } else {
          craftTime.textContent = 'Unknown time';
        }
      }
    }
    
    // Add animation class for new items
    const cardElement = card.querySelector('.transaction-card');
    if (getState('animationsEnabled') && newItemIds.includes(craft.id)) {
      cardElement.classList.add('new-item-animation');
    }
    
    // Add blockchain badge if needed
    if (craft.blockchain) {
      const badge = document.createElement('span');
      badge.className = `blockchain-badge ${craft.blockchain}`;
      badge.textContent = craft.blockchain;
      cardElement.appendChild(badge);
    }
    
    // Append card to container
    container.appendChild(card);
  });
}

// Helper functions for consistent timestamp handling
function getTimestampInMillis(item) {
  if (item.date) {
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
  if (item.date) {
    // If date is already provided, use it directly
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
 * Find new crafts by comparing old and new data
 * 
 * @param {Array} previousCrafts - Previous craft data
 * @param {Array} currentCrafts - Current craft data 
 * @returns {Array} Array of new craft IDs
 */
export function findNewCraftings(previousCrafts, currentCrafts) {
  if (!previousCrafts || !currentCrafts) return [];
  
  const previousIds = new Set(previousCrafts.map(craft => craft.id));
  return currentCrafts
    .filter(craft => !previousIds.has(craft.id))
    .map(craft => craft.id);
}
