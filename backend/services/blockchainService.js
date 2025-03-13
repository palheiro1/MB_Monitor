/**
 * Unified Blockchain Service
 * 
 * A single service module for interacting with multiple blockchains (Ardor, Polygon).
 * Centralizes blockchain operations and avoids duplication across services.
 */

const axios = require('axios');
const { readJSON, writeJSON } = require('../utils/jsonStorage');
const { ARDOR_API_URL, ARDOR_FALLBACK_API_URL, POLYGON_API_URL, ALCHEMY_API_URL, ALCHEMY_API_KEY, MB_CONTRACT_ADDRESS } = require('../config');
const { logApiNodeInfo } = require('../utils/apiUtils');
const { filterByPeriod } = require('../utils/filters');

// Import specific chain services
const ardorTradesService = require('./ardor/trades');
const ardorSalesService = require('./ardor/sales');
const ardorCraftingsService = require('./ardor/crafting');
const ardorMorphingsService = require('./ardor/morphing');
const ardorBurnsService = require('./ardor/burns');
const ardorUsersService = require('./ardor/users');
const ardorAssetsService = require('./ardor/assets');
const ardorGiftzService = require('./ardor/giftz');

const polygonTradesService = require('./polygon/trades');
const polygonTokensService = require('./polygon/tokens');
const polygonUsersService = require('./polygon/users');

/**
 * Initialize blockchain service
 */
async function init() {
  console.log('Initializing unified blockchain service...');
  
  try {
    // Check Ardor node connectivity
    const ardorConnected = await checkArdorConnectivity();
    if (!ardorConnected) {
      console.warn('Warning: Unable to connect to Ardor node, using fallback');
    }
    
    // Check Polygon service connectivity
    const polygonConnected = await checkPolygonConnectivity();
    if (!polygonConnected) {
      console.warn('Warning: Unable to connect to Polygon API');
    }
    
    // Pre-load initial data
    console.log('Pre-loading blockchain data...');
    Promise.all([
      // Load assets data
      getTrackedAssets(true).catch(err => console.error('Failed to load assets:', err)),
      // Load trades data for 'all' period
      getTrades('all', true).catch(err => console.error('Failed to load trades:', err)),
      // Load burns data
      getCardBurns('all', true).catch(err => console.error('Failed to load burns:', err))
    ]).then(() => {
      console.log('Initial blockchain data pre-loading complete');
    });
    
    return { ardorConnected, polygonConnected };
  } catch (error) {
    console.error('Error initializing blockchain service:', error);
    return { ardorConnected: false, polygonConnected: false };
  }
}

/**
 * Check Ardor node connectivity
 * @returns {Promise<boolean>} Whether connection successful
 */
async function checkArdorConnectivity() {
  try {
    const response = await axios.get(`${ARDOR_API_URL}?requestType=getBlockchainStatus`);
    const connected = response.data && response.data.application === 'Ardor';
    return connected;
  } catch (error) {
    console.error('Ardor node connectivity check failed:', error.message);
    return false;
  }
}

/**
 * Check Polygon API connectivity
 * @returns {Promise<boolean>} Whether connection successful
 */
async function checkPolygonConnectivity() {
  try {
    const response = await axios.get(`${POLYGON_API_URL}?module=proxy&action=eth_blockNumber&apikey=${ALCHEMY_API_KEY}`);
    const connected = response.data && response.data.status === '1';
    return connected;
  } catch (error) {
    console.error('Polygon API connectivity check failed:', error.message);
    return false;
  }
}

// Unified functions that combine data from multiple blockchains

/**
 * Get trades from all blockchains
 * @param {string} period - Time period filter
 * @param {boolean} forceRefresh - Whether to force refresh from blockchain
 * @returns {Promise<Object>} Combined trades data
 */
async function getTrades(period = '30d', forceRefresh = false) {
  // Try to get from cache first
  const cachedData = readJSON('combined_trades');
  if (!forceRefresh && cachedData) {
    // Filter by period if needed
    if (period !== 'all') {
      return filterTradesByPeriod(cachedData, period);
    }
    return cachedData;
  }
  
  try {
    // Get trades from all chains in parallel
    const [ardorTrades, polygonTrades] = await Promise.all([
      ardorTradesService.getTrades(period, forceRefresh),
      polygonTradesService.getTrades(period, forceRefresh)
    ]);
    
    // Combine results
    const combinedTrades = {
      ardor_trades: ardorTrades?.trades || [],
      polygon_trades: polygonTrades?.trades || [],
      totalTrades: (ardorTrades?.trades?.length || 0) + (polygonTrades?.trades?.length || 0),
      timestamp: new Date().toISOString()
    };
    
    // Cache the combined result
    writeJSON('combined_trades', combinedTrades);
    
    // Filter by period if needed
    if (period !== 'all') {
      return filterTradesByPeriod(combinedTrades, period);
    }
    
    return combinedTrades;
  } catch (error) {
    console.error('Error getting trades:', error);
    // Return cached data as fallback
    return cachedData || { ardor_trades: [], polygon_trades: [], totalTrades: 0 };
  }
}

/**
 * Filter trades data by specified period
 * @param {Object} tradesData - Trades data
 * @param {string} period - Time period
 * @returns {Object} Filtered trades data
 */
function filterTradesByPeriod(tradesData, period) {
  if (!tradesData || period === 'all') return tradesData;
  
  const ardorFiltered = tradesData.ardor_trades ? 
    filterByPeriod(tradesData.ardor_trades, period, 'timestamp') : [];
    
  const polygonFiltered = tradesData.polygon_trades ? 
    filterByPeriod(tradesData.polygon_trades, period, 'timestamp') : [];
    
  return {
    ardor_trades: ardorFiltered,
    polygon_trades: polygonFiltered,
    totalTrades: ardorFiltered.length + polygonFiltered.length,
    timestamp: tradesData.timestamp
  };
}

