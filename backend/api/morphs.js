/**
 * Morphs API Routes
 * Provides endpoints related to card morphing operations
 */
const express = require('express');
const router = express.Router();
const { getMorphings } = require('../services/ardor/morphing');

router.get('/', async (req, res) => {
  try {
    const period = req.query.period || '30d'; // Default to 30 days
    const forceRefresh = req.query.refresh === 'true'; // Allow force refresh
    
    console.log(`Processing morphings request with period=${period}, forceRefresh=${forceRefresh}`);
    
    // Pass both forceRefresh and period parameters
    const morphingData = await getMorphings(forceRefresh, period);
    
    // Analyze morphing data quantity information
    if (morphingData.morphs && morphingData.morphs.length > 0) {
      console.log(`Morph data analysis for period ${period}:`);
      
      // Check for quantity values
      const morphsWithQuantity = morphingData.morphs.filter(morph => morph.quantity > 1).length;
      console.log(`${morphsWithQuantity} morphs have quantity > 1`);
      
      if (morphsWithQuantity > 0) {
        // Log some examples
        const examples = morphingData.morphs
          .filter(morph => morph.quantity > 1)
          .slice(0, 3)
          .map(morph => `${morph.id}: quantity=${morph.quantity}`);
        
        console.log(`Examples of morphs with quantity > 1: ${examples.join(', ')}`);
      }
    }
    
    // Always recalculate totalQuantity based on the filtered data
    let totalQuantity = 0;
    
    if (morphingData.morphs && Array.isArray(morphingData.morphs)) {
      for (const morph of morphingData.morphs) {
        // Parse quantity explicitly, with fallback to 1
        const morphQuantity = parseInt(morph.quantity, 10) || 1;
        totalQuantity += morphQuantity;
      }
    }
    
    console.log(`Morphs response: ${morphingData.morphs?.length || 0} morphs with ${totalQuantity} total quantity for period ${period}`);
    
    res.json({
      morphs: morphingData.morphs || [],
      count: morphingData.count || morphingData.morphs?.length || 0,
      timestamp: morphingData.timestamp,
      period: period,
      totalQuantity
    });
  } catch (error) {
    console.error('Error fetching morphing data:', error.message);
    res.status(500).json({ 
      error: error.message,
      morphs: [],
      count: 0,
      totalQuantity: 0
    });
  }
});

module.exports = router;
