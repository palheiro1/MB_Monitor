const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan'); // For request logging
require('dotenv').config();

// Import API routes
const apiRoutes = require('./api');

// Import services for initialization
const ardorService = require('./services/ardorService');
const polygonService = require('./services/polygonService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies
app.use(morgan('dev')); // Log HTTP requests
app.use(express.static(path.join(__dirname, '../frontend'))); // Serve static files

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err.stack);
  res.status(500).json({
    error: 'Server error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
  });
});

// API Routes - Mount all routes under /api
app.use('/api', apiRoutes);

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Handle 404 errors
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'The requested resource was not found.' });
});

// Initialize blockchain services
ardorService.init();
polygonService.init();

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend: http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // In a production environment, you might want to exit the process here
  // process.exit(1);
});
