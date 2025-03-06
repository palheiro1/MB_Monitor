/**
 * Formatters
 * 
 * Utility functions for formatting values for display.
 */

/**
 * Format wallet address for display
 * Abbreviates long addresses to improve readability
 * 
 * @param {string} address - Blockchain address
 * @returns {string} Formatted address (e.g., "0x1234...5678")
 */
export function formatAddress(address) {
  if (!address) return 'Unknown';
  if (address.length <= 10) return address;
  return address.substring(0, 6) + '...' + address.substring(address.length - 4);
}

/**
 * Format cryptocurrency price for display
 * 
 * @param {number|string} price - Price value
 * @param {string} currency - Currency code
 * @returns {string} Formatted price with currency
 */
export function formatPrice(price, currency) {
  if (!price) return '0';
  return `${parseFloat(price).toLocaleString()} ${currency || ''}`;
}

/**
 * Format number with thousands separators
 * 
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export function formatNumber(num) {
  if (!num && num !== 0) return '0';
  return Number(num).toLocaleString();
}

/**
 * Format date for display
 * 
 * @param {string} dateStr - ISO date string
 * @returns {string} Formatted date
 */
export function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString();
}

/**
 * Format date and time for display
 * 
 * @param {string} dateStr - ISO date string
 * @returns {string} Formatted date and time
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleString();
}

/**
 * Format date range for display
 * 
 * @param {Object} range - Object with start and end dates
 * @returns {string} Formatted date range
 */
export function formatDateRange(range) {
  if (!range || !range.start || !range.end) return 'N/A';
  return `${formatDate(range.start)} - ${formatDate(range.end)}`;
}

/**
 * Format file size in human-readable form
 * Converts bytes to appropriate unit (KB, MB, etc.)
 * 
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted file size
 */
export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  
  return `${bytes.toFixed(1)} ${units[i]}`;
}