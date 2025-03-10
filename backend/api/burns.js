/**
 * Burns API Routes
 * Provides endpoints related to card burning operations
 */
const express = require('express');
const router = express.Router();
const { getCardBurns } = require('../services/ardor/burns');
const { filterByPeriod } = require('../utils/filters');

/**
 * @route GET /api/burns
 * @description Get card burning operations with optional period filtering
 * @param {string} period - Optional time period filter (24h, 7d, 30d, all)
 */
router.get('/', async (req, res) => {
  try {
    const { period = 'all' } = req.query;
    console.log(`Processing burns request with period=${period}`);
    
    // Get all burning operations
    const burnsData = await getCardBurns(false); // Don't force refresh by default
    
    if (!burnsData || !burnsData.burns) {
      return res.status(404).json({ error: 'No burns data available' });
    }
    
    // Apply period filtering if needed
    let filteredBurns = burnsData.burns;
    if (period !== 'all') {
      filteredBurns = filterByPeriod(burnsData.burns, period, 'timestamp');
    }
    
    return res.json({
      burns: filteredBurns,
      count: filteredBurns.length,
      timestamp: burnsData.timestamp,
      period
    });
  } catch (error) {
    console.error('Error fetching burns data:', error);
    return res.status(500).json({ error: 'Failed to fetch burns data' });
  }
});

module.exports = router;
