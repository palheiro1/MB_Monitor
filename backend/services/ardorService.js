/**
 * Ardor Service
 * Central module for all Ardor blockchain interactions
 */

// Import various service modules
const { getTrackedAssets } = require('./ardor/assets');
const { getCardBurns: getOriginalCardBurns } = require('./ardor/burns'); // Rename the import
const { getTrades: getOriginalTrades } = require('./ardor/trades');
const { getCraftings: getOriginalCraftings } = require('./ardor/crafting');
const { getMorphings: getOriginalMorphings } = require('./ardor/morphing');
const { getGiftzSales } = require('./ardor/giftz');
const { getActiveUsers } = require('./ardor/users');
const { CACHE_TTL } = require('../config'); // Add this import
const { readJSON, writeJSON } = require('../utils/jsonStorage');
const cacheService = require('./cacheService');
const { 
  CACHE_PREFIXES,
  createCacheKey, 
  createCacheMetadata,
  filterByPeriod,
  normalizeTimestamp
} = require('../utils/cacheUtils');

// Use the same Ardor epoch constant for consistency
const ARDOR_EPOCH = 1514764800000; // January 1, 2018 00:00:00 UTC in milliseconds

/**
 * Convert Ardor timestamp to JavaScript Date
 * @param {number} timestamp - Ardor timestamp in seconds
 * @returns {Date} JavaScript Date object
 */
function ardorTimestampToDate(timestamp) {
  return new Date(ARDOR_EPOCH + (timestamp * 1000));
}

/**
 * Convert JavaScript Date to Ardor timestamp
 * @param {Date} date - JavaScript Date object
 * @returns {number} Ardor timestamp in seconds
 */
function dateToArdorTimestamp(date) {
  return Math.floor((date.getTime() - ARDOR_EPOCH) / 1000);
}

/**
 * Get all Ardor data combined
 * @returns {Promise<Object>} Combined Ardor data
 */
async function getAllData() {
  try {
    console.log('Fetching all Ardor data...');
    // Check JSON file first
    const cachedData = readJSON('ardor_all_data');
    if (cachedData) return cachedData;

    // Fetch all data in parallel
    const [trades, primarySales, craftings, morphings, cardBurns, gemBurns, activeUsers, trackedAssets, giftzSales] = 
      await Promise.all([
        getTrades(), 
        getPrimarySales(), 
        getCraftings(), 
        getMorphings(), 
        getCardBurns(), 
        getGEMBurns(),
        getActiveUsers(),
        getTrackedAssets(),
        getGiftzSales() // Add this
      ]);

    const allData = {
      trades: trades.count,
      primarySales: primarySales.count,
      craftings: craftings.count,
      morphings: morphings.count,
      cardBurns: cardBurns.count,
      gemBurns: gemBurns.count,
      activeUsers: activeUsers.activeUsers,
      giftzSales: giftzSales.count, // Add this
      trackedAssets: {
        regularCardsCount: trackedAssets.regularCards.length,
        specialCardsCount: trackedAssets.specialCards.length,
        specificTokensCount: trackedAssets.specificTokens.length
      },
      timestamp: new Date().toISOString()
    };

    // Save to JSON file
    writeJSON('ardor_all_data', allData);
    console.log('Fetched all Ardor data:', allData);
    return allData;
  } catch (error) {
    console.error('Error fetching all Ardor data:', error.message);
    throw new Error(`Failed to fetch Ardor data: ${error.message}`);
  }
}

/**
 * Get all card burns with improved caching
 * @param {boolean} forceRefresh - Whether to force a refresh of the cache
 * @returns {Promise<Object>} Burns data
 */
async function getCardBurns(forceRefresh = false) {
  const cacheKey = CACHE_PREFIXES.BURNS;
  
  try {
    // Check cache first unless refresh is forced
    if (!forceRefresh) {
      const cachedData = cacheService.file.read(cacheKey);
      if (cachedData && cacheService.isCacheValid(cachedData)) {
        console.log('Using cached card burns data');
        return cachedData;
      }
    }
    
    console.log('Fetching fresh card burns data');
    // Call the original function from burns.js
    const result = await getOriginalCardBurns(forceRefresh);
    
    if (!result || !result.burns) {
      throw new Error('Failed to fetch burns data');
    }
    
    // Cache the results with proper metadata
    const resultWithMetadata = {
      ...result,
      ...createCacheMetadata(null, result.burns.length)
    };
    
    cacheService.file.write(cacheKey, resultWithMetadata);
    return resultWithMetadata;
  } catch (error) {
    console.error('Error fetching card burns:', error);
    
    // Return cached data on error if available
    const cachedData = cacheService.file.read(cacheKey);
    if (cachedData) {
      console.log('Returning cached burns data after fetch error');
      return {
        ...cachedData,
        fetchError: error.message
      };
    }
    
    // Otherwise return empty result
    return {
      burns: [],
      count: 0,
      ...createCacheMetadata(),
      error: error.message
    };
  }
}

