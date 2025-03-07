const axios = require('axios');
const { ARDOR_API_URL, ARDOR_CHAIN_ID, ARDOR_NODE, REGULAR_CARDS_ISSUER } = require('../../config');
const { readJSON, writeJSON } = require('../../utils/jsonStorage');

const DEBUG = true;
const logger = {
  debug: (msg) => DEBUG && console.log(`[CRAFT-DEBUG] ${msg}`),
  info: (msg) => console.log(`[CRAFT] ${msg}`),
  error: (msg, err = null) => {
    console.error(`[CRAFT-ERROR] ${msg}`);
    if (err) console.error(err);
  }
};

// Define the GEM token asset ID
const GEM_ASSET_ID = '10230963490193589789';

// Add the Ardor epoch constant at the top of the file with other constants
const ARDOR_EPOCH = new Date("2018-01-01T00:00:00Z").getTime();

// Define the craft account - this is the account that issues newly crafted cards
const CRAFT_ACCOUNT = REGULAR_CARDS_ISSUER; // "ARDOR-4V3B-TVQA-Q6LF-GMH3T"

async function callArdorAPI(params) {
  try {
    if (!params.chain && params.requestType !== 'getAsset') {
      params.chain = ARDOR_CHAIN_ID;
    }
    logger.debug(`API Request: ${JSON.stringify(params)}`);
    const urlParams = new URLSearchParams(params);
    const fullUrl = `${ARDOR_API_URL}?${urlParams.toString()}`;
    logger.debug(`Full API URL: ${fullUrl}`);
    const response = await axios.get(ARDOR_API_URL, { params });
    if (!response.data) {
      logger.debug('Empty response from API');
      return null;
    }
    if (response.data.errorCode || response.data.errorDescription) {
      logger.debug(`API error: ${response.data.errorDescription || response.data.errorCode}`);
      return null;
    }
    const responseKeys = Object.keys(response.data);
    logger.debug(`API Response keys: ${responseKeys.join(', ')}`);
    if (Array.isArray(response.data.transfers)) {
      logger.debug(`Received ${response.data.transfers.length} transfers`);
    }
    return response.data;
  } catch (error) {
    logger.error(`API request failed: ${JSON.stringify(params)}`, error);
    return null;
  }
}

async function getTransactionWithPrunable(fullHash) {
  logger.debug(`Getting transaction with prunable message: ${fullHash}`);
  const txResponse = await callArdorAPI({
    requestType: 'getTransaction',
    fullHash: fullHash,
    includePrunable: true,
    chain: ARDOR_CHAIN_ID
  });
  if (txResponse && txResponse.attachment && txResponse.attachment.message) {
    logger.debug(`Found message directly in transaction ${fullHash}`);
    return txResponse;
  }
  const prunableResponse = await callArdorAPI({
    requestType: 'getPrunableMessage',
    transaction: fullHash,
    chain: ARDOR_CHAIN_ID
  });
  if (prunableResponse && prunableResponse.message) {
    logger.debug(`Found message via getPrunableMessage for ${fullHash}`);
    const basicTxResponse = await callArdorAPI({
      requestType: 'getTransaction',
      fullHash: fullHash,
      chain: ARDOR_CHAIN_ID
    });
    if (basicTxResponse) {
      basicTxResponse.attachment = basicTxResponse.attachment || {};
      basicTxResponse.attachment.message = prunableResponse.message;
      basicTxResponse.attachment.messageIsText = prunableResponse.messageIsText;
      return basicTxResponse;
    }
  }
  const fallbackResponse = await callArdorAPI({
    requestType: 'getTransaction',
    fullHash: fullHash,
    chain: ARDOR_CHAIN_ID
  });
  if (fallbackResponse && fallbackResponse.attachment && fallbackResponse.attachment.message) {
    logger.debug(`Found message in fallback transaction request for ${fullHash}`);
    return fallbackResponse;
  }
  logger.debug(`No prunable message found for transaction ${fullHash}`);
  return txResponse || fallbackResponse;
}

function extractCraftDetails(transaction) {
  if (!transaction || !transaction.attachment || !transaction.attachment.message) {
    return null;
  }
  try {
    const message = transaction.attachment.message;
    logger.debug(`Examining message: ${message.substring(0, 100)}...`);
    const messageData = JSON.parse(message);
    logger.debug(`Message structure: ${JSON.stringify(Object.keys(messageData))}`);
    logger.debug(`submittedBy field: ${messageData.submittedBy}`);
    if (messageData.submittedBy === "CardCraftGEM" || messageData.submittedBy === "CardCraft") {
      logger.debug(`Confirmed craft operation in transaction ${transaction.fullHash || transaction.transaction}`);
      const cardsUsed = messageData.transactionSpent && Array.isArray(messageData.transactionSpent) 
        ? messageData.transactionSpent.length 
        : 1;
      return {
        isCraftOperation: true,
        submittedBy: messageData.submittedBy,
        cardsUsed: cardsUsed,
        amountNQTReceived: messageData.amountNQTReceived,
        amountNQTSpent: messageData.amountNQTSpent,
        transactionTrigger: messageData.transactionTrigger,
        transactionSpent: messageData.transactionSpent,
        serialForRandom: messageData.serialForRandom
      };
    }
  } catch (error) {
    logger.debug(`Failed to parse message as JSON: ${error.message}`);
  }
  return null;
}

