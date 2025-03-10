/**
 * Morphs API Routes
 * Provides endpoints related to card morphing operations
 */
const express = require('express');
const router = express.Router();
const ardorService = require('../services/ardorService');

// Get morphing operations with filtering
router.get('/', async (req, res) => {
  try {
    const period = req.query.period || '30d'; // Default to 30 days
    const forceRefresh = req.query.refresh === 'true'; // Allow force refresh
    
    console.log(`Processing morphings request with period=${period}, forceRefresh=${forceRefresh}`);
    
    const morphingData = await ardorService.getMorphings(forceRefresh);
    
    // Add console log to see what data is being returned
    console.log(`Morphing data structure: ${JSON.stringify({
      count: morphingData.count || 0,
      hasData: !!morphingData.morphings || !!morphingData.morphs,
      morphsLength: (morphingData.morphings || morphingData.morphs || []).length
    })}`);
    
    // Ensure we have the right structure for frontend
    // The frontend expects an array of morph objects in the 'morphs' property
    const response = {
      morphs: Array.isArray(morphingData.morphings) ? morphingData.morphings : 
             (Array.isArray(morphingData.morphs) ? morphingData.morphs : []),
      count: morphingData.count || 0,
      timestamp: morphingData.timestamp
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching morphing data:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
