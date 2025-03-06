const axios = require('axios');
const { ARDOR_API_URL } = require('../../config');

async function getPrimarySales() {
  try {
    console.log('Fetching Ardor primary sales...');
    const response = await axios.get(`${ARDOR_API_URL}?requestType=getBlockchainTransactions&chain=2&type=2&subtype=3&firstIndex=0&lastIndex=100`);
    console.log('Fetched Ardor primary sales:', response.data);
    return {
      sales: response.data.transactions || [],
      count: response.data.transactions ? response.data.transactions.length : 0,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching Ardor primary sales:', error.message);
    throw new Error(`Failed to fetch Ardor primary sales: ${error.message}`);
  }
}

module.exports = { getPrimarySales };