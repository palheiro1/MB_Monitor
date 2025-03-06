import { getState } from '../state/index.js';

// Keep track of active notifications
const activeNotifications = new Set();

/**
 * Show notification with message
 * Creates a temporary notification that auto-dismisses
 * 
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, info, warning, error)
 */
export function showNotification(title, message, type = 'info') {
  // Get the max number of notifications to display at once
  const MAX_NOTIFICATIONS = getState('config.MAX_NOTIFICATIONS') || 3;
  
  // Create container if it doesn't exist
  const notificationsContainer = document.getElementById('notifications-container') || 
    createNotificationsContainer();
    
  // Remove oldest notification if at limit
  if (activeNotifications.size >= MAX_NOTIFICATIONS) {
    const oldestNotification = notificationsContainer.querySelector('.notification');
    if (oldestNotification) {
      removeNotification(oldestNotification);
    }
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type} animate__animated animate__fadeInRight`;
  notification.setAttribute('role', 'alert');
  
  notification.innerHTML = `
    <div class="notification-header">
      <h6 class="m-0">${title}</h6>
      <button type="button" class="btn-close btn-sm" aria-label="Close"></button>
    </div>
    <div class="notification-body">
      ${message}
    </div>
  `;
  
  // Use event delegation for close button
  notification.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-close')) {
      removeNotification(notification);
    }
  });
  
  notificationsContainer.appendChild(notification);
  activeNotifications.add(notification);
  
  // Auto-dismiss after a timeout
  const NOTIFICATION_DURATION = getState('config.NOTIFICATION_DURATION') || 5000;
  setTimeout(() => {
    if (activeNotifications.has(notification)) {
      removeNotification(notification);
    }
  }, NOTIFICATION_DURATION);
  
  return notification;
}

/**
 * Remove a notification with animation
 * @param {HTMLElement} notification - Notification element to remove
 */
function removeNotification(notification) {
  if (!notification) return;
  
  // Replace the incoming animation with outgoing animation
  notification.classList.replace('animate__fadeInRight', 'animate__fadeOutRight');
  
  // Remove from DOM after animation completes
  setTimeout(() => {
    notification.remove();
    activeNotifications.delete(notification);
  }, 300);
}

/**
 * Create container for notifications
 * @returns {HTMLElement} Notifications container element
 */
function createNotificationsContainer() {
  const container = document.createElement('div');
  container.id = 'notifications-container';
  document.body.appendChild(container);
  return container;
}

/**
 * Clear all notifications
 */
export function clearAllNotifications() {
  const container = document.getElementById('notifications-container');
  if (!container) return;
  
  // Get all notifications and remove them one by one with a slight delay
  const notifications = Array.from(container.querySelectorAll('.notification'));
  
  notifications.forEach((notification, index) => {
    setTimeout(() => {
      removeNotification(notification);
    }, index * 100); // Stagger the removals
  });
}