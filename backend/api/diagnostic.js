/**
 * Diagnostics API for MB Monitor
 * 
 * Provides endpoints to help diagnose data issues
 */
const express = require('express');
const router = express.Router();
const ardorService = require('../services/ardorService');
const { readJSON } = require('../utils/jsonStorage');
const { filterByPeriod } = require('../utils/cacheUtils');

/**
 * @route GET /api/diagnostic/data-summary
 * @description Get summary of all data sources with counts
 */
router.get('/data-summary', async (req, res) => {
  try {
    // Get cached data for each type
    const morfingCache = readJSON('ardor_morphs');
    const giftzCache = readJSON('giftz_sales');
    const craftsCache = readJSON('ardor_craftings');
    const tradesCache = readJSON('ardor_trades');
    const burnsCache = readJSON('ardor_burns');
    
    // Get period-filtered data
    const periods = ['24h', '7d', '30d', 'all'];
    const result = {};
    
    // Process each data type
    for (const period of periods) {
      result[period] = {
        morphs: morfingCache?.morphs ? 
          filterByPeriod(morfingCache.morphs, period, { timestampField: 'timestamp', dateField: 'timestampISO' }).length : 
          0,
        giftz: giftzCache?.sales ? 
          filterByPeriod(giftzCache.sales, period, { timestampField: 'timestamp', dateField: 'timestampISO' }).length : 
          0,
        crafts: craftsCache?.craftings ? 
          filterByPeriod(craftsCache.craftings, period, { timestampField: 'timestamp', dateField: 'craftDate' }).length : 
          0,
        trades: tradesCache?.ardor_trades ? 
          filterByPeriod(tradesCache.ardor_trades, period, { timestampField: 'timestamp' }).length : 
          0,
        burns: burnsCache?.burns ? 
          filterByPeriod(burnsCache.burns, period, { timestampField: 'timestamp' }).length : 
          0
      };
    }
    
    // Add cache age information
    result.cacheAge = {
      morphs: morfingCache?.timestamp ? 
        Math.round((Date.now() - new Date(morfingCache.timestamp).getTime()) / 60000) + ' min' : 
        'no cache',
      giftz: giftzCache?.timestamp ? 
        Math.round((Date.now() - new Date(giftzCache.timestamp).getTime()) / 60000) + ' min' : 
        'no cache',
      crafts: craftsCache?.timestamp ? 
        Math.round((Date.now() - new Date(craftsCache.timestamp).getTime()) / 60000) + ' min' : 
        'no cache',
      trades: tradesCache?.timestamp ? 
        Math.round((Date.now() - new Date(tradesCache.timestamp).getTime()) / 60000) + ' min' : 
        'no cache',
      burns: burnsCache?.timestamp ? 
        Math.round((Date.now() - new Date(burnsCache.timestamp).getTime()) / 60000) + ' min' : 
        'no cache'
    };
    
    // Add raw counts (before filtering)
    result.rawCounts = {
      morphs: morfingCache?.morphs?.length || 0,
      giftz: giftzCache?.sales?.length || 0,
      crafts: craftsCache?.craftings?.length || 0,
      trades: tradesCache?.ardor_trades?.length || 0,
      burns: burnsCache?.burns?.length || 0
    };
    
    res.json(result);
  } catch (error) {
    console.error('Diagnostic error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/diagnostic/refetch/:dataType
 * @description Force refresh a specific data type
 */
router.get('/refetch/:dataType', async (req, res) => {
  try {
    const dataType = req.params.dataType;
    
    switch(dataType) {
      case 'morphs':
        await ardorService.getMorphings(true);
        break;
      case 'giftz':
        await ardorService.getGiftzSales(true);
        break;
      case 'crafts':
        await ardorService.getCraftings(true);
        break;
      case 'trades':
        await ardorService.getTrades('all', true);
        break;
      case 'burns':
        await ardorService.getCardBurns(true);
        break;
      default:
        return res.status(400).json({ error: 'Unknown data type' });
    }
    
    res.json({ message: `Successfully refreshed ${dataType} data` });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
