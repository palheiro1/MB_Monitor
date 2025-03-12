/**
 * Burns API Routes
 * Provides endpoints related to card burns
 */
const express = require('express');
const router = express.Router();
const ardorService = require('../services/ardorService');

router.get('/', async (req, res) => {
  try {
    const period = req.query.period || '30d';
    const forceRefresh = req.query.refresh === 'true';
    
    console.log(`Processing burns request with period=${period}`);
    
    // Get burns data
    const burnsData = await ardorService.getCardBurns(forceRefresh, period);
    
    // Always recalculate totalQuantity based on the filtered data
    let totalQuantity = 0;
    
    if (burnsData.burns && Array.isArray(burnsData.burns)) {
      for (const burn of burnsData.burns) {
        totalQuantity += Number(burn.quantity || burn.quantityQNT || burn.quantityFormatted || 1);
      }
    }
    
    console.log(`Burns response: ${burnsData.burns?.length || 0} burns with ${totalQuantity} total quantity for period ${period}`);
    
    res.json({
      ...burnsData,
      totalQuantity
    });
  } catch (error) {
    console.error('Error fetching burns data:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
