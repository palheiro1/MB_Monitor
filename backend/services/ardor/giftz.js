/**
 * Ardor Giftz Sales Service
 * 
 * Detects and processes Giftz sales by analyzing transfers of the GIFTZ token
 * from the official distributor account with attached prunable messages.
 */
const axios = require('axios');
const { readJSON, writeJSON } = require('../../utils/jsonStorage');
const { ARDOR_API_URL, ARDOR_CHAIN_ID } = require('../../config');

// Constants
const GIFTZ_TOKEN_ID = '13993107092599641878';
const GIFTZ_DISTRIBUTOR = 'ARDOR-8WCM-6LBD-3AC9-9F22P';
const GIFTZ_DISTRIBUTOR_NUMERIC = '8827069720377389395';
const ARDOR_EPOCH = new Date("2018-01-01T00:00:00Z").getTime();

/**
 * Convert Ardor timestamp to ISO date string
 * @param {number} timestamp - Ardor timestamp in seconds
 * @returns {string} ISO date string
 */
function ardorTimestampToDate(timestamp) {
  return new Date(ARDOR_EPOCH + timestamp * 1000).toISOString();
}

/**
 * Fetch a batch of asset transfers with pagination
 * @param {number} firstIndex - Starting index
 * @param {number} lastIndex - Ending index
 * @returns {Promise<Array>} Array of transfers
 */
async function fetchTransfersBatch(firstIndex, lastIndex) {
  try {
    const response = await axios.get(ARDOR_API_URL, {
      params: {
        requestType: 'getAssetTransfers',
        asset: GIFTZ_TOKEN_ID,
        chain: ARDOR_CHAIN_ID,
        firstIndex,
        lastIndex
      }
    });
    
    if (!response.data || !response.data.transfers) {
      console.log('No transfers found in batch');
      return [];
    }
    
    return response.data.transfers;
  } catch (error) {
    console.error('Error fetching Giftz transfers batch:', error.message);
    return [];
  }
}

/**
 * Fetch all Giftz transfers with pagination
 * @returns {Promise<Array>} Array of all transfers
 */
async function fetchAllTransfers() {
  console.log('Fetching all Giftz transfers...');
  const batchSize = 100;
  let firstIndex = 0;
  let allTransfers = [];
  let hasMore = true;
  
  while (hasMore) {
    const transfers = await fetchTransfersBatch(firstIndex, firstIndex + batchSize - 1);
    
    if (!transfers || transfers.length === 0) {
      hasMore = false;
    } else {
      allTransfers = [...allTransfers, ...transfers];
      firstIndex += batchSize;
      
      // Stop if we got fewer transfers than the batch size
      if (transfers.length < batchSize) {
        hasMore = false;
      }
    }
  }
  
  console.log(`Fetched ${allTransfers.length} total Giftz transfers`);
  return allTransfers;
}

/**
 * Get transaction details including prunable message
 * @param {string} fullHash - Transaction hash
 * @returns {Promise<Object>} Transaction details
 */
