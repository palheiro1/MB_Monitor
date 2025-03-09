/**
 * Activity Monitor Component
 * 
 * Monitors for new activity and updates the UI accordingly.
 */

import { getState } from '../state/index.js';
import { showNotification } from './notifications.js';

/**
 * Check for new activity since last data refresh
 * @returns {boolean} Whether new activity was found
 */
export function checkForNewActivity() {
  try {
    // For initial implementation, just check for new trades
    const tradesData = getState('currentData.tradesData');
    const prevTradesData = getState('previousData.tradesData');
    
    if (!tradesData || !prevTradesData) return false;
    
    // Check for new Ardor trades
    const ardorTrades = tradesData.ardor_trades || [];
    const prevArdorTrades = prevTradesData.ardor_trades || [];
    const newArdorTrades = countNewItems(prevArdorTrades, ardorTrades);
    
    // Check for new Polygon trades
    const polygonTrades = tradesData.polygon_trades || [];
    const prevPolygonTrades = prevTradesData.polygon_trades || [];
    const newPolygonTrades = countNewItems(prevPolygonTrades, polygonTrades);
    
    // Check for new crafts
    const craftsData = getState('currentData.craftsData');
    const prevCraftsData = getState('previousData.craftsData');
    const crafts = craftsData?.craftings || [];
    const prevCrafts = prevCraftsData?.craftings || [];
    const newCrafts = countNewItems(prevCrafts, crafts);
    
    // Check for new burns
    const burnsData = getState('currentData.burnsData');
    const prevBurnsData = getState('previousData.burnsData');
    const burns = burnsData?.burns || [];
    const prevBurns = prevBurnsData?.burns || [];
    const newBurns = countNewItems(prevBurns, burns);
    
    // Total new activity
    const totalNew = newArdorTrades + newPolygonTrades + newCrafts + newBurns;
    
    if (totalNew > 0) {
      console.log(`Found ${totalNew} new activities`);
      
      // Show notification if there's new activity
      if (totalNew <= 5) {
        showNotification(
          'New Activity', 
          `Found ${totalNew} new activities`, 
          'info'
        );
      } else {
        showNotification(
          'New Activity', 
          `Found ${totalNew} new activities since last update`, 
          'info'
        );
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking for new activity:', error);
    return false;
  }
}

/**
 * Count new items by comparing arrays
 * @param {Array} prevItems - Previous items
 * @param {Array} currentItems - Current items
 * @returns {number} Count of new items
 */
function countNewItems(prevItems, currentItems) {
  if (!Array.isArray(prevItems) || !Array.isArray(currentItems)) {
    return 0;
  }
  
  if (prevItems.length === 0) {
    return 0; // Don't count items on first load
  }
  
  // Use a Set for O(1) lookups
  const prevIds = new Set();
  prevItems.forEach(item => {
    if (item && item.id) {
      prevIds.add(item.id);
    } else if (item && item.fullHash) {
      prevIds.add(item.fullHash);
    }
  });
  
  // Count items not in the previous set
  let newCount = 0;
  currentItems.forEach(item => {
    if (item) {
      const id = item.id || item.fullHash;
      if (id && !prevIds.has(id)) {
        newCount++;
      }
    }
  });
  
  return newCount;
}
