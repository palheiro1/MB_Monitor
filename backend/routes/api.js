const express = require('express');
const router = express.Router();

// ...existing code...

// Add this with your other routes
router.get('/morphings', async (req, res) => {
  try {
    const period = req.query.period || '30d';
    console.log(`Processing morphings request with period=${period}`);
    
    const { getMorphings } = require('../services/ardor/morphing');
    const morphingData = await getMorphings(false);
    
    res.json(morphingData);
  } catch (error) {
    console.error('Error processing morphings request:', error);
    res.status(500).json({ error: error.message });
  }
});

// ...existing code...

module.exports = router;