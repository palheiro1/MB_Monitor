/**
 * Cache Table Component
 * 
 * Handles rendering of cache statistics in a table.
 */

import { getState } from '../state/index.js';
import { formatFileSize, formatDateTime, formatDateRange } from '../utils/formatters.js';

/**
 * Render cache statistics table
 */
export function renderCacheTable() {
  const cacheData = getState('currentData.cacheData');
  const tableBody = document.querySelector('#cache-stats-table tbody');
  
  if (!tableBody) {
    console.log('Cache stats table not found in DOM');
    return;
  }
  
  if (!cacheData || !cacheData.files) {
    tableBody.innerHTML = `<tr><td colspan="5" class="text-center">No cache data available</td></tr>`;
    return;
  }
  
  try {
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // No files
    if (cacheData.files.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" class="text-center">No cache files found</td></tr>`;
      return;
    }
    
    // Render each file
    cacheData.files.forEach(file => {
      const row = document.createElement('tr');
      
      // Get file details
      const fileName = file.filename || 'Unknown';
      const recordCount = getRecordCount(file);
      const fileSize = file.size || 0;
      const dateRange = getDateRange(file);
      const lastUpdated = file.lastModified || null;
      
      // Create cells
      row.innerHTML = `
        <td>${fileName}</td>
        <td>${recordCount}</td>
        <td>${formatFileSize(fileSize)}</td>
        <td>${formatDateRange(dateRange)}</td>
        <td>${lastUpdated ? formatDateTime(lastUpdated) : 'Unknown'}</td>
      `;
      
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error rendering cache table:', error);
    tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error rendering cache data</td></tr>`;
  }
}

/**
 * Get record count from cache file data
 * @param {Object} file - Cache file object
 * @returns {string} Formatted record count
 */
function getRecordCount(file) {
  if (!file.data) return '0';
  
  // Try to find arrays in the data
  for (const key in file.data) {
    if (Array.isArray(file.data[key])) {
      return file.data[key].length.toString();
    }
  }
  
  // Special cases
  if (file.data.count !== undefined) {
    return file.data.count.toString();
  }
  
  return '1';
}

/**
 * Get date range from cache file data
 * @param {Object} file - Cache file object
 * @returns {Object|null} Date range object with start and end dates
 */
function getDateRange(file) {
  if (!file.data) return null;
  
  // Try to find date information
  if (file.data.timestamp) {
    return {
      start: file.data.timestamp,
      end: file.data.timestamp
    };
  }
  
  // Look for arrays with timestamps
  for (const key in file.data) {
    if (Array.isArray(file.data[key]) && file.data[key].length > 0) {
      const items = file.data[key];
      
      // Try to find timestamp fields
      if (items[0].timestamp || items[0].date) {
        // Sort by timestamp
        const sorted = [...items].sort((a, b) => {
          const aTime = a.timestamp || new Date(a.date).getTime() / 1000;
          const bTime = b.timestamp || new Date(b.date).getTime() / 1000;
          return aTime - bTime;
        });
        
        const oldest = sorted[0];
        const newest = sorted[sorted.length - 1];
        
        return {
          start: oldest.timestamp || oldest.date,
          end: newest.timestamp || newest.date
        };
      }
    }
  }
  
  return null;
}
