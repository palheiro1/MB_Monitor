/**
 * Users Component
 * 
 * Handles rendering and management of user cards.
 */

import { getState } from '../../state/index.js';
import { formatAddress, formatDate, formatTimeAgo } from '../../utils/formatters.js';

/**
 * Format activity type for display
 * @param {string} type - Activity type
 * @returns {string} Formatted activity type
 */
function formatActivityType(type) {
  switch (type) {
    case 'trade_buy': return 'Bought';
    case 'trade_sell': return 'Sold';
    case 'transfer_send': return 'Sent';
    case 'transfer_receive': return 'Received';
    default: return type.replace('_', ' ');
  }
}

/**
 * Get activity icon based on type
 * @param {string} type - Activity type
 * @returns {string} Icon class
 */
function getActivityIcon(type) {
  switch (type) {
    case 'trade_buy': return 'fa-shopping-cart';
    case 'trade_sell': return 'fa-tag';
    case 'transfer_send': return 'fa-arrow-up';
    case 'transfer_receive': return 'fa-arrow-down';
    default: return 'fa-circle';
  }
}

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
  const searchInput = container.closest('.tab-pane')?.querySelector('.search-input');
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  // Filter users
  let filteredUsers = users;
  
  if (searchTerm) {
    filteredUsers = users.filter(user => {
      return (user.name && user.name.toLowerCase().includes(searchTerm)) ||
             (user.address && user.address.toLowerCase().includes(searchTerm));
    });
  }
  
  // Sort users by most recent activity (last_seen) instead of activity count
  filteredUsers = [...filteredUsers].sort((a, b) => {
    const timeA = new Date(a.last_seen || 0).getTime();
    const timeB = new Date(b.last_seen || 0).getTime();
    
    return getState('sortDirection') === 'desc' ? timeB - timeA : timeA - timeB;
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
    
    // Set card data - Use complete address
    card.querySelector('.user-name').textContent = user.name || user.address || 'Unknown User';
    
    // Set dates
    const userSinceEl = card.querySelector('.user-since');
    if (userSinceEl) {
      userSinceEl.textContent = `First seen: ${formatTimeAgo(user.first_seen)}`;
      userSinceEl.title = formatDate(user.first_seen);
    }
    
    const lastActivityEl = card.querySelector('.last-activity');
    if (lastActivityEl) {
      lastActivityEl.textContent = `Last activity: ${formatTimeAgo(user.last_seen)}`;
      lastActivityEl.title = formatDate(user.last_seen);
    }
    
    // Set activity counts
    const tradesCountEl = card.querySelector('.trades-count');
    if (tradesCountEl) {
      tradesCountEl.textContent = (user.trades_count || 0).toString();
    }
    
    const tradesBuyCountEl = card.querySelector('.trades-buy-count');
    if (tradesBuyCountEl) {
      tradesBuyCountEl.textContent = (user.trades_buy_count || 0).toString();
    }
    
    const tradesSellCountEl = card.querySelector('.trades-sell-count');
    if (tradesSellCountEl) {
      tradesSellCountEl.textContent = (user.trades_sell_count || 0).toString();
    }
    
    const transfersCountEl = card.querySelector('.transfers-count');
    if (transfersCountEl) {
      transfersCountEl.textContent = (user.transfers_count || 0).toString();
    }
    
    // Add recent activity list if available
    const recentActivitiesEl = card.querySelector('.recent-activities');
    if (recentActivitiesEl && user.recent_activities && user.recent_activities.length > 0) {
      // Clear any placeholder content
      recentActivitiesEl.innerHTML = '';
      
      // Create a list of recent activities
      const activityList = document.createElement('ul');
      activityList.className = 'activity-list';
      
      // Add the most recent activities (up to 5)
      user.recent_activities.slice(0, 5).forEach(activity => {
        const activityItem = document.createElement('li');
        activityItem.className = 'activity-item';
        
        // Create activity content with icon and details
        activityItem.innerHTML = `
          <span class="activity-icon"><i class="fas ${getActivityIcon(activity.type)}"></i></span>
          <span class="activity-details">
            <span class="activity-type">${formatActivityType(activity.type)}</span>
            <span class="activity-asset">${activity.assetName}</span>
            <span class="activity-time">${formatTimeAgo(activity.dateISO)}</span>
          </span>
        `;
        
        activityList.appendChild(activityItem);
      });
      
      recentActivitiesEl.appendChild(activityList);
      
      // Add a "see more" button if there are more activities
      if (user.total_activities > 5) {
        const seeMoreBtn = document.createElement('button');
        seeMoreBtn.className = 'btn btn-sm btn-outline-secondary mt-2';
        seeMoreBtn.textContent = `See all ${user.total_activities} activities`;
        recentActivitiesEl.appendChild(seeMoreBtn);
      }
    }
    
    // Add animation class for new items
    const cardElement = card.querySelector('.transaction-card');
    if (cardElement && getState('animationsEnabled') && newItemIds.includes(user.id)) {
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
  // Make sure both inputs are arrays
  if (!Array.isArray(previousUsers)) previousUsers = [];
  if (!Array.isArray(currentUsers)) currentUsers = [];
  
  const previousIds = new Set(previousUsers.map(user => user.address || user.id));
  return currentUsers
    .filter(user => !previousIds.has(user.address || user.id))
    .map(user => user.address || user.id);
}
