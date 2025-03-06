/**
 * Polygon Blockchain Service
 * Handles data fetching and processing for Polygon blockchain
 */
const axios = require('axios');
const { getTrades } = require('./polygon/trades');
const { getActiveUsers } = require('./polygon/users');
const { getTrackedTokens } = require('./polygon/tokens');
const { readJSON, writeJSON } = require('../utils/jsonStorage');

// Configuration - in a real app, consider moving to environment variables
const POLYGON_API_URL = 'https://api.polygonscan.com/api';
const ALCHEMY_API_URL = 'https://polygon-mainnet.g.alchemy.com/v2';
const ALCHEMY_API_KEY = 'KGbtj9EXEXr5LBBU7SnlFYznirnOcos7'; // Replace with your actual Alchemy API key
const CACHE_TTL = 300; // 5 minutes in seconds

// Target ERC1155 contract address
const MB_CONTRACT_ADDRESS = '0xcf55f528492768330c0750a6527c1dfb50e2a7c3';

/**
 * Fetch trades data from Polygon blockchain
 * @returns {Promise<Object>} Trades data
 */
async function getTrades() {
  try {
    console.log('Fetching Polygon trades...');
    
    // Check JSON file first
    const cachedData = readJSON('polygon_trades');
    if (cachedData) return cachedData;
    
    const response = await axios.get(`${POLYGON_API_URL}?module=account&action=txlist&address=0xYourContractAddress&startblock=0&endblock=99999999&sort=desc`);
    console.log('Fetched Polygon trades:', response.data);
    const result = {
      trades: response.data.result || [],
      count: response.data.result ? response.data.result.length : 0,
      timestamp: new Date().toISOString()
    };

    // Save to JSON file
    writeJSON('polygon_trades', result);
    
    return result;
  } catch (error) {
    console.error('Error fetching Polygon trades:', error.message);
    throw new Error(`Failed to fetch Polygon trades: ${error.message}`);
  }
}

/**
 * Fetch ERC1155 tokens from a specific contract address
 * @returns {Promise<Object>} NFT data
 */
async function getTrackedTokens() {
  try {
    console.log('Fetching tracked Polygon tokens...');
    
    // Check JSON file first
    const cachedData = readJSON('polygon_tracked_tokens');
    if (cachedData) return cachedData;
    
    // Initialize the result structure
    const result = {
      tokens: [],
      metadata: {},
      contractInfo: null,
      timestamp: new Date().toISOString()
    };

    try {
      // Get contract metadata first
      console.log('Fetching contract metadata...');
      const contractMetadataResponse = await axios.get(
        `${ALCHEMY_API_URL}/${ALCHEMY_API_KEY}/getNFTsForCollection`, {
          params: {
            contractAddress: MB_CONTRACT_ADDRESS,
            withMetadata: true,
            limit: 1
          }
        }
      );
      console.log('Fetched contract metadata:', contractMetadataResponse.data);
      if (contractMetadataResponse.data && contractMetadataResponse.data.contractMetadata) {
        result.contractInfo = contractMetadataResponse.data.contractMetadata;
      }

      // Get NFTs for the collection (paginate if needed)
      console.log('Fetching NFTs for the collection...');
      const nftResponse = await axios.get(
        `${ALCHEMY_API_URL}/${ALCHEMY_API_KEY}/getNFTsForCollection`, {
          params: {
            contractAddress: MB_CONTRACT_ADDRESS,
            withMetadata: true,
            limit: 100 // Adjust based on collection size
          }
        }
      );
      console.log('Fetched NFTs for the collection:', nftResponse.data);
      if (nftResponse.data && nftResponse.data.nfts) {
        result.tokens = nftResponse.data.nfts;
        
        // Extract and organize metadata
        result.tokens.forEach(token => {
          if (token.id && token.metadata) {
            result.metadata[token.id.tokenId] = token.metadata;
          }
        });
      }
    } catch (error) {
      console.error('Error fetching ERC1155 tokens from Alchemy:', error.message);
    }

    // Save to JSON file
    writeJSON('polygon_tracked_tokens', result);
    
    return result.tokens;
  } catch (error) {
    console.error('Error fetching tracked Polygon tokens:', error.message);
    throw new Error(`Failed to fetch tracked Polygon tokens: ${error.message}`);
  }
}

/**
 * Fetch active users data from Polygon blockchain
 * @returns {Promise<Object>} Active users data
 */
async function getActiveUsers() {
  try {
    console.log('Fetching Polygon active users...');
    
    // Check JSON file first
    const cachedData = readJSON('polygon_active_users');
    if (cachedData) return cachedData;
    
    // Mock implementation - replace with actual API call
    const result = {
      activeUsers: 453, // Mock data
      timestamp: new Date().toISOString()
    };

    // Save to JSON file
    writeJSON('polygon_active_users', result);
    
    return result;
  } catch (error) {
    console.error('Error fetching Polygon active users:', error.message);
    throw new Error(`Failed to fetch Polygon active users: ${error.message}`);
  }
}

/**
 * Get all Polygon data combined
 * @returns {Promise<Object>} Combined Polygon data
 */
async function getAllData() {
  try {
    console.log('Fetching all Polygon data...');
    // Check JSON file first
    const cachedData = readJSON('polygon_all_data');
    if (cachedData) return cachedData;

    // Fetch all data in parallel
    const [trades, activeUsers, trackedTokens] = await Promise.all([
      getTrades(),
      getActiveUsers(),
      getTrackedTokens()
    ]);

    const allData = {
      trades: trades.count,
      activeUsers: activeUsers.activeUsers,
      trackedTokens: {
        tokenCount: trackedTokens.tokens.length,
        contractAddress: MB_CONTRACT_ADDRESS,
        contractName: trackedTokens.contractInfo?.name || 'Mythical Beings'
      },
      timestamp: new Date().toISOString()
    };

    // Save to JSON file
    writeJSON('polygon_all_data', allData);
    console.log('Fetched all Polygon data:', allData);
    return allData;
  } catch (error) {
    console.error('Error fetching all Polygon data:', error.message);
    throw new Error(`Failed to fetch Polygon data: ${error.message}`);
  }
}

/**
 * Initialize service - start periodic cache updates
 */
function init() {
  // Update cache immediately
  getAllData().catch(err => console.error('Initial Polygon cache update failed:', err.message));

  // Set up periodic cache updates
  setInterval(() => {
    getAllData().catch(err => console.error('Periodic Polygon cache update failed:', err.message));
  }, CACHE_TTL * 1000);

  console.log('Polygon service initialized');
}

module.exports = {
  getTrades,
  getActiveUsers,
  getTrackedTokens,
  getAllData,
  init
};
