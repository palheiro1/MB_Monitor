const axios = require('axios');
const { readJSON, writeJSON } = require('../../utils/jsonStorage');
const { ARDOR_API_URL } = require('../../config');

async function getTrades() {
  try {
    console.log('Fetching Ardor trades...');
    
    // Check JSON file first
    const cachedData = readJSON('ardor_trades');
    if (cachedData) return cachedData;
    
    const response = await axios.get(`${ARDOR_API_URL}?requestType=getAssetTransfers&chain=2&lastIndex=10`);
    console.log('Fetched Ardor trades:', response.data);
    const result = {
      trades: response.data.transfers || [],
      count: response.data.transfers ? response.data.transfers.length : 0,
      timestamp: new Date().toISOString()
    };

    // Save to JSON file
    writeJSON('ardor_trades', result);
    
    return result;
  } catch (error) {
    console.error('Error fetching Ardor trades:', error.message);
    throw new Error(`Failed to fetch Ardor trades: ${error.message}`);
  }
}

module.exports = { getTrades };