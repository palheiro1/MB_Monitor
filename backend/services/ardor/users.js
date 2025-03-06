const { readJSON, writeJSON } = require('../../utils/jsonStorage');

async function getActiveUsers() {
  try {
    console.log('Fetching Ardor active users...');
    
    // Check JSON file first
    const cachedData = readJSON('ardor_active_users');
    if (cachedData) return cachedData;
    
    // Mock implementation - replace with actual API call
    const result = {
      activeUsers: 125, // Mock data
      timestamp: new Date().toISOString()
    };

    // Save to JSON file
    writeJSON('ardor_active_users', result);
    
    return result;
  } catch (error) {
    console.error('Error fetching Ardor active users:', error.message);
    throw new Error(`Failed to fetch Ardor active users: ${error.message}`);
  }
}

module.exports = { getActiveUsers };