async function getAssetInfo(assetId) {
  const assetData = await callArdorAPI({
    requestType: 'getAsset',
    asset: assetId
  });
  if (!assetData) {
    logger.debug(`Failed to get info for asset ${assetId}`);
    return null;
  }
  let cardName = assetData.name || `Asset ${assetId}`;
  let cardRarity = "unknown";
  let cardType = "unknown";
  if (assetData.description) {
    try {
      const descriptionData = JSON.parse(assetData.description);
      if (descriptionData.name) cardName = descriptionData.name;
      if (descriptionData.rarity) cardRarity = descriptionData.rarity;
      if (descriptionData.type) cardType = descriptionData.type;
    } catch (error) {
      try {
        const nameMatch = assetData.description.match(/"name"\s*:\s*"([^"]+)"/);
        if (nameMatch && nameMatch[1]) cardName = nameMatch[1];
        const rarityMatch = assetData.description.match(/"rarity"\s*:\s*"([^"]+)"/);
        if (rarityMatch && rarityMatch[1]) cardRarity = rarityMatch[1];
        const typeMatch = assetData.description.match(/"type"\s*:\s*"([^"]+)"/);
        if (typeMatch && typeMatch[1]) cardType = typeMatch[1];
      } catch (regexErr) {
        logger.debug(`Failed to extract metadata with regex: ${regexErr.message}`);
      }
    }
  }
  return {
    assetId,
    name: assetData.name,
    description: assetData.description,
    cardName,
    cardRarity,
    cardType,
    quantity: assetData.quantityQNT,
    decimals: assetData.decimals
  };
}

async function getAssetTransfersBatch(firstIndex, lastIndex) {
  logger.debug(`Fetching transfers batch ${firstIndex}-${lastIndex}`);
  const params = {
    requestType: 'getAssetTransfers',
    account: "ARDOR-4V3B-TVQA-Q6LF-GMH3T",
    chain: ARDOR_CHAIN_ID,
    firstIndex,
    lastIndex
  };
  logger.info(`Querying asset transfers for CRAFT account with params: ${JSON.stringify(params)}`);
  const response = await callArdorAPI(params);
  if (!response || !response.transfers) {
    logger.debug(`No transfers found in batch ${firstIndex}-${lastIndex}`);
    return [];
  }
  logger.debug(`Found ${response.transfers.length} transfers in batch ${firstIndex}-${lastIndex}`);
  if (response.transfers.length > 0) {
    logger.debug(`First transfer in batch: ${JSON.stringify(response.transfers[0])}`);
  }
  // Filter out GEM token transfers
  const filteredTransfers = response.transfers.filter(transfer => transfer.asset !== GEM_ASSET_ID);
  logger.debug(`Filtered out ${response.transfers.length - filteredTransfers.length} GEM transfers, remaining: ${filteredTransfers.length}`);
  return filteredTransfers;
}

/**
 * Normalize a timestamp to a standard format.
 * @param {string|number} timestamp - The timestamp to normalize.
 * @returns {number} - The normalized timestamp as a number for comparison.
 */
function normalizeTimestamp(timestamp) {
  // Convert to number if it's a string
  const ts = Number(timestamp);
  
  // If the timestamp is already in seconds since Ardor epoch, return it
  // Otherwise, convert from milliseconds to seconds
  return ts > 1e10 ? Math.floor(ts / 1000) : ts;
}

/**
 * Convert Ardor timestamp to a JavaScript Date
 * @param {number} timestamp - Ardor timestamp (seconds since Ardor epoch)
 * @returns {Date} JavaScript Date object
 */
function ardorTimestampToDate(timestamp) {
  return new Date(ARDOR_EPOCH + (timestamp * 1000));
}

/**
 * Format Ardor timestamp to ISO string
 * @param {number} timestamp - Ardor timestamp (seconds since Ardor epoch)
 * @returns {string} ISO date string
 */
function ardorTimestampToISOString(timestamp) {
  return ardorTimestampToDate(timestamp).toISOString();
}

