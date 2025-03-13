const express = require('express');
const path = require('path');
const cors = require('cors');
const { ARDOR_API_URL } = require('./config');
const { logApiNodeInfo, checkNodeConnectivity } = require('./utils/apiUtils');
const blockchainService = require('./services/blockchainService');
const unifiedApi = require('./api/unified-api');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Use the unified API router for all API routes
app.use('/api', unifiedApi);

// Add request logger for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Initialize blockchain service
console.log('Initializing blockchain service...');
blockchainService.init();

// Make sure the Ardor node is accessible
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
      console.log(`Health check: http://localhost:${PORT}/api/ping`);
    });
  });

// Catch-all route to serve frontend for client-side routing
app.get('*', (req, res) => {
  // Don't handle API routes here
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});
