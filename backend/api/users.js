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
    
    // Get active users - now with unified caching approach
    const usersData = await ardorService.getActiveUsers(period, forceRefresh);
    
    if (!usersData) {
      return res.status(404).json({ error: 'No users data available' });
    }
    
    // Return the data (already filtered by period in the caching layer)
    return res.json({
      ardor_users: usersData.ardor_users || [],
      count: usersData.count || 0,
      timestamp: usersData.timestamp || new Date().toISOString(),
      period
    });
  } catch (error) {
    console.error('Error fetching users data:', error);
    return res.status(500).json({ error: 'Failed to fetch users data' });
  }
});

module.exports = router;
