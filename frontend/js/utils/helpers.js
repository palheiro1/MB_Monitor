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
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
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
  if (!prevItems || !currentItems || !prevItems.length || !currentItems.length) return [];
  
  // Get IDs of previous items
  const prevIds = new Set(prevItems.map(item => item.id));
  
  // Filter current items to find ones not in previous data
  return currentItems.filter(item => !prevIds.has(item.id));
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
