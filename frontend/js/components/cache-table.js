/**
 * Cache Table Component
 * 
 * Handles rendering the cache statistics table in the debug section.
 */

import { getState } from '../state/index.js';
import { formatNumber, formatFileSize, formatDateRange, formatDateTime } from '../utils/formatters.js';
import { getElement } from './ui-manager.js';

/**
 * Render cache statistics table
 */
export function renderCacheTable() {
  const cacheFiles = getState('currentData.cacheData')?.cache_files || [];
  const tableBody = getElement('cacheStatsTable')?.querySelector('tbody');
  
  if (!tableBody) return;
  
  if (cacheFiles.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" class="text-center">No cache files found</td></tr>`;
    return;
  }
  
  let tableHtml = '';
  cacheFiles.forEach(file => {
    tableHtml += `
      <tr>
        <td>${file.name}</td>
        <td>${formatNumber(file.records)}</td>
        <td>${formatFileSize(file.size)}</td>
        <td>${formatDateRange(file.date_range)}</td>
        <td>${formatDateTime(file.last_updated)}</td>
      </tr>
    `;
  });
  
  tableBody.innerHTML = tableHtml;
}

/**
 * Get cache statistics summary
 * @returns {Object} Summary of cache statistics
 */
export function getCacheStatsSummary() {
  const cacheFiles = getState('currentData.cacheData')?.cache_files || [];
  
  // Calculate total size and records
  let totalSize = 0;
  let totalRecords = 0;
  let oldestUpdate = null;
  let newestUpdate = null;
  
  cacheFiles.forEach(file => {
    totalSize += file.size || 0;
    totalRecords += file.records || 0;
    
    const updated = new Date(file.last_updated).getTime();
    if (!oldestUpdate || updated < oldestUpdate) {
      oldestUpdate = updated;
    }
    if (!newestUpdate || updated > newestUpdate) {
      newestUpdate = updated;
    }
  });
  
  return {
    fileCount: cacheFiles.length,
    totalSize,
    formattedSize: formatFileSize(totalSize),
    totalRecords,
    formattedRecords: formatNumber(totalRecords),
    oldestUpdate: oldestUpdate ? new Date(oldestUpdate).toISOString() : null,
    newestUpdate: newestUpdate ? new Date(newestUpdate).toISOString() : null
  };
}
