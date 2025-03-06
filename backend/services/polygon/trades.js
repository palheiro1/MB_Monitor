const axios = require('axios');
const { readJSON, writeJSON } = require('../../utils/jsonStorage');
const { POLYGON_API_URL } = require('../config');

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

module.exports = { getTrades };