/**
 * Helpers
 * 
 * General utility functions used throughout the application.
 */

/**
 * Debounce function to limit how often a function runs
 * Used to improve performance for expensive operations
 * 
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Get new items by comparing previous and current data
 * 
 * @param {Array} prevItems - Previous items array
 * @param {Array} currentItems - Current items array
 * @returns {Array} New items that weren't in the previous data
 */
export function getNewItems(prevItems, currentItems) {
  if (!prevItems || !Array.isArray(prevItems)) return [];
  if (!currentItems || !Array.isArray(currentItems)) return [];
  
  // Get all previous IDs for quick lookup
  const prevIds = new Set(prevItems.map(item => item.id));
  
  // Return items that don't exist in previous data
  return currentItems.filter(item => item && item.id && !prevIds.has(item.id));
}

/**
 * Clamp a number between min and max values
 * 
 * @param {number} num - Number to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

/**
 * Create a simple UUID for client-side use
 * 
 * @returns {string} UUID string
 */
export function createUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Format a number for display with thousands separators
 * 
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export function formatNumber(num) {
  if (num === undefined || num === null) return '0';
  return num.toLocaleString();
}

/**
 * Deep clone an object
 * 
 * @param {any} obj - Object to clone
 * @returns {any} Cloned object
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
