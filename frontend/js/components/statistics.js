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
  // Update trades count
  if (data.tradesData) {
    const tradesElement = document.getElementById('total-trades');
    if (tradesElement) {
      const ardorTrades = data.tradesData.count || 0;
      const polygonTrades = data.tradesData.polygon_trades?.length || 0;
      tradesElement.textContent = formatNumber(ardorTrades + polygonTrades);
    }
  }

  // Update users count
  if (data.usersData) {
    const usersElement = document.getElementById('active-users');
    if (usersElement) {
      const ardorUsers = data.usersData.ardor_users?.length || 0;
      const polygonUsers = data.usersData.polygon_users?.length || 0;
      usersElement.textContent = formatNumber(ardorUsers + polygonUsers);
    }
  }

  // Update crafts count
  if (data.craftsData) {
    const craftsElement = document.getElementById('card-crafts');
    if (craftsElement) {
      craftsElement.textContent = formatNumber(data.craftsData.count || 0);
    }
  }

  // Update burns count
  if (data.burnsData) {
    const burnsElement = document.getElementById('card-burns');
    if (burnsElement) {
      burnsElement.textContent = formatNumber(data.burnsData.count || 0);
    }
  }

  // Update giftz sales count
  if (data.giftzData) {
    const giftzElement = document.getElementById('giftz-sales');
    if (giftzElement) {
      giftzElement.textContent = formatNumber(data.giftzData.count || 0);
    }
  }

  // Update morphs count
  if (data.morphsData) {
    const morphsElement = document.getElementById('card-morphs');
    if (morphsElement) {
      morphsElement.textContent = formatNumber(data.morphsData.count || 0);
    }
  }
}