/**
 * Get trades with improved caching
 * @param {string} period - Time period (24h, 7d, 30d, all)
 * @param {boolean} forceRefresh - Whether to force refresh cache
 * @returns {Promise<Object>} Trade data
 */
async function getTrades(period = 'all', forceRefresh = false) {
  const cacheKey = CACHE_PREFIXES.TRADES;
  
  try {
    // Check cache first unless refresh is forced
    if (!forceRefresh) {
      const cachedData = cacheService.file.read(cacheKey);
      if (cachedData && cacheService.isCacheValid(cachedData)) {
        console.log('Using cached trades data and applying period filter');
        // Filter the cached data by period
        const filteredData = { 
          ...cachedData,
          ardor_trades: filterByPeriod(
            cachedData.ardor_trades, 
            period, 
            { timestampField: 'timestamp' }
          )
        };
        
        // Update the count to match filtered data
        filteredData.count = filteredData.ardor_trades.length;
        return filteredData;
      }
    }
    
    console.log('Fetching fresh trade data');
    // Call the original function
    const result = await getOriginalTrades(period, forceRefresh);
    
    // Cache the results with metadata
    const resultWithMetadata = {
      ...result,
      ...createCacheMetadata('all', result.ardor_trades ? result.ardor_trades.length : 0)
    };
    
    cacheService.file.write(cacheKey, resultWithMetadata);
    
    // Filter if period is not 'all'
    if (period !== 'all') {
      const filteredData = { 
        ...resultWithMetadata,
        ardor_trades: filterByPeriod(
          resultWithMetadata.ardor_trades, 
          period, 
          { timestampField: 'timestamp' }
        )
      };
      
      filteredData.count = filteredData.ardor_trades.length;
      return filteredData;
    }
    
    return resultWithMetadata;
  } catch (error) {
    console.error('Error fetching trades:', error);
    
    // Return cached data on error if available
    const cachedData = cacheService.file.read(cacheKey);
    if (cachedData) {
      console.log('Returning cached trades data after fetch error');
      const filteredData = {
        ...cachedData,
        ardor_trades: filterByPeriod(
          cachedData.ardor_trades,
          period,
          { timestampField: 'timestamp' }
        ),
        fetchError: error.message
      };
      filteredData.count = filteredData.ardor_trades.length;
      return filteredData;
    }
    
    // Otherwise return empty result
    return {
      ardor_trades: [],
      count: 0,
      ...createCacheMetadata(period),
      error: error.message
    };
  }
}

/**
 * Get craftings with improved caching
 * @param {boolean} forceRefresh - Whether to force a refresh of the cache
 * @param {string} period - Time period filter (24h, 7d, 30d, all)
 * @returns {Promise<Object>} Craftings data
 */
async function getCraftings(forceRefresh = false, period = 'all') {
  const cacheKey = CACHE_PREFIXES.CRAFTS;
  
  try {
    // Check cache first unless refresh is forced
    if (!forceRefresh) {
      const cachedData = cacheService.file.read(cacheKey);
      if (cachedData && cacheService.isCacheValid(cachedData)) {
        console.log('Using cached craftings data and applying period filter');
        // Filter the cached data by period
        const filteredData = { 
          ...cachedData,
          craftings: filterByPeriod(
            cachedData.craftings, 
            period, 
            { timestampField: 'timestamp', dateField: 'craftDate' }
          )
        };
        
        // Update the count to match filtered data
        filteredData.count = filteredData.craftings.length;
        return filteredData;
      }
    }
    
    console.log('Fetching fresh craftings data');
    // Call the original function
    const result = await getOriginalCraftings(forceRefresh);
    
    // Cache the results with metadata
    const resultWithMetadata = {
      ...result,
      ...createCacheMetadata('all', result.craftings ? result.craftings.length : 0)
    };
    
    cacheService.file.write(cacheKey, resultWithMetadata);
    
    // Filter if period is not 'all'
    if (period !== 'all') {
      const filteredData = { 
        ...resultWithMetadata,
        craftings: filterByPeriod(
          resultWithMetadata.craftings, 
          period, 
          { timestampField: 'timestamp', dateField: 'craftDate' }
        )
      };
      
      filteredData.count = filteredData.craftings.length;
      return filteredData;
    }
    
    return resultWithMetadata;
  } catch (error) {
    console.error('Error fetching craftings:', error);
    
    // Return cached data on error if available
    const cachedData = cacheService.file.read(cacheKey);
    if (cachedData) {
      console.log('Returning cached craftings data after fetch error');
      const filteredData = {
        ...cachedData,
        craftings: filterByPeriod(
          cachedData.craftings,
          period,
          { timestampField: 'timestamp', dateField: 'craftDate' }
        ),
        fetchError: error.message
      };
      filteredData.count = filteredData.craftings.length;
      return filteredData;
    }
    
    // Otherwise return empty result
    return {
      craftings: [],
      count: 0,
      ...createCacheMetadata(period),
      error: error.message
    };
  }
}

