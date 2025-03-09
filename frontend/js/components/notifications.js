/**
 * Notifications Component
 * 
 * Handles displaying notification messages to the user.
 */

// Track active notifications
const activeNotifications = [];
const MAX_NOTIFICATIONS = 3;

/**
 * Show a notification message
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, warning, info)
 * @returns {number} Notification ID
 */
export function showNotification(title, message, type = 'info') {
  console.log(`Notification (${type}): ${title} - ${message}`);
  
  // Use the console for notifications until we implement UI
  if (type === 'error') {
    console.error(`${title}: ${message}`);
  } else {
    console.log(`${title}: ${message}`);
  }
  
  // Toast container may not exist yet
  const container = document.getElementById('toast-container') || createToastContainer();
  if (!container) return -1;
  
  // Remove excess notifications
  while (activeNotifications.length >= MAX_NOTIFICATIONS) {
    const oldestId = activeNotifications.shift();
    const oldToast = document.getElementById(`toast-${oldestId}`);
    if (oldToast) oldToast.remove();
  }
  
  // Generate notification ID
  const id = Date.now();
  activeNotifications.push(id);
  
  // Create notification element
  const toast = document.createElement('div');
  toast.id = `toast-${id}`;
  toast.className = `toast show toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  
  toast.innerHTML = `
    <div class="toast-header bg-${getBgClass(type)} text-white">
      <i class="fas ${getIconClass(type)} me-2"></i>
      <strong class="me-auto">${title}</strong>
      <button type="button" class="btn-close" aria-label="Close"></button>
    </div>
    <div class="toast-body">
      ${message}
    </div>
  `;
  
  // Add to container
  container.appendChild(toast);
  
  // Auto-hide after delay
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
      const index = activeNotifications.indexOf(id);
      if (index > -1) activeNotifications.splice(index, 1);
    }, 300);
  }, 5000);
  
  return id;
}

/**
 * Create a toast container if it doesn't exist
 * @returns {HTMLElement} The toast container
 */
function createToastContainer() {
  let container = document.getElementById('toast-container');
  
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    document.body.appendChild(container);
  }
  
  return container;
}

/**
 * Get the appropriate background class for a notification type
 * @param {string} type - Notification type
 * @returns {string} Bootstrap background class
 */
function getBgClass(type) {
  switch (type) {
    case 'success': return 'success';
    case 'error': return 'danger';
    case 'warning': return 'warning';
    default: return 'info';
  }
}

/**
 * Get the appropriate icon class for a notification type
 * @param {string} type - Notification type
 * @returns {string} FontAwesome icon class
 */
function getIconClass(type) {
  switch (type) {
    case 'success': return 'fa-check-circle';
    case 'error': return 'fa-exclamation-circle';
    case 'warning': return 'fa-exclamation-triangle';
    default: return 'fa-info-circle';
  }
}