async function processTransfer(transfer, assetInfoCache) {
  const fullHash = transfer.assetTransferFullHash || transfer.fullHash;
  const assetId = transfer.asset;
  
  // Skip GEM token transfers
  if (assetId === GEM_ASSET_ID) {
    logger.debug(`Skipping GEM token transfer ${fullHash}`);
    return null;
  }
  
  if (!fullHash) {
    logger.debug('Transfer missing fullHash, skipping');
    return null;
  }
  if (transfer.senderRS !== "ARDOR-4V3B-TVQA-Q6LF-GMH3T") {
    logger.debug(`Transfer ${fullHash} not from craft account, skipping`);
    return null;
  }
  logger.debug(`Processing transfer ${fullHash} of asset ${assetId}`);
  logger.debug(`Transfer details: from=${transfer.senderRS} to=${transfer.recipientRS}`);
  const transaction = await getTransactionWithPrunable(fullHash);
  if (transaction) {
    logger.debug(`Got transaction data: type=${transaction.type}, subtype=${transaction.subtype}`);
    if (transaction.attachment) {
      logger.debug(`Transaction has attachment with keys: ${Object.keys(transaction.attachment).join(', ')}`);
      if (transaction.attachment.message) {
        logger.debug(`Message found (length: ${transaction.attachment.message.length})`);
      } else {
        logger.debug('No message found in transaction attachment');
      }
    } else {
      logger.debug('Transaction has no attachment');
    }
  } else {
    logger.debug(`No transaction data returned for hash ${fullHash}`);
  }
  const craftDetails = extractCraftDetails(transaction);
  if (!craftDetails) {
    logger.debug(`Transfer ${fullHash} is not a craft operation`);
    return null;
  }
  logger.debug(`FOUND CRAFT OPERATION: ${JSON.stringify(craftDetails)}`);
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
  return {
    id: fullHash,
    timestamp: normalizeTimestamp(transfer.timestamp),
    date: new Date(normalizeTimestamp(transfer.timestamp) * 1000).toISOString(),
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
}

/**
 * Fetch crafting transactions from Ardor API
 * Crafting is identified by asset transfers FROM the craft account to users
 */
async function fetchCraftingsFromApi() {
  try {
    console.log("[CRAFT] Fetching crafting transactions from API");
    console.log(`[CRAFT] Using craft account: ${CRAFT_ACCOUNT}`);
    
    // Get asset transfers FROM the craft account (these are the newly crafted cards being sent to users)
    const response = await axios.get(`${ARDOR_NODE}/nxt`, {
      params: {
        requestType: 'getAssetTransfers',
        chain: ARDOR_CHAIN_ID,
        account: CRAFT_ACCOUNT, // The craft account that SENDS the newly crafted cards
        firstIndex: 0,
        lastIndex: 500, // Increase this number to get more crafting records
        includeAssetInfo: true
      }
    });
    
    if (response.data && response.data.transfers && response.data.transfers.length > 0) {
      console.log(`[CRAFT] API returned ${response.data.transfers.length} transfers from craft account`);
      
      const craftings = response.data.transfers.map(transfer => {
        // Get asset name from the transfer data or assetInfo
        const assetName = transfer.assetName || 
                         (transfer.attachment && transfer.attachment.name) || 
                         'Unknown Card';
        
        return {
          id: transfer.transaction || transfer.signature || transfer.fullHash,
          blockchain: "ardor",
          chain: transfer.chain || ARDOR_CHAIN_ID,
          timestamp: transfer.timestamp,
          timestampISO: getTimestampISO(transfer.timestamp),
          cardName: assetName,
          assetName: assetName,
          // In a crafting operation, the RECIPIENT is the one who received the crafted card
          recipient: transfer.recipientRS,
          // The sender is the craft account
          sender: transfer.senderRS,
          assetId: transfer.asset,
          quantity: transfer.quantityQNT,
          transaction_hash: transfer.fullHash || transfer.transaction,
          block: transfer.height
        };
      });
      
      console.log(`[CRAFT] Found ${craftings.length} crafting transactions`);
      return craftings;
    }
    
    console.log("[CRAFT] No crafting data found in API response");
    return [];
  } catch (error) {
    console.error("[CRAFT] Error fetching crafting data:", error.message);
    if (error.response) {
      console.error("[CRAFT] API error response:", error.response.status, error.response.statusText);
      console.error("[CRAFT] API error details:", JSON.stringify(error.response.data, null, 2));
    }
    return [];
  }
}

/**
 * Convert Ardor timestamp to ISO string
 * CORRECTION: Ardor epoch was incorrectly set in the original code
 * The correct epoch is 2013-11-24T12:00:00Z, not 2018-01-01
 */
function getTimestampISO(timestamp) {
  if (!timestamp) return null;
  
  // Ardor epoch is NOV_24_2013_12_00 UTC (not 2018-01-01)
  // This is the same as NXT
  const ARDOR_EPOCH = new Date("2013-11-24T12:00:00Z").getTime();
  const date = new Date(ARDOR_EPOCH + (timestamp * 1000));
  return date.toISOString();
}

module.exports = {
  callArdorAPI,
  getTransactionWithPrunable,
  extractCraftDetails,
  getAssetInfo,
  getAssetTransfersBatch,
  processTransfer,
  normalizeTimestamp,
  ardorTimestampToDate,
  ardorTimestampToISOString,
  GEM_ASSET_ID, // Export the GEM_ASSET_ID constant
  ARDOR_EPOCH,
  fetchCraftingsFromApi,
  getTimestampISO,
  CRAFT_ACCOUNT
};
