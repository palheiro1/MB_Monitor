/**
 * Transactions Components Index
 * 
 * Orchestrates rendering of all transaction types.
 * Provides a unified interface for rendering and finding new transactions.
 */

import { getState } from '../../state/index.js';
import { getElement } from '../ui-manager.js';
import { renderTradeCards, findNewTrades } from './trades.js';
import { renderPolygonTradeCards, findNewPolygonTransfers } from './polygon-trades.js';
import { renderPolygonUserCards, findNewPolygonUsers } from './polygon-users.js';
import { renderGiftzCards, findNewGiftzSales } from './giftz.js';
import { renderCraftCards, findNewCrafts } from './crafts.js';
import { renderMorphCards, findNewMorphs } from './morphs.js';
import { renderBurnCards, findNewBurns } from './burns.js';
import { renderUserCards, findNewUsers } from './users.js';
import { initAssetsComponent } from './assets.js';

// Make sure to export the crafting-related functions
export { renderCraftCards, findNewCrafts } from './crafts.js';

/**
 * Initialize all transaction components
 */
export function initTransactionComponents() {
  // Initialize the assets component
  try {
    initAssetsComponent();
  } catch (err) {
    console.error('Failed to initialize assets component:', err);
  }
}

/**
 * Safely render a component with error handling
 * @param {Function} renderFunc - Rendering function
 * @param {Array} data - Data to render
 * @param {HTMLElement} container - Container element
 * @param {Array} newItemIds - IDs of new items
 * @param {string} componentName - Name for error logging
 */
function safeRender(renderFunc, data, container, newItemIds, componentName) {
  if (!container) {
    console.warn(`Container for ${componentName} not found`);
    return;
  }
  
  try {
    console.log(`Rendering ${componentName} with ${Array.isArray(data) ? data.length : 'unknown'} items`);
    renderFunc(data || [], container, newItemIds || []);
  } catch (error) {
    console.error(`Error rendering ${componentName}:`, error);
    // Show error in the container for visibility
    container.innerHTML = `
      <div class="alert alert-danger">
        <strong>Error rendering ${componentName}:</strong> ${error.message}
      </div>
      <div class="text-center p-4 text-muted">
        Check the console for detailed error information
      </div>
    `;
  }
}

/**
 * Render all transaction cards with animation for new items
 * Also handles finding and highlighting new transactions
 */
export function renderAllCardsWithAnimation() {
  console.log('renderAllCardsWithAnimation called');
  
  const tradesData = getState('currentData.tradesData') || {};
  const giftzData = getState('currentData.giftzData') || {};
  const craftsData = getState('currentData.craftsData') || {};
  const morphsData = getState('currentData.morphsData') || {};
  const burnsData = getState('currentData.burnsData') || {};
  const usersData = getState('currentData.usersData') || {};
  
  // Debug the craftsData structure to understand what's available
  console.log('Crafts data structure:', {
    hasData: !!craftsData,
    keys: Object.keys(craftsData),
    craftsArray: Array.isArray(craftsData.crafts),
    craftsLength: craftsData.crafts?.length,
    craftings: craftsData.craftings?.length,  // Check if it's using 'craftings' property instead
    count: craftsData.count
  });
  
  // Use correct property for crafts (either 'crafts' or 'craftings')
  const craftsList = craftsData.crafts || craftsData.craftings || [];
  
  console.log('Data available for rendering:', {
    ardorTrades: tradesData.ardor_trades?.length || 0,
    morphs: morphsData.morphs?.length || 0,
    crafts: craftsList.length,
    burns: burnsData.burns?.length || 0
  });
  
  // Previous data for comparison
  const prevData = getState('previousData') || {};
  
  // Get arrays of new item IDs
  const newArdorTrades = findNewTrades(
    prevData.tradesData?.ardor_trades || [], 
    tradesData.ardor_trades || []
  );
  
  const newPolygonTrades = findNewPolygonTransfers(
    prevData.tradesData?.polygon_trades || [], 
    tradesData.polygon_trades || []
  );
  
  const newGiftzSales = findNewGiftzSales(
    prevData.giftzData?.sales || [], 
    giftzData.sales || []
  );
  
  const newCrafts = findNewCrafts(
    prevData.craftsData?.crafts || prevData.craftsData?.craftings || [], 
    craftsList
  );
  
  const newMorphs = findNewMorphs(
    prevData.morphsData?.morphs || [], 
    morphsData.morphs || []
  );
  
  const newBurns = findNewBurns(
    prevData.burnsData?.burns || [], 
    burnsData.burns || []
  );
  
  const newUsers = findNewUsers(
    prevData.usersData?.ardor_users || [], 
    usersData.ardor_users || []
  );
  
  const newPolygonUsers = findNewPolygonUsers(
    prevData.usersData?.polygon_users || [], 
    usersData.polygon_users || []
  );
  
  // Log container elements
  const containers = {
    ardorTrades: document.getElementById('ardor-trades-cards'),
    morphs: document.getElementById('morphs-cards'),
    crafts: document.getElementById('crafts-cards'),
    burns: document.getElementById('burns-cards')
  };
  
  console.log('Container elements found:', {
    ardorTrades: !!containers.ardorTrades,
    morphs: !!containers.morphs,
    crafts: !!containers.crafts,
    burns: !!containers.burns
  });
  
  // Render each type of transaction cards with safety wrappers
  safeRender(
    renderTradeCards, 
    tradesData.ardor_trades, 
    getElement('ardor-trades-cards'),
    newArdorTrades,
    'Ardor Trades'
  );
  
  safeRender(
    renderPolygonTradeCards, 
    tradesData.polygon_trades, 
    getElement('polygon-trades-cards'),
    newPolygonTrades,
    'Polygon Trades'
  );
  
  safeRender(
    renderGiftzCards, 
    giftzData.sales, 
    getElement('giftz-cards'),
    newGiftzSales,
    'Giftz Sales'
  );
  
  safeRender(
    renderCraftCards, 
    craftsList, 
    getElement('crafts-cards'),
    newCrafts,
    'Crafts'
  );
  
  safeRender(
    renderMorphCards, 
    morphsData.morphs, 
    getElement('morphs-cards'),
    newMorphs,
    'Morphs'
  );
  
  safeRender(
    renderBurnCards, 
    burnsData.burns, 
    getElement('burns-cards'),
    newBurns,
    'Burns'
  );
  
  // Make sure users data is an array
  const ardorUsers = Array.isArray(usersData.ardor_users) ? usersData.ardor_users : [];
  const polygonUsers = Array.isArray(usersData.polygon_users) ? usersData.polygon_users : [];
  
  safeRender(
    renderUserCards,
    ardorUsers, 
    getElement('ardor-users-cards'),
    newUsers,
    'Ardor Users'
  );
  
  safeRender(
    renderPolygonUserCards,
    polygonUsers, 
    getElement('polygon-users-cards'),
    newPolygonUsers,
    'Polygon Users'
  );
  
  // Return stats about new items
  return {
    ardorTrades: newArdorTrades.length,
    polygonTrades: newPolygonTrades.length,
    giftzSales: newGiftzSales.length,
    crafts: newCrafts.length,
    morphs: newMorphs.length,
    burns: newBurns.length,
    ardorUsers: newUsers.length,
    polygonUsers: newPolygonUsers.length,
    total: newArdorTrades.length + newPolygonTrades.length + newGiftzSales.length +
           newCrafts.length + newMorphs.length + newBurns.length + 
           newUsers.length + newPolygonUsers.length
  };
}

