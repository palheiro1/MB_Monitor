/**
 * Morphs API Routes
 * Provides endpoints related to card morphing operations
 */
const express = require('express');
const router = express.Router();
// Use the correct import for the morphing service
const { getMorphings } = require('../services/ardor/morphing');

// Get morphing operations with filtering
router.get('/', async (req, res) => {
  try {
    const period = req.query.period || '30d'; // Default to 30 days
    const forceRefresh = req.query.refresh === 'true'; // Allow force refresh
    
    console.log(`Processing morphings request with period=${period}, forceRefresh=${forceRefresh}`);
    
    // Pass both forceRefresh and period parameters
    const morphingData = await getMorphings(forceRefresh, period);
    
    // Add console log to see what data is being returned
    console.log(`Morphing data received with ${morphingData.morphs?.length || 0} items`);
    
    // Ensure we have the right structure for frontend
    const response = {
      morphs: morphingData.morphs || [],
      count: morphingData.count || 0,
      timestamp: morphingData.timestamp,
      period: period
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching morphing data:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
