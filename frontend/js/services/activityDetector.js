/**
 * Activity Detector Service
 * 
 * Monitors for new blockchain activities and provides notifications.
 * This service detects and highlights new transactions that have appeared
 * since the last data refresh.
 */

import { getState } from '../state/index.js';
import { showNotification } from './notifications.js';
import { findNewTrades } from '../components/transactions/trades.js';
import { findNewPolygonTransfers } from '../components/transactions/polygon-trades.js';
import { findNewPolygonUsers } from '../components/transactions/polygon-users.js';
import { findNewGiftzSales } from '../components/transactions/giftz.js';
import { findNewCrafts } from '../components/transactions/crafts.js';
import { findNewMorphs } from '../components/transactions/morphs.js';
import { findNewBurns } from '../components/transactions/burns.js';
import { findNewUsers } from '../components/transactions/users.js';

/**
 * Check for new activity since last update
 * Compares previous data with current data to identify new items
 * Shows notifications and tab badges for new activity
 */
export function checkForNewActivity() {
  // Check if we have previous data to compare with
  const prevData = getState('previousData');
  if (!prevData?.tradesData) return {
    totalNewActivities: 0
  };
  
  const currentData = getState('currentData');
  
  // Check for new trades
  const newArdorTrades = findNewTrades(
    prevData.tradesData?.ardor_trades || [], 
    currentData.tradesData?.ardor_trades || []
  );
  
  const newPolygonTrades = findNewPolygonTransfers(
    prevData.tradesData?.polygon_trades || [], 
    currentData.tradesData?.polygon_trades || []
  );
  
  const newGiftzSales = findNewGiftzSales(
    prevData.giftzData?.sales || [],
    currentData.giftzData?.sales || []
  );
  
  const newCrafts = findNewCrafts(
    prevData.craftsData?.crafts || [],
    currentData.craftsData?.crafts || []
  );
  
  const newMorphs = findNewMorphs(
    prevData.morphsData?.morphs || [],
    currentData.morphsData?.morphs || []
  );
  
  const newBurns = findNewBurns(
    prevData.burnsData?.burns || [],
    currentData.burnsData?.burns || []
  );
  
  const newArdorUsers = findNewUsers(
    prevData.usersData?.ardor_users || [], 
    currentData.usersData?.ardor_users || []
  );
  
  const newPolygonUsers = findNewPolygonUsers(
    prevData.usersData?.polygon_users || [], 
    currentData.usersData?.polygon_users || []
  );
  
  // Count total new activities
  const totalNewActivities = 
    newArdorTrades.length +
    newPolygonTrades.length +
    newGiftzSales.length +
    newCrafts.length +
    newMorphs.length +
    newBurns.length +
    newArdorUsers.length +
    newPolygonUsers.length;
  
  // Show notification if there is new activity
  if (totalNewActivities > 0) {
    showNotification(
      'New Activity Detected', 
      `Found ${totalNewActivities} new activities since last update.`, 
      'info'
    );
  }
  
  // Highlight tabs with new activity
  highlightTabWithNewActivity('ardor-trades-tab', newArdorTrades.length);
  highlightTabWithNewActivity('polygon-trades-tab', newPolygonTrades.length);
  highlightTabWithNewActivity('giftz-tab', newGiftzSales.length);
  highlightTabWithNewActivity('crafts-tab', newCrafts.length);
  highlightTabWithNewActivity('morphs-tab', newMorphs.length);
  highlightTabWithNewActivity('burns-tab', newBurns.length);
  highlightTabWithNewActivity('ardor-users-tab', newArdorUsers.length);
  highlightTabWithNewActivity('polygon-users-tab', newPolygonUsers.length);
  
  return {
    totalNewActivities,
    ardorTrades: newArdorTrades.length,
    polygonTrades: newPolygonTrades.length,
    giftzSales: newGiftzSales.length,
    crafts: newCrafts.length,
    morphs: newMorphs.length,
    burns: newBurns.length,
    ardorUsers: newArdorUsers.length,
    polygonUsers: newPolygonUsers.length
  };
}

/**
 * Highlight tab with notification badge for new activity
 * Adds a count badge to tabs with new content
 * 
 * @param {string} tabId - ID of tab to highlight
 * @param {number} count - Number of new items
 */
function highlightTabWithNewActivity(tabId, count) {
  if (!count) return;
  
  const tab = document.getElementById(tabId);
  if (!tab) return;
  
  // Create or update notification badge
  let badge = tab.querySelector('.notification-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'notification-badge badge rounded-pill bg-danger ms-2 animate__animated animate__fadeIn';
    tab.appendChild(badge);
  }
  
  badge.textContent = count;
  badge.classList.add('pulse-animation');
  
  // Remove pulse animation after a while
  setTimeout(() => {
    if (badge) badge.classList.remove('pulse-animation');
  }, 3000);
  
  // Remove badge when tab is clicked
  tab.addEventListener('click', function onTabClick() {
    if (badge) {
      badge.remove();
    }
    tab.removeEventListener('click', onTabClick);
  }, { once: true });
}
