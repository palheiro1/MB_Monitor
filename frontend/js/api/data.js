/**
 * Data API Module
 * 
 * Handles all data fetching from the backend API.
 */

import { API_BASE_URL } from '../config.js';
import { getState, setState } from '../state/index.js';

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

/**
 * Fetch activity data for charts
 * @param {string} period - Time period (24h, 7d, 30d, all)
 * @returns {Promise<Object>} Activity data for charts
 */
export async function fetchActivityData(period = '30d') {
  try {
    console.log(`Fetching activity data for period: ${period}`);
    
    const response = await fetch(`${API_BASE_URL}/activity?period=${period}`);
    if (!response.ok) {
      console.error(`HTTP error ${response.status}`);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`HTTP error ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('Activity data received:', {
      labels: data.labels?.length || 0,
      trades: data.trades?.length || 0,
      burns: data.burns?.length || 0,
      crafts: data.crafts?.length || 0,
      morphs: data.morphs?.length || 0,
      giftz: data.giftz?.length || 0
    });
    
    // Store in state
    setState('currentData.activityData', data);
    
    return data;
  } catch (error) {
    console.error('Error fetching activity data:', error);
    
    // Return empty placeholder data with clear error message
    return {
      labels: ['Error loading data'],
      trades: [0],
      burns: [0],
      crafts: [0],
      morphs: [0],
      giftz: [0],
      error: error.message
    };
  }
}

/**
 * Fetch users data with period filtering
 * @param {string} period - Time period (24h, 7d, 30d, all)
 * @returns {Promise<Object>} Users data
 */
export async function fetchUsersData(period = 'all') {
  try {
    console.log(`Fetching users data for period: ${period}`);
    const response = await fetch(`/api/users?period=${period}`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching users data:', error);
    return { count: 0, ardor_users: [] };
  }
}

/**
 * Fetch morphs data with period filtering
 * @param {string} period - Time period (24h, 7d, 30d, all)
 * @returns {Promise<Object>} Morphs data
 */
export async function fetchMorphsData(period = 'all') {
  try {
    console.log(`Fetching morphs data for period: ${period}`);
    const response = await fetch(`/api/morphs?period=${period}`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching morphs data:', error);
    return { count: 0, morphs: [] };
  }
}

/**
 * Fetch giftz sales data with period filtering
 * @param {string} period - Time period (24h, 7d, 30d, all)
 * @returns {Promise<Object>} Giftz sales data
 */
export async function fetchGiftzSalesData(period = 'all') {
  try {
    console.log(`Fetching giftz sales data for period: ${period}`);
    const response = await fetch(`/api/giftz?period=${period}`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching giftz sales data:', error);
    return { count: 0, sales: [] };
  }
}

/**
 * Fetch trades data
 * @param {string} period - Time period (24h, 7d, 30d, all)
 * @returns {Promise<Object>} Trades data
 */
export async function fetchTrades(period = 'all') {
  try {
    const response = await fetch(`${API_BASE_URL}/trades?period=${period}`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching trades:', error);
    return { ardor_trades: [], polygon_trades: [], count: 0 };
  }
}

/**
 * Fetch burns data
 * @param {string} period - Time period (24h, 7d, 30d, all)
 * @returns {Promise<Object>} Burns data
 */
export async function fetchBurns(period = 'all') {
  try {
    const response = await fetch(`${API_BASE_URL}/burns?period=${period}`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching burns:', error);
    return { burns: [], count: 0 };
  }
}

/**
 * Fetch crafts data
 * @param {string} period - Time period (24h, 7d, 30d, all)
 * @returns {Promise<Object>} Crafts data
 */
export async function fetchCrafts(period = 'all') {
  try {
    const response = await fetch(`${API_BASE_URL}/crafts?period=${period}`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching crafts:', error);
    return { crafts: [], craftings: [], count: 0 };
  }
}

/**
 * Fetch giftz data
 * @param {string} period - Time period (24h, 7d, 30d, all)
 * @returns {Promise<Object>} Giftz data
 */
export async function fetchGiftz(period = 'all') {
  try {
    const response = await fetch(`${API_BASE_URL}/giftz?period=${period}`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching giftz data:', error);
    return { sales: [], count: 0 };
  }
}

/**
 * Fetch users data
 * @param {string} period - Time period (24h, 7d, 30d, all)
 * @returns {Promise<Object>} Users data
 */
export async function fetchUsers(period = 'all') {
  try {
    const response = await fetch(`${API_BASE_URL}/users?period=${period}`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching users:', error);
    return { ardor_users: [], polygon_users: [], count: 0 };
  }
}

// ...existing code for other fetch functions...
