const axios = require('axios');
const { readJSON, writeJSON } = require('../../utils/jsonStorage');
const { ALCHEMY_API_URL, ALCHEMY_API_KEY, MB_CONTRACT_ADDRESS } = require('../config');

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

module.exports = { getTrackedTokens };