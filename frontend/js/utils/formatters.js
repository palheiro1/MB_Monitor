/**
 * Formatters
 * 
 * Functions for formatting different types of data for display.
 */

const ARDOR_EPOCH = new Date("2018-01-01T00:00:00Z").getTime();

/**
 * Format address for display
 * 
 * @param {string} address - Blockchain address
 * @returns {string} Shortened address
 */
export function formatAddress(address) {
  if (!address) return 'Unknown';
  if (address.length <= 14) return address;
  return address.substring(0, 6) + '...' + address.substring(address.length - 6);
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
    
    return `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString()}`;
  } catch (error) {
    console.error('Error formatting date time:', error);
    return 'Invalid Date';
  }
}

/**
 * Format time ago from a date
 * 
 * @param {Date|number|string} date - Date to format
 * @returns {string} Time ago string
 */
export function formatTimeAgo(date) {
  if (!date) return 'Unknown';
  
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
    const diffInSeconds = Math.floor((now - past) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds} second${diffInSeconds !== 1 ? 's' : ''} ago`;
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  } catch (error) {
    console.error('Error formatting time ago:', error);
    return 'Unknown time';
  }
}

/**
 * Format a number with commas as thousands separators
 * 
 * @param {number} number - Number to format
 * @returns {string} Formatted number
 */
export function formatNumber(number) {
  if (number === undefined || number === null) return '0';
  return number.toLocaleString();
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