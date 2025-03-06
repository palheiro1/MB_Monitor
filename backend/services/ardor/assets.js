const axios = require('axios');
const { readJSON, writeJSON } = require('../../utils/jsonStorage');
const { ARDOR_API_URL, REGULAR_CARDS_ISSUER, SPECIAL_CARDS_ISSUER, TOKEN_IDS } = require('../../config');

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
      const regularCardsResponse = await axios.get(`${ARDOR_API_URL}?requestType=getAssetsByIssuer&account=${REGULAR_CARDS_ISSUER}&includeCounts=true&firstIndex=0&lastIndex=100`);
      console.log('Fetched regular cards:', regularCardsResponse.data);
      if (regularCardsResponse.data && regularCardsResponse.data.assets) {
        result.regularCards = regularCardsResponse.data.assets;
      }
    } catch (error) {
      console.error('Error fetching regular cards:', error.message);
    }

    // Get Special Cards (assets issued by SPECIAL_CARDS_ISSUER)
    try {
      console.log('Fetching special cards...');
      const specialCardsResponse = await axios.get(`${ARDOR_API_URL}?requestType=getAssetsByIssuer&account=${SPECIAL_CARDS_ISSUER}&includeCounts=true&firstIndex=0&lastIndex=100`);
      console.log('Fetched special cards:', specialCardsResponse.data);
      if (specialCardsResponse.data && specialCardsResponse.data.assets) {
        result.specialCards = specialCardsResponse.data.assets;
      }
    } catch (error) {
      console.error('Error fetching special cards:', error.message);
    }

    // Get Specific Token IDs
    const tokenPromises = TOKEN_IDS.map(assetId => 
      axios.get(`${ARDOR_API_URL}?requestType=getAsset&asset=${assetId}&includeCounts=true`)
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
    result.specificTokens = tokenResults.filter(token => token !== null);

    // Save to JSON file
    writeJSON('ardor_tracked_assets', result);
    
    return result;
  } catch (error) {
    console.error('Error fetching tracked Ardor assets:', error.message);
    throw new Error(`Failed to fetch tracked Ardor assets: ${error.message}`);
  }
}

module.exports = { getTrackedAssets };