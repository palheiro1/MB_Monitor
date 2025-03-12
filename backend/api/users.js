/**
 * Users API Routes
 * Provides endpoints related to user activity
 */
const express = require('express');
const router = express.Router();
const ardorService = require('../services/ardorService');

/**
 * @route GET /api/users
 * @description Get active users with optional period filtering
 * @param {string} period - Optional time period filter (24h, 7d, 30d, all)
 * @param {boolean} refresh - Whether to force cache refresh
 */
router.get('/', async (req, res) => {
  try {
    const period = req.query.period || 'all';
    const forceRefresh = req.query.refresh === 'true';
    
    console.log(`Processing users request with period=${period}, forceRefresh=${forceRefresh}`);
    
    // Get active users
    const usersData = await ardorService.getActiveUsers(forceRefresh);
    
    if (!usersData) {
      return res.status(404).json({ error: 'No users data available' });
    }
    
    // Apply period filtering if needed
    let filteredData = usersData;
    if (period !== 'all' && usersData.ardor_users) {
      // Import the utility for filtering
      const { filterByPeriod } = require('../utils/cacheUtils');
      
      // Filter users by last_seen date
      const filteredUsers = filterByPeriod(
        usersData.ardor_users,
        period,
        { dateField: 'last_seen' }
      );
      
      // Create a new object with filtered users
      filteredData = {
        ...usersData,
        ardor_users: filteredUsers,
        count: filteredUsers.length
      };
    }
    
    // Log what we're sending back for debugging
    console.log(`Returning users data with count: ${filteredData.count || 0} for period: ${period}`);
    
    // Return the filtered data
    return res.json({
      ardor_users: filteredData.ardor_users || [],
      count: filteredData.count || 0,
      timestamp: filteredData.timestamp || new Date().toISOString(),
      period
    });
  } catch (error) {
    console.error('Error fetching users data:', error);
    return res.status(500).json({ error: 'Failed to fetch users data' });
  }
});

module.exports = router;
