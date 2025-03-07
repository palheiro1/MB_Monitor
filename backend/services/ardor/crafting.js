/**
 * Ardor Crafting Detection Service
 * 
 * Inspired by the successful implementation in StatsMB project
 * Detects card crafting operations by analyzing asset transfers from the craft account
 */
const axios = require('axios');
const { readJSON, writeJSON } = require('../../utils/jsonStorage');
const { ARDOR_API_URL, ARDOR_CHAIN_ID } = require('../../config');
const { getTransactionWithPrunable, extractCraftDetails, getAssetInfo, getAssetTransfersBatch, processTransfer, normalizeTimestamp, GEM_ASSET_ID } = require('./craftingUtils');

// Debug flag - enables verbose logging
const DEBUG = true;

// Define the craft account (same as in StatsMB project)
const CRAFT_ACCOUNT = "ARDOR-4V3B-TVQA-Q6LF-GMH3T";

// Update the Ardor epoch constant to match the frontend utility
const ARDOR_EPOCH = 1514764800000; // January 1, 2018 00:00:00 UTC in milliseconds

// IGNIS chain ID - always use this for Mythical Beings operations
const CHAIN_ID = 2;

/**
 * Simple logger implementation
 */
const logger = {
  debug: (msg) => DEBUG && console.log(`[CRAFT-DEBUG] ${msg}`),
  info: (msg) => console.log(`[CRAFT] ${msg}`),
  error: (msg, err = null) => {
    console.error(`[CRAFT-ERROR] ${msg}`);
    if (err) console.error(err);
  }
};

const JUNE_2023_TIMESTAMP = new Date('2023-06-01T00:00:00Z').getTime();

/**
 * Convert Ardor timestamp to JavaScript Date object
 * 
 * @param {number} ardorTimestamp - Ardor blockchain timestamp in seconds
 * @returns {Date} JavaScript Date object
 */
function ardorTimestampToDate(ardorTimestamp) {
  return new Date(ARDOR_EPOCH + (ardorTimestamp * 1000));
}

/**
 * Main function to get all crafting operations
 * @param {boolean} forceRefresh - Whether to force a refresh of the cache
 * @returns {Promise<Object>} - Craft operations data
 */
async function getCraftings(forceRefresh = false) {
  try {
    logger.info(`Starting getCraftings with forceRefresh=${forceRefresh}`);
    
    // Check for cached data first
    const cachedData = readJSON('ardor_craftings');
    if (cachedData && !forceRefresh) {
      logger.info(`Using cached craft data with ${cachedData.count} entries`);
      
      // Log some sample data to verify structure
      if (cachedData.craftings && cachedData.craftings.length > 0) {
        logger.debug(`Sample cached crafting: ${JSON.stringify(cachedData.craftings[0])}`);
      } else {
        logger.debug(`Cache exists but contains no entries - this is the issue!`);
      }
      
      return cachedData;
    }
    
    logger.info('Fetching craft operations - cache refresh needed');
    
    // Initialize result object
    const result = {
      craftings: [],
      count: 0,
      timestamp: new Date().toISOString()
    };
    
    // Use June 2023 as the cutoff date
    const cutoffTimestamp = Math.floor((JUNE_2023_TIMESTAMP - ARDOR_EPOCH) / 1000);
    
    logger.info(`Using cutoff date: ${new Date(cutoffTimestamp * 1000).toISOString()}`);
    
    // Asset info cache to avoid repeated API calls
    const assetInfoCache = {};
    
    // Fetch transfers in batches
    const batchSize = 100;
    let firstIndex = 0;
    let hasMoreTransfers = true;
    let processedCount = 0;
    let foundCraftings = 0;
    
    while (hasMoreTransfers) {
      const lastIndex = firstIndex + batchSize - 1;
      logger.info(`Fetching transfers batch ${firstIndex}-${lastIndex}`);
      
      const transfers = await getAssetTransfersBatch(firstIndex, lastIndex);
      
      // No more transfers to process
      if (transfers.length === 0) {
        hasMoreTransfers = false;
        logger.info('No more transfers found');
        break;
      }
      
      // Filter transfers after cutoff date
      const recentTransfers = transfers.filter(t => {
        const normalizedTs = normalizeTimestamp(t.timestamp);
        return normalizedTs >= cutoffTimestamp;
      });
      
      logger.info(`Processing ${recentTransfers.length} transfers after cutoff date`);
      
      // Process each transfer
      for (const transfer of recentTransfers) {
        processedCount++;
        
        try {
          const craftOperation = await processTransfer(transfer, assetInfoCache);
          
          if (craftOperation) {
            result.craftings.push(craftOperation);
            foundCraftings++;
            logger.info(`Found craft operation: ${craftOperation.cardName} by ${craftOperation.recipient}`);
          }
          
          // Log progress periodically
          if (processedCount % 10 === 0) {
            logger.info(`Processed ${processedCount} transfers, found ${foundCraftings} craft operations so far`);
          }
        } catch (error) {
          logger.error(`Error processing transfer ${transfer.fullHash || 'unknown'}`, error);
        }
      }
      
      // Check if this batch was smaller than requested (reached the end)
      if (transfers.length < batchSize) {
        hasMoreTransfers = false;
        logger.info('Reached end of transfers');
        break;
      }
      
      // Move to next batch
      firstIndex += batchSize;
    }
    
    // Sort by timestamp (newest first)
    result.craftings.sort((a, b) => b.timestamp - a.timestamp);
    
    // Final filter to ensure no GEM tokens are included
    result.craftings = result.craftings.filter(craft => craft.assetId !== GEM_ASSET_ID);
    result.count = result.craftings.length;
    
    logger.info(`Found ${result.count} craft operations in total (after filtering GEM tokens)`);
    
    // If we found some craft operations, cache the result
    if (result.count > 0) {
      logger.info(`Writing ${result.count} craft operations to cache`);
      writeJSON('ardor_craftings', result);
      logger.info('Cached craft operations to file');
    } else {
      logger.info('No craft operations found to cache');
      
      // Write an empty cache to avoid repeated API calls
      writeJSON('ardor_craftings', result);
      logger.info('Cached empty craft operations to file');
    }
    
    return result;
  } catch (error) {
    logger.error('Error in getCraftings', error);
    
    // Return empty result on error
    return {
      craftings: [],
      count: 0,
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}

// Call the function to gather the info from the logs
getCraftings(true).then(result => {
  console.log('Crafting data:', result);
}).catch(error => {
  console.error('Error fetching crafting data:', error);
});

module.exports = { getCraftings };