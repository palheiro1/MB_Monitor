/**
 * Test Script for API Endpoints
 * Run with: node scripts/test-api.js
 */

const http = require('http');

// Function to make a simple HTTP GET request
async function testEndpoint(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: endpoint,
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`\nEndpoint: ${endpoint}`);
        console.log(`Status: ${res.statusCode}`);
        console.log(`Content-Type: ${res.headers['content-type']}`);
        
        try {
          // Try to parse as JSON
          const jsonData = JSON.parse(data);
          console.log('Response (JSON):', JSON.stringify(jsonData, null, 2).substring(0, 200) + '...');
          resolve({ success: true, status: res.statusCode, data: jsonData });
        } catch (e) {
          // If not JSON, show as text
          console.log('Response (not JSON):', data.substring(0, 100) + '...');
          resolve({ success: false, status: res.statusCode, error: 'Not JSON', data });
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`Error with request to ${endpoint}:`, error);
      reject(error);
    });
    
    req.end();
  });
}

// Test all endpoints
async function runTests() {
  const endpoints = [
    '/api/ping',
    '/api/trades?period=30d',
    '/api/crafts?period=30d',
    '/api/burns?period=30d',
    '/api/cache/status',
    '/api/users?period=30d'
  ];
  
  console.log('Starting API endpoint tests...');
  
  for (const endpoint of endpoints) {
    try {
      await testEndpoint(endpoint);
    } catch (error) {
      console.error(`Test for ${endpoint} failed:`, error);
    }
  }
  
  console.log('\nTests completed.');
}

// Run the tests
runTests();
