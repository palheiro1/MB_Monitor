/**
 * Main API Router
 * Registers all API routes
 */
const express = require('express');
const router = express.Router();
const ardorService = require('../services/ardorService');
const polygonService = require('../services/polygonService');
const { readJSON, writeJSON } = require('../utils/jsonStorage');

// Import specific route modules
const ardorRoutes = require('./ardorRoutes');
const polygonRoutes = require('./polygonRoutes');
const cacheRoutes = require('./cacheRoutes');
const craftsRouter = require('./crafts');
const tradesRouter = require('./trades');
const burnsRouter = require('./burns');
const usersRouter = require('./users');
const morphsRouter = require('./morphs');
const giftzRouter = require('./giftz'); // Add this line
const activityRouter = require('./activity');
const diagnosticRouter = require('./diagnostic'); // Import the diagnostic router

// Register routes
router.use('/ardor', ardorRoutes);
router.use('/polygon', polygonRoutes);
router.use('/cache', cacheRoutes);
router.use('/crafts', craftsRouter);
router.use('/trades', tradesRouter);
router.use('/burns', burnsRouter);
router.use('/users', usersRouter);
router.use('/morphs', morphsRouter);
router.use('/giftz', giftzRouter); // Add this line
router.use('/activity', activityRouter);

// Add diagnostic routes
router.use('/diagnostic', diagnosticRouter); // Add diagnostic endpoint

// Add a simple ping test endpoint
router.get('/ping', (req, res) => {
  res.json({ success: true, message: 'API is working', timestamp: new Date().toISOString() });
});

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
