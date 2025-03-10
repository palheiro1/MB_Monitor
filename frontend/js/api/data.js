import { API_BASE_URL } from '../config.js';
import { setState } from '../state/index.js';

/**
 * Fetch all transaction data from the API
 * @param {string} period - Time period to filter (24h, 7d, 30d, all)
 * @returns {Promise<Object>} Combined data object
 */
export async function fetchAllData(period = '30d') {
  try {
    // Fetch all data in parallel
    const [tradesData, craftsData, morphsData, burnsData, usersData, giftzData] = await Promise.all([
      fetchTrades(period),
      fetchCrafts(period),
      fetchMorphs(period), // Make sure this is included
      fetchBurns(period),
      fetchUsers(period),
      fetchGiftz(period)
    ]);
    
    // Combine all data into a single object
    const allData = {
      tradesData,
      craftsData,
      morphsData, // Include morphs data
      burnsData,
      usersData,
      giftzData,
      timestamp: new Date().toISOString()
    };
    
    // Update state with new data
    setState('currentData', allData);
    
    return allData;
  } catch (error) {
    console.error('Error fetching all data:', error);
    throw error;
  }
}

/**
 * Fetch morph data from API
 * @param {string} period - Time period (24h, 7d, 30d, all)
 * @returns {Promise<Object>} Morphs data
 */
export async function fetchMorphs(period = '30d') {
  try {
    const response = await fetch(`${API_BASE_URL}/morphs?period=${period}`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching morphs:', error);
    return { morphs: [], count: 0 };
  }
}

// ...existing code for other fetch functions...
