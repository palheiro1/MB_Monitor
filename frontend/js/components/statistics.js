/**
 * Statistics Component
 * 
 * Handles updating statistics numbers in the dashboard
 */

import { formatNumber } from '../utils/formatters.js';

/**
 * Update the statistics counters in the UI
 * @param {Object} data - Stats data from API
 */
export function updateStats(data) {
  // Get current period for logging
  const currentPeriod = window.getState ? window.getState('currentPeriod') : 'unknown';
  console.log(`Updating stats for period: ${currentPeriod}`);
  
  // Update trades count - now using totalQuantity instead of count
  if (data.tradesData) {
    const tradesElement = document.getElementById('total-trades');
    if (tradesElement) {
      const ardorTrades = data.tradesData.totalQuantity || 0;
      const polygonTrades = data.tradesData.polygon_totalQuantity || 0;
      tradesElement.textContent = formatNumber(ardorTrades + polygonTrades);
      console.log(`Updated trades display: ${formatNumber(ardorTrades + polygonTrades)} cards traded [${currentPeriod}]`);
    }
  }

  // Update users count - ensure we display the correct active users count
  if (data.usersData) {
    const usersElement = document.getElementById('active-users');
    if (usersElement) {
      const prevValue = usersElement.textContent;
      const activeUsers = data.usersData.count || 0;
      usersElement.textContent = formatNumber(activeUsers);
      
      console.log(`Updated active users display: ${prevValue} → ${formatNumber(activeUsers)} [${currentPeriod}]`);
    }
  }

  // Update crafts count - use totalCrafted instead of count
  if (data.craftsData) {
    const craftsElement = document.getElementById('card-crafts');
    if (craftsElement) {
      const craftsCount = data.craftsData.totalQuantity || 0;
      craftsElement.textContent = formatNumber(craftsCount);
      console.log(`Updated crafts display: ${formatNumber(craftsCount)} cards crafted [${currentPeriod}]`);
    }
  }

  // Update burns count - use totalBurned instead of count
  if (data.burnsData) {
    const burnsElement = document.getElementById('card-burns');
    if (burnsElement) {
      const burnsCount = data.burnsData.totalQuantity || 0;
      burnsElement.textContent = formatNumber(burnsCount);
      console.log(`Updated burns display: ${formatNumber(burnsCount)} cards burned [${currentPeriod}]`);
    }
  }

  // Update giftz sales count - use totalQuantity instead of count
  if (data.giftzData) {
    const giftzElement = document.getElementById('giftz-sales');
    if (giftzElement) {
      const prevValue = giftzElement.textContent;
      const salesCount = data.giftzData.totalQuantity || 0;
      giftzElement.textContent = formatNumber(salesCount);
      
      console.log(`Updated giftz sales display: ${prevValue} → ${formatNumber(salesCount)} tokens sold [${currentPeriod}]`);
    }
  }

  // Update morphs count - use totalMorphed instead of count
  if (data.morphsData) {
    const morphsElement = document.getElementById('card-morphs');
    if (morphsElement) {
      const prevValue = morphsElement.textContent;
      const morphsCount = data.morphsData.totalQuantity || 0;
      morphsElement.textContent = formatNumber(morphsCount);
      
      console.log(`Updated morphs display: ${prevValue} → ${formatNumber(morphsCount)} cards morphed [${currentPeriod}]`);
    }
  }
}