async function getTransactionWithMessage(fullHash) {
  try {
    // First try with includePrunable parameter
    const response = await axios.get(ARDOR_API_URL, {
      params: {
        requestType: 'getTransaction',
        fullHash,
        includePrunable: true,
        chain: ARDOR_CHAIN_ID
      }
    });
    
    if (response.data && !response.data.errorCode) {
      return response.data;
    }
    
    // If that fails, try getPrunableMessage directly
    const prunableResponse = await axios.get(ARDOR_API_URL, {
      params: {
        requestType: 'getPrunableMessage',
        transaction: fullHash,
        chain: ARDOR_CHAIN_ID
      }
    });
    
    if (prunableResponse.data && !prunableResponse.data.errorCode && prunableResponse.data.message) {
      // Combine with basic transaction data
      const basicResponse = await axios.get(ARDOR_API_URL, {
        params: {
          requestType: 'getTransaction',
          fullHash,
          chain: ARDOR_CHAIN_ID
        }
      });
      
      if (basicResponse.data && !basicResponse.data.errorCode) {
        return {
          ...basicResponse.data,
          attachment: {
            ...basicResponse.data.attachment,
            message: prunableResponse.data.message,
            messageIsText: prunableResponse.data.messageIsText
          }
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching transaction details for ${fullHash}:`, error.message);
    return null;
  }
}

/**
 * Process a Giftz transfer to determine if it's a sale
 * @param {Object} transfer - Transfer data
 * @returns {Promise<Object|null>} Processed sale or null
 */
async function processGiftzTransfer(transfer) {
  // Check if it's from the Giftz distributor
  if (transfer.sender !== GIFTZ_DISTRIBUTOR_NUMERIC && transfer.senderRS !== GIFTZ_DISTRIBUTOR) {
    return null;
  }
  
  // Get the full transaction hash
  const txHash = transfer.assetTransferFullHash || transfer.fullHash || transfer.transaction;
  if (!txHash) {
    return null;
  }
  
  // Get transaction with message
  const txData = await getTransactionWithMessage(txHash);
  if (!txData) {
    return null;
  }
  
  // Check if it has a message attachment
  if (!txData.attachment || !txData.attachment.message) {
    return null;
  }
  
  // Check if message contains leaderboardEndBlock - if yes, skip it
  const message = txData.attachment.message;
  let isLeaderboardTransaction = false;
  
  try {
    // Try parsing as JSON first
    const jsonMsg = JSON.parse(message);
    if (jsonMsg.leaderboardEndBlock) {
      isLeaderboardTransaction = true;
    }
  } catch (e) {
    // If not valid JSON, check as string
    if (message.includes("leaderboardEndBlock")) {
      isLeaderboardTransaction = true;
    }
  }
  
  if (isLeaderboardTransaction) {
    return null;
  }
  
  // All checks passed, this is a sale - extract and normalize the data
  return {
    id: txHash,
    timestamp: parseInt(transfer.timestamp),
    timestampISO: ardorTimestampToDate(parseInt(transfer.timestamp)),
    item_name: 'GIFTZ Token',
    quantity: parseInt(transfer.quantityQNT) || 0,
    buyer: transfer.recipientRS,
    buyerId: transfer.recipient,
    seller: transfer.senderRS,
    sellerId: transfer.sender,
    price: 0, // Price info not available directly
    currency: 'IGNIS',
    type: 'giftz',
    message: txData.attachment.message,
    fullHash: txHash
  };
}

/**
 * Get all Giftz sales
 * @param {boolean} forceRefresh - Whether to force refresh cache
 * @returns {Promise<Object>} Sales data
 */
async function getGiftzSales(forceRefresh = false) {
  try {
    // Check cache first
    const cachedData = readJSON('ardor_giftz_sales');
    if (cachedData && !forceRefresh) {
      console.log(`Using cached Giftz sales with ${cachedData.count} entries`);
      return cachedData;
    }
    
    console.log('Fetching fresh Giftz sales data...');
    
    // Fetch all transfers
    const allTransfers = await fetchAllTransfers();
    
    // Process each transfer to find actual sales
    console.log(`Processing ${allTransfers.length} transfers to find sales...`);
    
    const salesPromises = allTransfers
      .filter(transfer => 
        transfer.sender === GIFTZ_DISTRIBUTOR_NUMERIC || 
        transfer.senderRS === GIFTZ_DISTRIBUTOR
      )
      .map(transfer => processGiftzTransfer(transfer));
    
    const processedSales = await Promise.all(salesPromises);
    
    // Filter out nulls (transfers that weren't sales)
    const sales = processedSales.filter(sale => sale !== null);
    
    // Sort by timestamp (newest first)
    sales.sort((a, b) => b.timestamp - a.timestamp);
    
    // Calculate total quantity of GIFTZ tokens transferred
    const totalQuantity = sales.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
    
    // Create result object
    const result = {
      sales,
      count: sales.length,
      totalQuantity,  // Add the total quantity
      timestamp: new Date().toISOString()
    };
    
    console.log(`Found ${sales.length} valid Giftz sales with total ${totalQuantity} GIFTZ tokens transferred`);
    
    // Save to cache
    writeJSON('ardor_giftz_sales', result);
    
    return result;
  } catch (error) {
    console.error('Error fetching Giftz sales:', error.message);
    throw new Error(`Failed to fetch Giftz sales: ${error.message}`);
  }
}

module.exports = { getGiftzSales };
