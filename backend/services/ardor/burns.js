const { readJSON, writeJSON } = require('../../utils/jsonStorage');

async function getCardBurns() {
  try {
    console.log('Fetching Ardor card burns...');
    
    // Check JSON file first
    const cachedData = readJSON('ardor_card_burns');
    if (cachedData) return cachedData;
    
    // Mock implementation - replace with actual API call
    const result = {
      burns: [],
      count: 0,
      timestamp: new Date().toISOString()
    };

    // Save to JSON file
    writeJSON('ardor_card_burns', result);
    
    return result;
  } catch (error) {
    console.error('Error fetching Ardor card burns:', error.message);
    throw new Error(`Failed to fetch Ardor card burns: ${error.message}`);
  }
}

module.exports = { getCardBurns };