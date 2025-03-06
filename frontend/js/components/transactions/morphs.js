/**
 * Morphs Component
 * 
 * Handles rendering and management of card morphing transactions.
 */

import { getState } from '../../state/index.js';
import { formatAddress, formatDateTime } from '../../utils/formatters.js';

/**
 * Render morph cards
 * 
 * @param {Array} morphs - Array of morph objects
 * @param {HTMLElement} container - Container to render into
 * @param {Array} newItemIds - IDs of new items to animate
 */
export function renderMorphCards(morphs, container, newItemIds = []) {
  if (!container) return;
  
  // Get search term if any
  const searchInput = container.closest('.tab-pane').querySelector('.search-input');
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  // Filter morphs based on search term
  let filteredMorphs = morphs;
  
  if (searchTerm) {
    filteredMorphs = morphs.filter(morph => {
      return (morph.from_card && morph.from_card.toLowerCase().includes(searchTerm)) ||
             (morph.to_card && morph.to_card.toLowerCase().includes(searchTerm)) ||
             (morph.morpher && morph.morpher.toLowerCase().includes(searchTerm));
    });
  }
  
  // Sort morphs by timestamp
  filteredMorphs = [...filteredMorphs].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return getState('sortDirection') === 'desc' ? timeB - timeA : timeA - timeB;
  });
  
  // Clear container
  container.innerHTML = '';
  
  // Show message if no morphs
  if (filteredMorphs.length === 0) {
    container.innerHTML = `
      <div class="text-center p-4 text-muted">
        No morphs found${searchTerm ? ' matching your search' : ''}
      </div>
    `;
    return;
  }
  
  // Get template
  const template = document.getElementById('morph-card-template');
  if (!template) return;
  
  // Create and append morph cards
  filteredMorphs.forEach(morph => {
    const card = document.importNode(template.content, true);
    
    // Set card data
    card.querySelector('.card-name').textContent = morph.to_card || 'Morphed Card';
    card.querySelector('.morpher-name').textContent = formatAddress(morph.morpher);
    card.querySelector('.from-card').textContent = morph.from_card || 'Original Card';
    card.querySelector('.to-card').textContent = morph.to_card || 'New Card';
    card.querySelector('.transaction-time').textContent = formatDateTime(morph.timestamp);
    
    // Add animation class for new items
    const cardElement = card.querySelector('.transaction-card');
    if (getState('animationsEnabled') && newItemIds.includes(morph.id)) {
      cardElement.classList.add('new-item-animation');
    }
    
    // Append card to container
    container.appendChild(card);
  });
}

/**
 * Find new morphs by comparing old and new data
 * 
 * @param {Array} previousMorphs - Previous morph data
 * @param {Array} currentMorphs - Current morph data 
 * @returns {Array} Array of new morph IDs
 */
export function findNewMorphs(previousMorphs, currentMorphs) {
  if (!previousMorphs || !currentMorphs) return [];
  
  const previousIds = new Set(previousMorphs.map(morph => morph.id));
  return currentMorphs
    .filter(morph => !previousIds.has(morph.id))
    .map(morph => morph.id);
}
