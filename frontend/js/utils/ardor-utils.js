/**
 * Ardor Blockchain Utility Functions
 * 
 * Functions for working with Ardor blockchain data
 * Based on documentation from https://ardordocs.jelurida.com/
 */

/**
 * Ardor epoch - January 1, 2018 00:00:00 UTC
 * All Ardor blockchain timestamps are measured in seconds since this date
 */
export const ARDOR_EPOCH = 1514764800000; // milliseconds (January 1, 2018 UTC)

/**
 * Convert Ardor timestamp to JavaScript Date object
 * Ardor uses seconds since the Ardor epoch (January 1, 2018)
 * 
 * @param {number} ardorTimestamp - Ardor blockchain timestamp in seconds
 * @returns {Date} JavaScript Date object
 */
export function ardorTimestampToDate(ardorTimestamp) {
  return new Date(ARDOR_EPOCH + (ardorTimestamp * 1000));
}

/**
 * Convert JavaScript Date to Ardor timestamp
 * 
 * @param {Date} date - JavaScript Date object
 * @returns {number} Ardor timestamp (seconds since epoch)
 */
export function dateToArdorTimestamp(date) {
  return Math.floor((date.getTime() - ARDOR_EPOCH) / 1000);
}

/**
 * Get current Ardor timestamp
 * 
 * @returns {number} Current Ardor timestamp
 */
export function getCurrentArdorTimestamp() {
  return dateToArdorTimestamp(new Date());
}

/**
 * Format an Ardor timestamp as a human-readable string
 * 
 * @param {number} ardorTimestamp - Ardor blockchain timestamp
 * @param {boolean} includeTime - Whether to include time in the output
 * @returns {string} Formatted date string
 */
export function formatArdorTimestamp(ardorTimestamp, includeTime = true) {
  const date = ardorTimestampToDate(ardorTimestamp);
  const options = includeTime 
    ? { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { year: 'numeric', month: 'short', day: 'numeric' };
  
  return date.toLocaleDateString(undefined, options);
}
