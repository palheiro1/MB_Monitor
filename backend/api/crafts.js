/**
 * Crafts API Routes
 * Provides endpoints related to card crafting operations
 */
const express = require('express');
const router = express.Router();
const ardorService = require('../services/ardorService');

router.get('/', async (req, res) => {
  try {
    const period = req.query.period || '30d';
    const forceRefresh = req.query.refresh === 'true';
    
    console.log(`Processing crafts request with period=${period}, forceRefresh=${forceRefresh}`);
    
    // Get craftings data with proper period filtering
    const craftData = await ardorService.getCraftings(forceRefresh, period);
    
    // Always recalculate totalQuantity based on the filtered data
    let totalQuantity = 0;
    
    if (craftData.craftings && Array.isArray(craftData.craftings)) {
      for (const craft of craftData.craftings) {
        totalQuantity += Number(craft.outputQuantity || craft.cardsUsed || 1);
      }
    }
    
    console.log(`Crafts response: ${craftData.craftings?.length || 0} crafts with ${totalQuantity} total quantity for period ${period}`);
    
    // Ensure both 'crafts' and 'craftings' fields exist
    if (craftData.craftings && !craftData.crafts) {
      craftData.crafts = craftData.craftings;
    } else if (craftData.crafts && !craftData.craftings) {
      craftData.craftings = craftData.crafts;
    }
    
    res.json({
      ...craftData,
      totalQuantity
    });
  } catch (error) {
    console.error('Error fetching craft data:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
