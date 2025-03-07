const { readJSON, writeJSON } = require('../../utils/jsonStorage');
const { CACHE_TTL } = require('../../config');

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

module.exports = { getActiveUsers };