/**
 * Render all transaction cards without animation
 * Used for regular updates and filtering
 */
export function renderAllCards() {
  const tradesData = getState('currentData.tradesData') || {};
  const giftzData = getState('currentData.giftzData') || {};
  const craftsData = getState('currentData.craftsData') || {};
  const morphsData = getState('currentData.morphsData') || {};
  const burnsData = getState('currentData.burnsData') || {};
  const usersData = getState('currentData.usersData') || {};
  
  // Use correct property for crafts (either 'crafts' or 'craftings')
  const craftsList = craftsData.crafts || craftsData.craftings || [];
  
  // Render each type of transaction cards without animations
  renderTradeCards(
    tradesData.ardor_trades || [], 
    getElement('ardor-trades-cards'), // Fix: Use hyphenated ID to match HTML
    []
  );
  
  renderPolygonTradeCards(
    tradesData.polygon_trades || [], 
    getElement('polygon-trades-cards'), // Fix: Use hyphenated ID to match HTML
    []
  );
  
  renderGiftzCards(
    giftzData.sales || [], 
    getElement('giftz-cards'), // Fix: Use hyphenated ID to match HTML
    []
  );
  
  renderCraftCards(
    craftsList, 
    getElement('crafts-cards'), // Fix: Use hyphenated ID to match HTML
    []
  );
  
  renderMorphCards(
    morphsData.morphs || [], 
    getElement('morphs-cards'), // Fix: Use hyphenated ID to match HTML
    []
  );
  
  renderBurnCards(
    burnsData.burns || [], 
    getElement('burns-cards'), // Fix: Use hyphenated ID to match HTML
    []
  );
  
  renderUserCards(
    usersData.ardor_users || [], 
    getElement('ardor-users-cards'), // Fix: Use hyphenated ID to match HTML
    []
  );
  
  renderPolygonUserCards(
    usersData.polygon_users || [], 
    getElement('polygon-users-cards'), // Fix: Use hyphenated ID to match HTML
    []
  );
}

/**
 * Get count of entities by type
 * @returns {Object} Counts of each entity type
 */
export function getTransactionCounts() {
  const tradesData = getState('currentData.tradesData') || {};
  const giftzData = getState('currentData.giftzData') || {};
  const craftsData = getState('currentData.craftsData') || {};
  const morphsData = getState('currentData.morphsData') || {};
  const burnsData = getState('currentData.burnsData') || {};
  const usersData = getState('currentData.usersData') || {};
  const assetsData = getState('currentData.assetsData') || {};
  
  return {
    ardorTrades: (tradesData.ardor_trades || []).length,
    polygonTrades: (tradesData.polygon_trades || []).length,
    giftzSales: (giftzData.sales || []).length,
    crafts: (craftsData.crafts || craftsData.craftings || []).length,
    morphs: (morphsData.morphs || []).length,
    burns: (burnsData.burns || []).length,
    ardorUsers: (usersData.ardor_users || []).length,
    polygonUsers: (usersData.polygon_users || []).length,
    ardorAssets: assetsData?.ardor ? (
      (assetsData.ardor.regularCards?.length || 0) +
      (assetsData.ardor.specialCards?.length || 0) +
      (assetsData.ardor.specificTokens?.length || 0)
    ) : 0,
    polygonAssets: assetsData?.polygon?.tokens?.length || 0
  };
}