/**
 * Get card burns data
 * @param {string} period - Time period filter
 * @param {boolean} forceRefresh - Whether to force refresh from blockchain
 * @returns {Promise<Object>} Burns data
 */
async function getCardBurns(period = '30d', forceRefresh = false) {
  return ardorBurnsService.getCardBurns(period, forceRefresh);
}

/**
 * Get crafting data
 * @param {string} period - Time period filter
 * @param {boolean} forceRefresh - Whether to force refresh from blockchain
 * @returns {Promise<Object>} Craftings data
 */
async function getCraftings(period = '30d', forceRefresh = false) {
  return ardorCraftingsService.getCraftings(period, forceRefresh);
}

/**
 * Get morphing data
 * @param {string} period - Time period filter
 * @param {boolean} forceRefresh - Whether to force refresh from blockchain
 * @returns {Promise<Object>} Morphings data
 */
async function getMorphings(period = '30d', forceRefresh = false) {
  return ardorMorphingsService.getMorphings(period, forceRefresh);
}

/**
 * Get primary sales data
 * @param {string} period - Time period filter
 * @param {boolean} forceRefresh - Whether to force refresh from blockchain
 * @returns {Promise<Object>} Sales data
 */
async function getPrimarySales(period = '30d', forceRefresh = false) {
  return ardorSalesService.getPrimarySales(period, forceRefresh);
}

/**
 * Get GIFTZ sales data
 * @param {string} period - Time period filter
 * @param {boolean} forceRefresh - Whether to force refresh from blockchain
 * @returns {Promise<Object>} GIFTZ sales data
 */
async function getGiftzSales(period = '30d', forceRefresh = false) {
  return ardorGiftzService.getGiftzSales(period, forceRefresh);
}

/**
 * Get active users across all blockchains
 * @param {string} period - Time period filter
 * @param {boolean} forceRefresh - Whether to force refresh from blockchain
 * @returns {Promise<Object>} Users data
 */
async function getActiveUsers(period = '30d', forceRefresh = false) {
  try {
    // Get users from all chains in parallel
    const [ardorUsers, polygonUsers] = await Promise.all([
      ardorUsersService.getActiveUsers(period, forceRefresh),
      polygonUsersService.getActiveUsers(period, forceRefresh)
    ]);
    
    // Combine and deduplicate users
    const allAddresses = new Set([
      ...(ardorUsers?.users || []).map(u => u.address),
      ...(polygonUsers?.users || []).map(u => u.address)
    ]);
    
    // Combine results
    const combinedUsers = {
      ardor_users: ardorUsers?.users || [],
      polygon_users: polygonUsers?.users || [],
      totalUsers: allAddresses.size,
      timestamp: new Date().toISOString()
    };
    
    // Cache the combined result
    writeJSON('combined_users', combinedUsers);
    
    return combinedUsers;
  } catch (error) {
    console.error('Error getting users:', error);
    const cachedData = readJSON('combined_users');
    return cachedData || { ardor_users: [], polygon_users: [], totalUsers: 0 };
  }
}

/**
 * Get tracked assets across all blockchains
 * @param {boolean} forceRefresh - Whether to force refresh from blockchain
 * @returns {Promise<Object>} Assets data
 */
async function getTrackedAssets(forceRefresh = false) {
  try {
    // Get assets from all chains in parallel
    const [ardorAssets, polygonTokens] = await Promise.all([
      ardorAssetsService.getTrackedAssets(forceRefresh),
      polygonTokensService.getTrackedTokens(forceRefresh)
    ]);
    
    // Combine results
    const combinedAssets = {
      ardor: ardorAssets,
      polygon: polygonTokens,
      timestamp: new Date().toISOString()
    };
    
    // Cache the combined result
    writeJSON('combined_tracked_assets', combinedAssets);
    
    return combinedAssets;
  } catch (error) {
    console.error('Error getting assets:', error);
    const cachedData = readJSON('combined_tracked_assets');
    return cachedData || { ardor: {}, polygon: {} };
  }
}

/**
 * Get all blockchain data for the specified period
 * @param {string} period - Time period filter
 * @param {boolean} forceRefresh - Whether to force refresh from blockchain
 * @returns {Promise<Object>} Combined blockchain data
 */
async function getAllData(period = '30d', forceRefresh = false) {
  try {
    // Get all data in parallel
    const [trades, burns, craftings, morphings, sales, giftzSales, users, assets] = await Promise.all([
      getTrades(period, forceRefresh),
      getCardBurns(period, forceRefresh),
      getCraftings(period, forceRefresh),
      getMorphings(period, forceRefresh),
      getPrimarySales(period, forceRefresh),
      getGiftzSales(period, forceRefresh),
      getActiveUsers(period, forceRefresh),
      getTrackedAssets(forceRefresh)
    ]);
    
    // Combine all data
    const allData = {
      trades,
      burns,
      craftings,
      morphings,
      sales,
      giftz: giftzSales,
      users,
      assets,
      timestamp: new Date().toISOString()
    };
    
    // Cache the result
    writeJSON('all_blockchain_data', allData);
    
    return allData;
  } catch (error) {
    console.error('Error getting all blockchain data:', error);
    const cachedData = readJSON('all_blockchain_data');
    return cachedData || {};
  }
}

module.exports = {
  init,
  getTrades,
  getCardBurns,
  getCraftings,
  getMorphings,
  getPrimarySales,
  getGiftzSales,
  getActiveUsers,
  getTrackedAssets,
  getAllData
};