/**
 * Get morphings with improved caching
 * @param {boolean} forceRefresh - Whether to force a refresh of the cache
 * @param {string} period - Time period filter (24h, 7d, 30d, all)
 * @returns {Promise<Object>} Morphings data
 */
async function getMorphings(forceRefresh = false, period = 'all') {
  const cacheKey = CACHE_PREFIXES.MORPHS;
  
  try {
    // Check cache first unless refresh is forced
    if (!forceRefresh) {
      const cachedData = cacheService.file.read(cacheKey);
      if (cachedData && cacheService.isCacheValid(cachedData)) {
        console.log('Using cached morphings data and applying period filter');
        // Filter the cached data by period
        const filteredData = { 
          ...cachedData,
          // Handle both "morphings" and "morphs" fields for backward compatibility
          morphings: filterByPeriod(
            cachedData.morphings || cachedData.morphs || [], 
            period, 
            { timestampField: 'timestamp', dateField: 'morphDate' }
          )
        };
        
        // Update the count to match filtered data
        filteredData.count = filteredData.morphings.length;
        return filteredData;
      }
    }
    
    console.log('Fetching fresh morphings data');
    // Call the original function
    const result = await getOriginalMorphings(forceRefresh);
    
    // The original function may use "morphs" instead of "morphings"
    const morphingsData = result.morphings || result.morphs || [];
    
    // Cache the results with metadata - ensure consistent naming
    const resultWithMetadata = {
      ...result,
      // If original result uses "morphs", map it to "morphings" for consistency
      morphings: morphingsData,
      ...createCacheMetadata('all', morphingsData.length)
    };
    
    cacheService.file.write(cacheKey, resultWithMetadata);
    
    // Filter if period is not 'all'
    if (period !== 'all') {
      const filteredData = { 
        ...resultWithMetadata,
        morphings: filterByPeriod(
          morphingsData, 
          period, 
          { timestampField: 'timestamp', dateField: 'morphDate' }
        )
      };
      
      filteredData.count = filteredData.morphings.length;
      return filteredData;
    }
    
    return resultWithMetadata;
  } catch (error) {
    console.error('Error fetching morphings:', error);
    
    // Return cached data on error if available
    const cachedData = cacheService.file.read(cacheKey);
    if (cachedData) {
      console.log('Returning cached morphings data after fetch error');
      const morphingsData = cachedData.morphings || cachedData.morphs || [];
      const filteredData = {
        ...cachedData,
        // Ensure we have a morphings field even if original only has morphs
        morphings: filterByPeriod(
          morphingsData,
          period,
          { timestampField: 'timestamp', dateField: 'morphDate' }
        ),
        fetchError: error.message
      };
      filteredData.count = filteredData.morphings.length;
      return filteredData;
    }
    
    // Otherwise return empty result
    return {
      morphings: [],
      count: 0,
      ...createCacheMetadata(period),
      error: error.message
    };
  }
}

/**
 * Initialize service - start periodic cache updates
 */
async function init() {
  console.log('Initializing Ardor service and populating caches...');
  
  try {
    // Initialize tracked assets cache
    await getTrackedAssets(true);
    
    // Initialize other data caches as needed
    // Only force refresh on startup for critical data
    await getTrades(false);
    await getCardBurns(false);
    await getCraftings(false);
    
    // Force refresh morphings on startup
    console.log('Forcing refresh of morphings data on startup');
    await getMorphings(true);
    
    console.log('Ardor service initialized');
  } catch (error) {
    console.error('Error initializing Ardor service:', error);
    throw error; // Re-throw to let the application handle it
  }

  // Add cache events monitoring
  cacheService.events.on('error', (event) => {
    console.error(`Cache error in ${event.store} store:`, event.error);
  });
  
  cacheService.events.on('eviction', (event) => {
    console.log(`Cache eviction in ${event.store}: removed ${event.itemsRemoved} items`);
  });
}

// Set up automatic cache refresh for morphs specifically to help debug
setInterval(() => {
  console.log('Running scheduled morphs cache refresh...');
  getMorphings(true)
    .catch(err => console.error('Error refreshing morphs cache:', err));
}, CACHE_TTL * 2 * 1000); // Twice the normal TTL

// Set up automatic cache refresh
setInterval(() => {
  console.log('Running scheduled cache refresh...');
  getTrackedAssets(true)
    .catch(err => console.error('Error refreshing assets cache:', err));
}, CACHE_TTL * 1000);

// When processing transaction data from Ardor API
function processTransactionData(transaction) {
  // Use correct timestamp conversion
  const timestamp = transaction.timestamp;
  const date = ardorTimestampToDate(timestamp);
  
  return {
    // ...existing properties...
    timestamp: timestamp,
    timestampISO: date.toISOString(),
    // ...other properties...
  };
}

// Export all service functions with consistent naming
module.exports = {
  init,
  getTrackedAssets,
  getCardBurns,
  getTrades,        // Not getArdorTrades
  getCraftings,     // Not getCrafts
  getMorphings, // Make sure this is exported!
  getGiftzSales,
  getActiveUsers,
  ardorTimestampToDate,
  dateToArdorTimestamp
};
