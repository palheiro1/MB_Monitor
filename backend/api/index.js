const express = require('express');
const router = express.Router();
const ardorService = require('../services/ardorService');
const polygonService = require('../services/polygonService');
const { readJSON, writeJSON } = require('../utils/jsonStorage');

// Import specific route modules
const ardorRoutes = require('./ardorRoutes');
const polygonRoutes = require('./polygonRoutes');
const cacheRoutes = require('./cacheRoutes');
const craftsRouter = require('./crafts'); // Add this line

// Register routes
router.use('/ardor', ardorRoutes);
router.use('/polygon', polygonRoutes);
router.use('/cache', cacheRoutes);
router.use('/crafts', craftsRouter); // Add this line

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
        polygonTokensCount: polygonTokens.tokens ? polygonTokens.tokens.length : 0,
        totalAssetsTracked: 
          ardorAssets.regularCards.length + 
          ardorAssets.specialCards.length + 
          ardorAssets.specificTokens.length +
          (polygonTokens.tokens ? polygonTokens.tokens.length : 0)
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

module.exports = router;
