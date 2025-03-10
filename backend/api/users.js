/**
 * Users API Routes
 * Provides endpoints related to user activity
 */
const express = require('express');
const router = express.Router();
const { getActiveUsers: getArdorUsers } = require('../services/ardor/users');
const { filterByPeriod } = require('../utils/filters');

/**
 * @route GET /api/users
 * @description Get active users with optional period filtering
 * @param {string} period - Optional time period filter (24h, 7d, 30d, all)
 */
router.get('/', async (req, res) => {
  try {
    const { period = 'all' } = req.query;
    console.log(`Processing users request with period=${period}`);
    
    // Get active users
    const ardorUsersData = await getArdorUsers();
    
    if (!ardorUsersData) {
      return res.status(404).json({ error: 'No users data available' });
    }
    
    return res.json({
      ardor_users: ardorUsersData.activeUsers || [],
      count: ardorUsersData.activeUsers?.length || 0,
      timestamp: new Date().toISOString(),
      period
    });
  } catch (error) {
    console.error('Error fetching users data:', error);
    return res.status(500).json({ error: 'Failed to fetch users data' });
  }
});

module.exports = router;
