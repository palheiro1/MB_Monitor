/**
 * Polygon Users Component
 * 
 * Handles rendering and management of Polygon users activity.
 */

import { getState } from '../../state/index.js';
import { formatAddress, formatDate } from '../../utils/formatters.js';

/**
 * Render Polygon user cards
 * 
 * @param {Array} users - Array of Polygon user objects
 * @param {HTMLElement} container - Container to render into
 * @param {Array} newItemIds - IDs of new users to animate
 */
export function renderPolygonUserCards(users, container, newItemIds = []) {
  if (!container) return;
  
  // Get search term if any
  const searchInput = container.closest('.tab-pane').querySelector('.search-input');
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  // Filter users
  let filteredUsers = users;
  
  if (searchTerm) {
    filteredUsers = users.filter(user => {
      return (user.name && user.name.toLowerCase().includes(searchTerm)) ||
             (user.address && user.address.toLowerCase().includes(searchTerm)) ||
             (user.ens && user.ens.toLowerCase().includes(searchTerm));
    });
  }
  
  // Sort users by activity
  filteredUsers = [...filteredUsers].sort((a, b) => {
    const activityA = (a.transfers_count || 0) + (a.mints_count || 0) + (a.purchases_count || 0);
    const activityB = (b.transfers_count || 0) + (b.mints_count || 0) + (b.purchases_count || 0);
    
    return getState('sortDirection') === 'desc' ? activityB - activityA : activityA - activityB;
  });
  
  // Clear container
  container.innerHTML = '';
  
  // Show message if no users
  if (filteredUsers.length === 0) {
    container.innerHTML = `
      <div class="text-center p-4 text-muted">
        No Polygon users found${searchTerm ? ' matching your search' : ''}
      </div>
    `;
    return;
  }
  
  // Get template
  const template = document.getElementById('polygon-user-card-template') || 
                   document.getElementById('user-card-template'); // Fallback to generic template
  if (!template) return;
  
  // Create and append user cards
  filteredUsers.forEach(user => {
    const card = document.importNode(template.content, true);
    
    // Set card data
    const displayName = user.ens || user.name || formatAddress(user.address);
    card.querySelector('.user-name').textContent = displayName;
    
    // Set activity counts based on available data
    if (card.querySelector('.transfers-count')) {
      card.querySelector('.transfers-count').textContent = user.transfers_count || 0;
    }
    
    if (card.querySelector('.mints-count')) {
      card.querySelector('.mints-count').textContent = user.mints_count || 0;
    }
    
    if (card.querySelector('.purchases-count')) {
      card.querySelector('.purchases-count').textContent = user.purchases_count || 0;
    }
    
    // Fallbacks for generic template compatibility
    if (card.querySelector('.trades-count') && !card.querySelector('.transfers-count')) {
      card.querySelector('.trades-count').textContent = user.transfers_count || 0;
    }
    
    if (card.querySelector('.crafts-count') && !card.querySelector('.mints-count')) {
      card.querySelector('.crafts-count').textContent = user.mints_count || 0;
    }
    
    if (card.querySelector('.burns-count') && !card.querySelector('.purchases-count')) {
      card.querySelector('.burns-count').textContent = user.purchases_count || 0;
    }
    
    // User joined date
    if (card.querySelector('.user-since')) {
      card.querySelector('.user-since').textContent = formatDate(user.first_seen);
    }
    
    // Add ENS badge if available
    if (user.ens && user.ens !== user.address) {
      const ensBadge = document.createElement('span');
      ensBadge.className = 'badge bg-info ms-2';
      ensBadge.innerHTML = '<i class="fas fa-check-circle me-1"></i>ENS';
      card.querySelector('.user-name').appendChild(ensBadge);
    }
    
    // Add animation class for new items
    const cardElement = card.querySelector('.transaction-card');
    if (getState('animationsEnabled') && newItemIds.includes(user.id)) {
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
 * Find new Polygon users by comparing old and new data
 * 
 * @param {Array} previousUsers - Previous user data
 * @param {Array} currentUsers - Current user data 
 * @returns {Array} Array of new user IDs
 */
export function findNewPolygonUsers(previousUsers, currentUsers) {
  if (!previousUsers || !currentUsers) return [];
  
  const previousIds = new Set(previousUsers.map(user => user.id));
  return currentUsers
    .filter(user => !previousIds.has(user.id))
    .map(user => user.id);
}
