/**
 * Fetch morphing operations
 * @param {string} period - Time period (24h, 7d, 30d, all)
 * @returns {Promise<Object>} Morphing operations data
 */
async function fetchMorphs(period = '30d') {
    try {
        const response = await fetch(`/api/morphs?period=${period}`);
        const data = await response.json();
        
        // Log received data to help debug totalQuantity issues
        console.log(`Received morphs data for period ${period}:`, {
            count: data.morphs?.length || 0,
            totalQuantity: data.totalQuantity,
            periodRequested: period
        });
        
        // Ensure totalQuantity exists on the data object
        if (!data.totalQuantity && data.morphs) {
            data.totalQuantity = data.morphs.reduce((sum, morph) => 
                sum + (parseInt(morph.quantity, 10) || 1), 0);
            console.log(`Had to recalculate totalQuantity: ${data.totalQuantity}`);
        }
        
        return data;
    } catch (error) {
        console.error(`Error fetching morphs data for period ${period}:`, error);
        return { morphs: [], count: 0, totalQuantity: 0 };
    }
}

/**
 * Fetch combined statistics
 * @param {string} period - Time period (24h, 7d, 30d, all)
 * @returns {Promise<Object>} Combined statistics
 */
async function fetchStats(period = '30d') {
  try {
    // FIXED: Add period parameter to API request
    const response = await fetch(`/api/stats?period=${period}`);
    const data = await response.json();
    
    // Add debugging to help verify period handling
    console.log(`Fetched stats for period ${period}:`, {
      trades: data.trades,
      burns: data.burns,
      crafts: data.crafts,
      morphs: data.morphs,
      giftz: data.giftz,
      users: data.users
    });
    
    return data;
  } catch (error) {
    console.error(`Error fetching stats for period ${period}:`, error);
    return {
      trades: 0,
      burns: 0,
      crafts: 0,
      morphs: 0,
      giftz: 0,
      users: 0
    };
  }
}
