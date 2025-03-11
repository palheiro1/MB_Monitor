/**
 * Cache Dashboard
 * 
 * Provides UI for monitoring and managing the application cache
 */
import { fetchCacheStats, clearAllCaches, clearSpecificCache } from './api/cache-api.js';

// Elements 
let fileCacheTable;
let memoryCacheTable;
let refreshButton;
let clearAllButton;

/**
 * Initialize cache dashboard
 */
export function initCacheDashboard() {
  // Get UI elements
  fileCacheTable = document.getElementById('file-cache-table');
  memoryCacheTable = document.getElementById('memory-cache-table');
  refreshButton = document.getElementById('refresh-cache');
  clearAllButton = document.getElementById('clear-all-caches');
  
  // Set up event listeners
  if (refreshButton) {
    refreshButton.addEventListener('click', loadCacheStats);
  }
  
  if (clearAllButton) {
    clearAllButton.addEventListener('click', handleClearAllCaches);
  }
  
  // Load initial data
  loadCacheStats();
  
  // Set up periodic refresh
  setInterval(loadCacheStats, 30000); // Refresh every 30 seconds
}

/**
 * Load cache statistics
 */
async function loadCacheStats() {
  try {
    const stats = await fetchCacheStats();
    renderFileCacheTable(stats.files);
    renderMemoryCacheTable(stats.memoryStats);
    updateLastUpdatedTime();
  } catch (error) {
    console.error('Failed to load cache stats:', error);
    showError('Failed to load cache statistics');
  }
}

/**
 * Render file cache table
 */
function renderFileCacheTable(files) {
  if (!fileCacheTable) return;
  
  const tbody = fileCacheTable.querySelector('tbody');
  if (!tbody) return;
  
  // Clear existing rows
  tbody.innerHTML = '';
  
  if (!files || files.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center">No cache files found</td></tr>`;
    return;
  }
  
  // Sort files by name
  const sortedFiles = [...files].sort((a, b) => a.filename.localeCompare(b.filename));
  
  // Generate rows
  sortedFiles.forEach(file => {
    const row = document.createElement('tr');
    
    row.innerHTML = `
      <td>${file.filename}</td>
      <td>${file.recordCount || 0}</td>
      <td>${formatFileSize(file.size)}</td>
      <td>${file.modified ? formatDate(new Date(file.modified)) : 'Unknown'}</td>
      <td>
        <button class="btn btn-sm btn-danger clear-cache-btn" data-cache-key="${file.key}">
          <i class="fas fa-trash-alt"></i>
        </button>
      </td>
    `;
    
    tbody.appendChild(row);
    
    // Add event listener to the clear button
    const clearBtn = row.querySelector('.clear-cache-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => handleClearSpecificCache(file.key));
    }
  });
}

/**
 * Render memory cache table
 */
function renderMemoryCacheTable(memoryStats) {
  if (!memoryCacheTable) return;
  
  const tbody = memoryCacheTable.querySelector('tbody');
  if (!tbody) return;
  
  // Clear existing rows
  tbody.innerHTML = '';
  
  if (!memoryStats) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center">No memory cache stats available</td></tr>`;
    return;
  }
  
  // Generate rows for each cache type
  Object.entries(memoryStats).forEach(([type, stats]) => {
    const row = document.createElement('tr');
    
    row.innerHTML = `
      <td>${type}</td>
      <td>${stats.size}</td>
      <td>${stats.validItems}</td>
      <td>${formatFileSize(stats.approximateSizeBytes || 0)}</td>
      <td>${stats.hits}/${stats.misses} (${stats.hitRatio})</td>
      <td>${formatDate(new Date(stats.lastCleanup))}</td>
    `;
    
    tbody.appendChild(row);
  });
}

/**
 * Handle clearing all caches
 */
async function handleClearAllCaches() {
  if (!confirm('Are you sure you want to clear all caches?')) {
    return;
  }
  
  try {
    await clearAllCaches();
    showSuccess('All caches cleared successfully');
    loadCacheStats(); // Refresh stats
  } catch (error) {
    console.error('Failed to clear all caches:', error);
    showError('Failed to clear caches');
  }
}

/**
 * Handle clearing a specific cache
 */
async function handleClearSpecificCache(cacheKey) {
  if (!confirm(`Are you sure you want to clear cache: ${cacheKey}?`)) {
    return;
  }
  
  try {
    await clearSpecificCache(cacheKey);
    showSuccess(`Cache ${cacheKey} cleared successfully`);
    loadCacheStats(); // Refresh stats
  } catch (error) {
    console.error(`Failed to clear cache ${cacheKey}:`, error);
    showError('Failed to clear cache');
  }
}

/**
 * Update last updated time
 */
function updateLastUpdatedTime() {
  const element = document.getElementById('last-updated-time');
  if (element) {
    element.textContent = formatDate(new Date());
  }
}

/**
 * Show success message
 */
function showSuccess(message) {
  // Implementation depends on your UI framework
  console.log('Success:', message);
  
  // Example using a toast/alert component
  if (window.showToast) {
    window.showToast(message, 'success');
  }
}

/**
 * Show error message
 */
function showError(message) {
  // Implementation depends on your UI framework
  console.error('Error:', message);
  
  // Example using a toast/alert component
  if (window.showToast) {
    window.showToast(message, 'error');
  }
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format date
 */
function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}
