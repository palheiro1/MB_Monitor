/**
 * Test script to verify API endpoints
 * Run with: node test-routes.js
 */

const http = require('http');

async function testEndpoint(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/${endpoint}`,
      method: 'GET'
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      
      res.on('end', () => {
        console.log(`Endpoint: /api/${endpoint}`);
        console.log(`Status: ${res.statusCode}`);
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode === 200) {
            console.log('✅ Success:', JSON.stringify(parsed).substring(0, 100) + '...');
          } else {
            console.log('❌ Error:', parsed);
          }
        } catch (e) {
          console.log('❌ Invalid JSON:', data.substring(0, 100));
        }
        resolve(res.statusCode);
      });
    });
    
    req.on('error', error => {
      console.error('❌ Request failed:', error);
      reject(error);
    });
    
    req.end();
  });
}

async function runTests() {
  const endpoints = [
    'ping',
    'trades?period=30d',
    'crafts?period=30d',
    'burns?period=30d',
    'users?period=30d',
    'cache/status'
  ];
  
  console.log('🧪 Testing API endpoints...\n');
  
  for (const endpoint of endpoints) {
    try {
      await testEndpoint(endpoint);
      console.log('-'.repeat(40));
    } catch (error) {
      console.log(`❌ Test for ${endpoint} failed:`, error);
    }
  }
}

runTests();
