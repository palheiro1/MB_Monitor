/**
 * Crafts API Routes
 * Provides endpoints related to crafting operations
 */
const express = require('express');
const router = express.Router();
const ardorService = require('../services/ardorService');

/**
 * @route GET /api/crafts
 * @description Get crafting operations with optional period filtering
 * @param {string} period - Optional time period filter (24h, 7d, 30d, all)
 */
router.get('/', async (req, res) => {
  try {
    const period = req.query.period || '30d';
    const forceRefresh = req.query.refresh === 'true';
    
    console.log(`Processing crafts request with period=${period}, forceRefresh=${forceRefresh}`);
    
    // Get crafting operations
    const craftsData = await ardorService.getCraftings(forceRefresh, period);
    
    if (!craftsData) {
      return res.status(404).json({ error: 'No crafting data available' });
    }
    
    // Log the data structure to debug
    console.log(`Crafts API response structure: ${JSON.stringify({
      count: craftsData.count || 0,
      hasCrafts: Array.isArray(craftsData.crafts),
      hasCraftings: Array.isArray(craftsData.craftings),
      craftCount: (craftsData.crafts || []).length,
      craftingsCount: (craftsData.craftings || []).length
    })}`);
    
    // Ensure both crafts and craftings properties are available for frontend compatibility
    const response = {
      crafts: craftsData.craftings || craftsData.crafts || [],
      craftings: craftsData.craftings || craftsData.crafts || [],
      count: craftsData.count || 0,
      timestamp: new Date().toISOString(),
      period
    };
    
    return res.json(response);
  } catch (error) {
    console.error('Error fetching crafting data:', error);
    return res.status(500).json({ error: 'Failed to fetch crafting data' });
  }
});

module.exports = router;
