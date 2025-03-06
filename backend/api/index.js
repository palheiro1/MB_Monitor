const express = require('express');
const router = express.Router();
const cache = require('../cache');
const ardorService = require('../services/ardorService');
const polygonService = require('../services/polygonService');
const { readJSON, writeJSON } = require('../utils/jsonStorage');

// Import specific route modules
const ardorRoutes = require('./ardorRoutes');
const polygonRoutes = require('./polygonRoutes');

// Register routes
router.use('/ardor', ardorRoutes);
router.use('/polygon', polygonRoutes);

// General status endpoint
router.get('/status', (req, res) => {
  res.json({ status: 'online', timestamp: new Date().toISOString() });
});

// Combined endpoint to get assets from both chains
router.get('/tracked-assets', async (req, res) => {
  try {
    // Check JSON file first
    const cachedData = readJSON('combined_tracked_assets');
    if (cachedData) return res.json(cachedData);
    
    // If not in cache, fetch fresh data from both chains
    const [ardorAssets, polygonTokens] = await Promise.all([
      ardorService.getTrackedAssets(),
      polygonService.getTrackedTokens()
    ]);
    
    const combinedData = {
      ardor: ardorAssets,
      polygon: polygonTokens,
      summary: {
        ardorRegularCardsCount: ardorAssets.regularCards.length,
        ardorSpecialCardsCount: ardorAssets.specialCards.length,
        ardorSpecificTokensCount: ardorAssets.specificTokens.length,
        polygonTokensCount: polygonTokens.tokens.length,
        totalAssetsTracked: 
          ardorAssets.regularCards.length + 
          ardorAssets.specialCards.length + 
          ardorAssets.specificTokens.length +
          polygonTokens.tokens.length
      },
      timestamp: new Date().toISOString()
    };
    
    // Save to JSON file
    writeJSON('combined_tracked_assets', combinedData);
    
    res.json(combinedData);
  } catch (error) {
    console.error('Error in combined tracked assets endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cache status endpoint (for debugging)
router.get('/cache/status', (req, res) => {
  try {
    const stats = cache.stats();
    res.json({
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in cache status endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
