/**
 * Formatting Utilities
 * Common formatting functions used throughout the application
 */

export const formatters = {
  /**
   * Format a number with thousands separators
   */
  formatNumber(number) {
    if (number === undefined || number === null) return '-';
    return new Intl.NumberFormat().format(number);
  },

  /**
   * Format a currency value
   */
  formatCurrency(amount, currency = 'GEM', decimals = 6) {
    if (amount === undefined || amount === null) return '-';
    
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals
    }).format(amount);
    
    return `${formatted} ${currency}`;
  },

  /**
   * Format a date in localized format
   */
  formatDate(date) {
    if (!date) return '-';
    
    if (typeof date === 'string') {
      date = new Date(date);
    }
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  },

  /**
   * Format a date and time in localized format
   */
  formatDateTime(date) {
    if (!date) return '-';
    
    if (typeof date === 'string') {
      date = new Date(date);
    }
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  },

  /**
   * Format a blockchain address (truncated with ellipsis)
   */
  formatAddress(address, prefixLength = 5, suffixLength = 4) {
    if (!address) return '-';
    
    if (address.length <= prefixLength + suffixLength + 3) {
      return address;
    }
    
    return `${address.substring(0, prefixLength)}...${address.substring(address.length - suffixLength)}`;
  },

  /**
   * Format a transaction ID (truncated with ellipsis)
   */
  formatTransactionId(id, prefixLength = 6, suffixLength = 6) {
    if (!id) return '-';
    
    if (id.length <= prefixLength + suffixLength + 3) {
      return id;
    }
    
    return `${id.substring(0, prefixLength)}...${id.substring(id.length - suffixLength)}`;
  },

  /**
   * Format a time duration in words (e.g., "5 minutes ago")
   */
  formatTimeAgo(date) {
    if (!date) return '-';
    
    if (typeof date === 'string') {
      date = new Date(date);
    }
    
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) {
      return interval === 1 ? '1 year ago' : `${interval} years ago`;
    }
    
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) {
      return interval === 1 ? '1 month ago' : `${interval} months ago`;
    }
    
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) {
      return interval === 1 ? '1 day ago' : `${interval} days ago`;
    }
    
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) {
      return interval === 1 ? '1 hour ago' : `${interval} hours ago`;
    }
    
    interval = Math.floor(seconds / 60);
    if (interval >= 1) {
      return interval === 1 ? '1 minute ago' : `${interval} minutes ago`;
    }
    
    return seconds < 10 ? 'just now' : `${seconds} seconds ago`;
  },

  /**
   * Format a file size (e.g., "1.5 MB")
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
};