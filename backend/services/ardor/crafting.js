/**
 * Ardor Crafting Detection Service
 * 
 * Inspired by the successful implementation in StatsMB project
 * Detects card crafting operations by analyzing asset transfers from the craft account
 */
const axios = require('axios');
const { readJSON, writeJSON } = require('../../utils/jsonStorage');
const { ARDOR_API_URL, ARDOR_CHAIN_ID } = require('../../config');
const { getTransactionWithPrunable, extractCraftDetails, getAssetInfo, processTransfer, normalizeTimestamp, GEM_ASSET_ID } = require('./craftingUtils');

// Debug flag - enables verbose logging
const DEBUG = true;

// Define the craft account (same as in StatsMB project)
const CRAFT_ACCOUNT = "ARDOR-4V3B-TVQA-Q6LF-GMH3T";
const CRAFT_ACCOUNT_ID = "17043296434910227497";

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
 * Get all assets issued by an account
 * @param {string} account - Ardor account ID
 * @returns {Promise<Array>} - List of asset IDs
 */
async function getAccountAssets(account) {
  try {
    const response = await axios.get(ARDOR_API_URL, {
      params: {
        requestType: "getAssetsByIssuer",
        account: account,
        includeCounts: true,
        firstIndex: 0,
        lastIndex: 500 // Increase if needed
      }
    });
    
    if (response.data && response.data.assets) {
      let assets = response.data.assets;
      // Flatten the array if needed
      if (Array.isArray(assets[0])) {
        assets = assets.flat();
      }
      
      // Filter out assets with supply = 0.
      assets = assets.filter(asset => {
        const supply = parseInt(asset.quantityQNT || asset.quantity || "0", 10);
        return supply > 0;
      });
      
      // Filter by rarity - only keep rare and very rare cards
      assets = assets.filter(asset => {
        if (!asset.description) return false;
        
        try {
          // Try to parse as JSON
          const desc = JSON.parse(asset.description);
          if (desc && desc.rarity && (desc.rarity === "rare" || desc.rarity === "very rare")) {
            logger.info(`Found ${desc.rarity} card: ${desc.name || asset.name}`);
            return true;
          }
        } catch (e) {
          // If JSON parsing fails, try regex
          try {
            const rarityMatch = asset.description.match(/"rarity"\s*:\s*"([^"]+)"/);
            if (rarityMatch && rarityMatch[1] && (rarityMatch[1] === "rare" || rarityMatch[1] === "very rare")) {
              logger.info(`Found ${rarityMatch[1]} card via regex: ${asset.name}`);
              return true;
            }
          } catch (regexErr) {
            // Ignore regex errors
          }
        }
        
        return false;
      });
      
      logger.info(`Filtered to ${assets.length} rare/very rare cards`);
      return assets.map(asset => asset.asset);
    }
    return [];
  } catch (error) {
    logger.error(`Error getting account assets for ${account}`, error);
    return [];
  }
}

/**
 * Get all transfers for an asset
 * @param {string} assetId - Asset ID
 * @returns {Promise<Array>} - List of transfers
 */
async function getAllAssetTransfers(assetId) {
  try {
    let allTransfers = [];
    let firstIndex = 0;
    const batchSize = 100;
    let hasMore = true;
    
    while (hasMore) {
      const response = await axios.get(ARDOR_API_URL, {
        params: {
          requestType: "getAssetTransfers",
          asset: assetId,
          chain: CHAIN_ID,
          firstIndex: firstIndex,
          lastIndex: firstIndex + batchSize - 1
        }
      });
      
      if (response.data && response.data.transfers && response.data.transfers.length > 0) {
        // Filter transfers from the craft account
        const relevantTransfers = response.data.transfers.filter(t => 
          t.senderRS === CRAFT_ACCOUNT || t.sender === CRAFT_ACCOUNT_ID
        );
        
        allTransfers.push(...relevantTransfers);
        
        // If we got fewer transfers than requested, we've reached the end
        if (response.data.transfers.length < batchSize) {
          hasMore = false;
        } else {
          firstIndex += batchSize;
        }
      } else {
        hasMore = false;
      }
    }
    
    return allTransfers;
  } catch (error) {
    logger.error(`Error getting transfers for asset ${assetId}`, error);
    return [];
  }
}

/**
 * Main function to get all crafting operations
 * @param {boolean} forceRefresh - Whether to force a refresh of the cache
 * @returns {Promise<Object>} - Craft operations data
 */
