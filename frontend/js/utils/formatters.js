/**
 * Formatters
 * 
 * Functions for formatting different types of data for display.
 */

const ARDOR_EPOCH = new Date("2018-01-01T00:00:00Z").getTime();

/**
 * Format address for display - NO LONGER SHORTENS ADDRESSES
 * 
 * @param {string} address - Blockchain address
 * @returns {string} Complete address (no longer shortened)
 */
export function formatAddress(address) {
  if (!address) return 'Unknown';
  
  // Return the complete address as per user preference
  return address;
}

/**
 * Format date for display
 * 
 * @param {Date|number|string} date - Date to format
 * @returns {string} Formatted date
 */
export function formatDate(date) {
  if (!date) return 'Unknown';
  
  try {
    let dateObj;
    
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'number') {
      // Check if it's an Ardor timestamp (seconds since epoch)
      if (date < 1e10) {
        dateObj = new Date(ARDOR_EPOCH + (date * 1000));
      } else {
        dateObj = new Date(date);
      }
    } else {
      dateObj = new Date(date);
    }
    
    return dateObj.toLocaleDateString();
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
}

/**
 * Format date and time for display
 * 
 * @param {Date|number|string} date - Date to format
 * @returns {string} Formatted date and time
 */
export function formatDateTime(date) {
  if (!date) return 'Unknown date';
  
  try {
    let dateObj;
    
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'number') {
      // Check if it's an Ardor timestamp (seconds since epoch)
      if (date < 1e10) {
        dateObj = new Date(ARDOR_EPOCH + (date * 1000));
      } else {
        dateObj = new Date(date);
      }
    } else {
      dateObj = new Date(date);
    }
    
    return dateObj.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date time:', error);
    return 'Invalid Date';
  }
}

/**
 * Format a number with commas as thousands separators
 * 
 * @param {number} number - Number to format
 * @returns {string} Formatted number
 */
export function formatNumber(number) {
  if (number === undefined || number === null) return '-';
  
  // Convert to number if it's a string
  const value = typeof number === 'string' ? parseFloat(number) : number;
  
  // Check if it's a valid number
  if (isNaN(value)) return '-';
  
  return new Intl.NumberFormat().format(value);
}

/**
 * Format time ago from a date
 * 
 * @param {Date|number|string} date - Date to format
 * @returns {string} Time ago string
 */
export function formatTimeAgo(date) {
  if (!date) return 'some time ago';
  
  try {
    let past;
    
    if (date instanceof Date) {
      past = date;
    } else if (typeof date === 'number') {
      // Check if it's an Ardor timestamp (seconds since epoch)
      if (date < 1e10) {
        past = new Date(ARDOR_EPOCH + (date * 1000));
      } else {
        past = new Date(date);
      }
    } else {
      past = new Date(date);
    }
    
    const now = new Date();
    const secondsPast = Math.floor((now - past) / 1000);
    
    if (secondsPast < 60) {
      return 'just now';
    }
    if (secondsPast < 3600) {
      const minutes = Math.floor(secondsPast / 60);
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    }
    if (secondsPast < 86400) {
      const hours = Math.floor(secondsPast / 3600);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    }
    if (secondsPast < 604800) {
      const days = Math.floor(secondsPast / 86400);
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    }
    if (secondsPast < 2419200) {
      const weeks = Math.floor(secondsPast / 604800);
      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    }
    
    // For older dates, show "X months ago"
    const months = Math.floor(secondsPast / 2592000);
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  } catch (error) {
    console.error('Error formatting time ago:', error);
    return 'Unknown time';
  }
}

/**
 * Format price with currency
 * 
 * @param {number|string} price - Price to format
 * @param {string} currency - Currency code
 * @returns {string} Formatted price with currency
 */
export function formatPrice(price, currency = 'IGNIS') {
  if (!price && price !== 0) return 'Unknown';
  
  // For IGNIS, show no decimal places (round to whole number)
  if (currency === 'IGNIS') {
    return `${Math.round(parseFloat(price))} ${currency}`;
  }
  
  // For other currencies, show 2 decimal places
  return `${parseFloat(price).toFixed(2)} ${currency}`;
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

/**
 * Format an asset amount with appropriate decimals
 * 
 * @param {number|string} amount - Amount to format
 * @param {number} decimals - Number of decimals for the asset
 * @returns {string} Formatted amount
 */
export function formatAmount(amount, decimals = 0) {
  if (amount === undefined || amount === null) return '0';
  
  // Parse the amount as a number
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // If the amount has decimals, show them
  if (decimals > 0) {
    return numAmount.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    });
  } else {
    // No decimals, just format as integer
    return Math.round(numAmount).toLocaleString();
  }
}