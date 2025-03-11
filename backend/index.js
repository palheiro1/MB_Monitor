const express = require('express');
const path = require('path');
const cors = require('cors');
const api = require('./api');
const ardorService = require('./services/ardorService');
const polygonService = require('./services/polygonService');
const { ARDOR_API_URL, ARDOR_NODE } = require('./config');
const { logApiNodeInfo, checkNodeConnectivity } = require('./utils/apiUtils');
const cacheStatsRoutes = require('./api/cacheStats');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// API routes
app.use('/api', api);
app.use('/api/cache', cacheStatsRoutes);

// Add this BEFORE the catch-all route that serves the HTML
app.use((req, res, next) => {
  console.log(`[DEBUG] Request: ${req.method} ${req.path}`);
  next();
});

// Initialize services
console.log('Initializing blockchain services...');
ardorService.init();
polygonService.init();

// Temporary: Force execution of burn detection on startup
// This ensures the cache is populated immediately instead of waiting for the service cycle
console.log('Running initial burn detection...');
ardorService.getCardBurns().catch(err => console.error('Initial burn detection failed:', err));
// Comment out the GEM burns line until it's implemented
// ardorService.getGEMBurns().catch(err => console.error('Initial GEM burn detection failed:', err));

// Also fetch trade data on startup - fetch all trades, not just 30d
console.log('Running initial trade detection...');
ardorService.getTrades('all', true).catch(err => console.error('Initial trade detection failed:', err));

// Add this with your other initializations - Fix: Changed from await to promise
console.log('Running initial morphing detection...');
ardorService.getMorphings(false).catch(err => console.error('Initial morphing detection failed:', err));

// Fix: Move this catch-all route to AFTER all API routes
// Frontend route - serve index.html
app.get('*', (req, res, next) => {
  // Don't handle API routes here
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

console.log('Starting MB Monitor server...');

// Check connectivity to configured node
checkNodeConnectivity(ARDOR_API_URL)
  .then(isConnected => {
    if (!isConnected) {
      console.log('\n⚠ WARNING: Local node not accessible!');
      console.log('  → Automatically using Jelurida public node as fallback');
      console.log('  → To use your local node, make sure it\'s running on port 27876\n');
    }
    
    logApiNodeInfo(ARDOR_API_URL);
    
    // Start server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Frontend: http://localhost:${PORT}`);
      console.log(`API: http://localhost:${PORT}/api`);
    });
  });
