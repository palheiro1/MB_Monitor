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
  initAssetsComponent();
}

/**
 * Render all transaction cards with animation for new items
 * Also handles finding and highlighting new transactions
 */
export function renderAllCardsWithAnimation() {
  const tradesData = getState('currentData.tradesData') || {};
  const giftzData = getState('currentData.giftzData') || {};
  const craftsData = getState('currentData.craftsData') || {};
  const morphsData = getState('currentData.morphsData') || {};
  const burnsData = getState('currentData.burnsData') || {};
  const usersData = getState('currentData.usersData') || {};
  
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
    prevData.craftsData?.crafts || [], 
    craftsData.crafts || []
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
  
  // Render each type of transaction cards
  renderTradeCards(
    tradesData.ardor_trades || [], 
    getElement('ardorTradesCards'), 
    newArdorTrades
  );
  
  // Use the specialized Polygon renderer for Polygon trades
  renderPolygonTradeCards(
    tradesData.polygon_trades || [], 
    getElement('polygonTradesCards'), 
    newPolygonTrades
  );
  
  renderGiftzCards(
    giftzData.sales || [], 
    getElement('giftzCards'), 
    newGiftzSales
  );
  
  renderCraftCards(
    craftsData.crafts || [], 
    getElement('craftsCards'), 
    newCrafts
  );
  
  renderMorphCards(
    morphsData.morphs || [], 
    getElement('morphsCards'), 
    newMorphs
  );
  
  renderBurnCards(
    burnsData.burns || [], 
    getElement('burnsCards'), 
    newBurns
  );
  
  renderUserCards(
    usersData.ardor_users || [], 
    getElement('ardorUsersCards'), 
    newUsers
  );
  
  // Use the specialized Polygon renderer for Polygon users
  renderPolygonUserCards(
    usersData.polygon_users || [], 
    getElement('polygonUsersCards'), 
    newPolygonUsers
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
  
  // Render each type of transaction cards without animations
  renderTradeCards(
    tradesData.ardor_trades || [], 
    getElement('ardorTradesCards'), 
    []
  );
  
  renderPolygonTradeCards(
    tradesData.polygon_trades || [], 
    getElement('polygonTradesCards'), 
    []
  );
  
  renderGiftzCards(
    giftzData.sales || [], 
    getElement('giftzCards'), 
    []
  );
  
  renderCraftCards(
    craftsData.crafts || [], 
    getElement('craftsCards'), 
    []
  );
  
  renderMorphCards(
    morphsData.morphs || [], 
    getElement('morphsCards'), 
    []
  );
  
  renderBurnCards(
    burnsData.burns || [], 
    getElement('burnsCards'), 
    []
  );
  
  renderUserCards(
    usersData.ardor_users || [], 
    getElement('ardorUsersCards'), 
    []
  );
  
  renderPolygonUserCards(
    usersData.polygon_users || [], 
    getElement('polygonUsersCards'), 
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
    crafts: (craftsData.crafts || []).length,
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
