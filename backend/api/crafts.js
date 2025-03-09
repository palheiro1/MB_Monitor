/**
 * Crafts API Routes
 * Provides endpoints related to card crafting operations
 */
const express = require('express');
const router = express.Router();
const { getCraftings } = require('../services/ardor/crafting');
const { filterByPeriod } = require('../utils/filters');

/**
 * @route GET /api/crafts
 * @description Get crafting operations with optional period filtering
 * @param {string} period - Optional time period filter (24h, 7d, 30d, all)
 */
router.get('/', async (req, res) => {
  try {
    const { period = 'all' } = req.query;
    console.log(`Processing crafts request with period=${period}`);
    
    // Get all crafting operations
    const craftingData = await getCraftings(false); // Don't force refresh by default
    
    if (!craftingData || !craftingData.craftings) {
      return res.status(404).json({ error: 'No crafting data available' });
    }
    
    // Apply period filtering if needed
    let filteredCraftings = craftingData.craftings;
    if (period !== 'all') {
      filteredCraftings = filterByPeriod(craftingData.craftings, period, 'timestamp');
    }
    
    return res.json({
      craftings: filteredCraftings,
      count: filteredCraftings.length,
      timestamp: craftingData.timestamp,
      period
    });
  } catch (error) {
    console.error('Error fetching crafting data:', error);
    return res.status(500).json({ error: 'Failed to fetch crafting data' });
  }
});

module.exports = router;
