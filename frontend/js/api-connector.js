/**
 * @deprecated This file is being phased out in favor of frontend/js/api/blockchain-client.js.
 * Please use the new component for all new development.
 * This file will be removed in a future update.
 */

/**
 * API Connector
 * 
 * Connects the new API client to the legacy app.
 * This is a transition helper to allow gradual migration.
 */

import { apiRequest, getTrades, getBurns, getCrafts } from './api/api-client.js';

/**
 * Fetch trades and update the UI using the legacy display function
 * @param {Function} displayFn - Legacy display function
 * @param {string} period - Time period
 */
export async function fetchTradesAndDisplay(displayFn, period = '30d') {
  try {
    const tradesData = await getTrades(period);
    
    // Update counter first
    const counterEl = document.getElementById('total-trades');
    if (counterEl && tradesData && tradesData.ardor_trades) {
      const count = tradesData.count || tradesData.ardor_trades.length;
      counterEl.textContent = count.toLocaleString();
    }
    
    // Use the legacy display function with our data
    if (typeof displayFn === 'function') {
      displayFn(tradesData.ardor_trades || []);
    }
    
    return tradesData;
  } catch (error) {
    console.error('Error in fetchTradesAndDisplay:', error);
    return { ardor_trades: [] };
  }
}

/**
 * Fetch burns and update the UI using the legacy display function
 * @param {Function} displayFn - Legacy display function
 * @param {string} period - Time period
 */
export async function fetchBurnsAndDisplay(displayFn, period = '30d') {
  try {
    const burnsData = await getBurns(period);
    
    // Update counter
    const counterEl = document.getElementById('card-burns');
    if (counterEl && burnsData && burnsData.burns) {
      const count = burnsData.count || calculateTotalCardsBurned(burnsData.burns);
      counterEl.textContent = count.toLocaleString();
    }
    
    // Use the legacy display function with our data
    if (typeof displayFn === 'function') {
      displayFn(burnsData.burns || []);
    }
    
    return burnsData;
  } catch (error) {
    console.error('Error in fetchBurnsAndDisplay:', error);
    return { burns: [] };
  }
}

/**
 * Fetch crafts and update the UI using the legacy display function
 * @param {Function} displayFn - Legacy display function
 * @param {string} period - Time period
 */
export async function fetchCraftsAndDisplay(displayFn, period = '30d') {
  try {
    const craftsData = await getCrafts(period);
    
    // Update counter
    const counterEl = document.getElementById('card-crafts');
    if (counterEl && craftsData && craftsData.craftings) {
      const count = craftsData.count || craftsData.craftings.length;
      counterEl.textContent = count.toLocaleString();
    }
    
    // Use the legacy display function with our data
    if (typeof displayFn === 'function') {
      displayFn(craftsData.craftings || []);
    }
    
    return craftsData;
  } catch (error) {
    console.error('Error in fetchCraftsAndDisplay:', error);
    return { craftings: [] };
  }
}

/**
 * Calculate total number of cards burned
 * @param {Array} burns - Array of burn objects
 * @returns {number} - Total number of cards burned
 */
function calculateTotalCardsBurned(burns) {
  if (!burns || !Array.isArray(burns)) return 0;
  
  return burns.reduce((total, burn) => {
    // Parse the quantity as an integer - it might be stored as a string in the JSON
    const quantity = parseInt(burn.quantityQNT || burn.quantityFormatted || '1', 10);
    return total + quantity;
  }, 0);
}