async function getCraftings(forceRefresh = false, period = 'all') {
  try {
    logger.info(`Starting getCraftings with forceRefresh=${forceRefresh}`);
    
    // Check for cached data first
    const cachedData = readJSON('ardor_craftings');
    if (cachedData && !forceRefresh) {
      logger.info(`Using cached craft data with ${cachedData.count} entries`);
      return cachedData;
    }
    
    logger.info('Fetching craft operations - cache refresh needed');
    
    // Initialize result object
    const result = {
      craftings: [],
      count: 0,
      timestamp: new Date().toISOString()
    };
    
    // Asset info cache to avoid repeated API calls
    const assetInfoCache = {};
    
    // Get all assets issued by the craft account
    logger.info(`Getting assets issued by craft account ${CRAFT_ACCOUNT}`);
    const assetIds = await getAccountAssets(CRAFT_ACCOUNT);
    logger.info(`Found ${assetIds.length} assets issued by craft account`);
    
    let processedCount = 0;
    let foundCraftings = 0;
    let assetIndex = 0;
    const totalAssets = assetIds.length;
    
    // Process each asset
    for (const assetId of assetIds) {
      assetIndex++;
      logger.info(`Processing asset ${assetId} (${assetIndex}/${totalAssets})`);
      
      // Get all transfers for this asset
      const transfers = await getAllAssetTransfers(assetId);
      logger.info(`Found ${transfers.length} transfers for asset ${assetId}`);
      
      if (transfers.length === 0) {
        continue;
      }
      
      // Process each transfer
      for (const transfer of transfers) {
        processedCount++;
        
        try {
          // For each transfer, fetch the full transaction with prunable messages
          const fullHash = transfer.assetTransferFullHash || transfer.fullHash || transfer.transaction;
          
          if (!fullHash) {
            logger.debug('Transfer missing fullHash, skipping');
            continue;
          }
          
          // Get the full transaction with prunable message
          const transaction = await getTransactionWithPrunable(fullHash);
          
          if (!transaction) {
            logger.debug(`No transaction data returned for hash ${fullHash}`);
            continue;
          }
          
          // Check if this is a craft operation
          const craftDetails = extractCraftDetails(transaction);
          
          if (!craftDetails) {
            logger.debug(`Transfer ${fullHash} is not a craft operation`);
            continue;
          }
          
          logger.debug(`Found craft operation: ${JSON.stringify(craftDetails)}`);
          
          // Get asset info if not already cached
          if (!assetInfoCache[assetId]) {
            logger.debug(`Fetching asset info for ${assetId}`);
            assetInfoCache[assetId] = await getAssetInfo(assetId);
          }
          
          const assetInfo = assetInfoCache[assetId] || {
            assetId,
            name: `Asset ${assetId}`,
            cardName: `Unknown (${assetId})`,
            cardRarity: 'unknown',
            cardType: 'unknown'
          };
          
          const normalizedTimestamp = normalizeTimestamp(transfer.timestamp);
          
          // Add this craft operation to our results
          const craftOperation = {
            id: fullHash,
            timestamp: normalizedTimestamp,
            date: ardorTimestampToDate(normalizedTimestamp).toISOString(),
            timestampISO: ardorTimestampToDate(normalizedTimestamp).toISOString(),
            recipient: transfer.recipientRS,
            assetId,
            assetName: assetInfo.name,
            cardName: assetInfo.cardName,
            cardRarity: assetInfo.cardRarity,
            cardType: assetInfo.cardType,
            cardsUsed: craftDetails.cardsUsed,
            fullHash,
            details: craftDetails
          };
          
          result.craftings.push(craftOperation);
          foundCraftings++;
          
          logger.info(`Found craft operation: ${craftOperation.cardName} by ${craftOperation.recipient}`);
          
          // Log progress periodically
          if (processedCount % 10 === 0) {
            logger.info(`Processed ${processedCount} transfers, found ${foundCraftings} craft operations so far`);
          }
        } catch (error) {
          logger.error(`Error processing transfer ${transfer.fullHash || 'unknown'}`, error);
        }
      }
    }
    
    // Sort by timestamp (newest first)
    result.craftings.sort((a, b) => b.timestamp - a.timestamp);
    
    // Final filter to ensure no GEM tokens are included
    result.craftings = result.craftings.filter(craft => craft.assetId !== GEM_ASSET_ID);
    result.count = result.craftings.length;
    
    // Calculate total quantity of cards crafted
    if (result && result.craftings) {
      let totalQuantity = 0;
      
      for (const craft of result.craftings) {
        // Each crafting typically produces 1 card, but some may produce more
        // Use the outputQuantity if available, otherwise default to 1
        totalQuantity += (craft.outputQuantity || 1);
      }
      
      // Add totalQuantity to result
      result.totalQuantity = totalQuantity;
      console.log(`Calculated total of ${totalQuantity} cards crafted in ${result.craftings.length} craft operations`);
    }
    
    logger.info(`Found ${result.count} craft operations in total`);
    
    // If we found some craft operations, cache the result
    if (result.count > 0) {
      logger.info(`Writing ${result.count} craft operations to cache`);
      writeJSON('ardor_craftings', result);
      logger.info('Cached craft operations to file');
    } else {
      logger.info('No craft operations found to cache');
      writeJSON('ardor_craftings', result);
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

module.exports = { getCraftings };