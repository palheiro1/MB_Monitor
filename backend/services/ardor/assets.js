const axios = require('axios');
const { readJSON, writeJSON } = require('../../utils/jsonStorage');
const { ARDOR_API_URL, REGULAR_CARDS_ISSUER, SPECIAL_CARDS_ISSUER, TOKEN_IDS } = require('../../config');

/**
 * Fetch and process tracked assets from Ardor
 * @returns {Promise<Object>} Processed asset data
 */
async function getTrackedAssets() {
  try {
    console.log('Fetching tracked Ardor assets...');
    
    // Check JSON file first
    const cachedData = readJSON('ardor_tracked_assets');
    if (cachedData) return cachedData;
    
    // Initialize the result structure
    const result = {
      regularCards: [],
      specialCards: [],
      specificTokens: [],
      timestamp: new Date().toISOString()
    };

    // Get Regular Cards (assets issued by REGULAR_CARDS_ISSUER)
    try {
      console.log('Fetching regular cards...');
      const regularCardsResponse = await axios.get(`${ARDOR_API_URL}`, {
        params: {
          requestType: 'getAssetsByIssuer',
          account: REGULAR_CARDS_ISSUER,
          includeCounts: true,
          firstIndex: 0,
          lastIndex: 100
        }
      });
      
      console.log('Fetched regular cards:', regularCardsResponse.data);
      if (regularCardsResponse.data && regularCardsResponse.data.assets) {
        let assets = regularCardsResponse.data.assets;
        // If the assets are nested inside an array, flatten them.
        if (Array.isArray(assets[0])) {
          assets = assets.flat();
        }
        
        // Filter out assets with supply = 0.
        assets = assets.filter(asset => {
          const supply = parseInt(asset.quantityQNT || asset.quantity || "0", 10);
          return supply > 0;
        });
        result.regularCards = assets;
        console.log(`Processed ${result.regularCards.length} regular cards`);
      }
    } catch (error) {
      console.error('Error fetching regular cards:', error.message);
    }

    // Get Special Cards (assets issued by SPECIAL_CARDS_ISSUER)
    try {
      console.log('Fetching special cards...');
      const specialCardsResponse = await axios.get(`${ARDOR_API_URL}`, {
        params: {
          requestType: 'getAssetsByIssuer',
          account: SPECIAL_CARDS_ISSUER,
          includeCounts: true,
          firstIndex: 0,
          lastIndex: 100
        }
      });
      
      console.log('Fetched special cards:', specialCardsResponse.data);
      if (specialCardsResponse.data && specialCardsResponse.data.assets) {
        let assets = specialCardsResponse.data.assets;
        // Flatten the array if needed
        if (Array.isArray(assets[0])) {
          assets = assets.flat();
        }
        
        // Filter out assets with supply = 0.
        assets = assets.filter(asset => {
          const supply = parseInt(asset.quantityQNT || asset.quantity || "0", 10);
          return supply > 0;
        });
        result.specialCards = assets;
        console.log(`Processed ${result.specialCards.length} special cards`);
      }
    } catch (error) {
      console.error('Error fetching special cards:', error.message);
    }

    // Get Specific Token IDs
    const tokenPromises = TOKEN_IDS.map(assetId => 
      axios.get(`${ARDOR_API_URL}`, {
        params: {
          requestType: 'getAsset',
          asset: assetId,
          includeCounts: true
        }
      })
        .then(response => {
          console.log(`Fetched token ${assetId}:`, response.data);
          return response.data;
        })
        .catch(err => {
          console.error(`Error fetching token ${assetId}:`, err.message);
          return null;
        })
    );
    
    const tokenResults = await Promise.all(tokenPromises);
    result.specificTokens = tokenResults
      .filter(token => token !== null)
      .filter(token => {
        const supply = parseInt(token.quantityQNT || token.quantity || "0", 10);
        return supply > 0;
      });
    console.log(`Processed ${result.specificTokens.length} specific tokens`);

    // Save to JSON file
    writeJSON('ardor_tracked_assets', result);
    
    return result;
  } catch (error) {
    console.error('Error fetching tracked Ardor assets:', error.message);
    throw new Error(`Failed to fetch tracked Ardor assets: ${error.message}`);
  }
}

module.exports = { getTrackedAssets };