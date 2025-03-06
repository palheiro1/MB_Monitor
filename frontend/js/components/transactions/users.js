/**
 * Users Component
 * 
 * Handles rendering and management of user cards.
 */

import { getState } from '../../state/index.js';
import { formatAddress, formatDate } from '../../utils/formatters.js';

/**
 * Render user cards
 * 
 * @param {Array} users - Array of user objects
 * @param {HTMLElement} container - Container to render into
 * @param {Array} newItemIds - IDs of new users to animate
 */
export function renderUserCards(users, container, newItemIds = []) {
  if (!container) return;
  
  // Get search term if any
  const searchInput = container.closest('.tab-pane').querySelector('.search-input');
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  // Filter users
  let filteredUsers = users;
  
  if (searchTerm) {
    filteredUsers = users.filter(user => {
      return (user.name && user.name.toLowerCase().includes(searchTerm)) ||
             (user.address && user.address.toLowerCase().includes(searchTerm));
    });
  }
  
  // Sort users by activity
  filteredUsers = [...filteredUsers].sort((a, b) => {
    const activityA = (a.trades_count || 0) + (a.crafts_count || 0) + (a.burns_count || 0);
    const activityB = (b.trades_count || 0) + (b.crafts_count || 0) + (b.burns_count || 0);
    
    return getState('sortDirection') === 'desc' ? activityB - activityA : activityA - activityB;
  });
  
  // Clear container
  container.innerHTML = '';
  
  // Show message if no users
  if (filteredUsers.length === 0) {
    container.innerHTML = `
      <div class="text-center p-4 text-muted">
        No users found${searchTerm ? ' matching your search' : ''}
      </div>
    `;
    return;
  }
  
  // Get template
  const template = document.getElementById('user-card-template');
  if (!template) return;
  
  // Create and append user cards
  filteredUsers.forEach(user => {
    const card = document.importNode(template.content, true);
    
    // Set card data
    card.querySelector('.user-name').textContent = user.name || formatAddress(user.address);
    card.querySelector('.trades-count').textContent = user.trades_count || 0;
    card.querySelector('.crafts-count').textContent = user.crafts_count || 0;
    card.querySelector('.burns-count').textContent = user.burns_count || 0;
    card.querySelector('.user-since').textContent = formatDate(user.first_seen);
    
    // Add animation class for new items
    const cardElement = card.querySelector('.transaction-card');
    if (getState('animationsEnabled') && newItemIds.includes(user.id)) {
      cardElement.classList.add('new-item-animation');
    }
    
    // Append card to container
    container.appendChild(card);
  });
}

/**
 * Find new users by comparing old and new data
 * 
 * @param {Array} previousUsers - Previous user data
 * @param {Array} currentUsers - Current user data 
 * @returns {Array} Array of new user IDs
 */
export function findNewUsers(previousUsers, currentUsers) {
  if (!previousUsers || !currentUsers) return [];
  
  const previousIds = new Set(previousUsers.map(user => user.id));
  return currentUsers
    .filter(user => !previousIds.has(user.id))
    .map(user => user.id);
}
