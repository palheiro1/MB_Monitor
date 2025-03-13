const fs = require('fs');
const path = require('path');

// Storage directory
const STORAGE_DIR = path.join(__dirname, '../backend/storage');

console.log('Trades Cache Manager');
console.log('-------------------');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  console.log('Storage directory does not exist:', STORAGE_DIR);
  process.exit(1);
}

// Find trade-related cache files
const allFiles = fs.readdirSync(STORAGE_DIR);
const tradeFiles = allFiles.filter(file => 
  file.startsWith('ardor_trades_') || 
  file === 'ardor_trades.json' || 
  file === 'polygon_trades.json'
);

// Display information about trade cache files
console.log(`\nFound ${tradeFiles.length} trade-related cache files:`);
let totalTradeCount = 0;

tradeFiles.forEach(filename => {
  const filePath = path.join(STORAGE_DIR, filename);
  const stats = fs.statSync(filePath);
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    
    const tradeCount = data.ardor_trades?.length || data.count || 0;
    totalTradeCount += tradeCount;
    
    console.log(`  ${filename}: ${tradeCount} trades, ${Math.round(stats.size / 1024)} KB, last updated: ${new Date(stats.mtime).toISOString()}`);
  } catch (e) {
    console.error(`  Error reading ${filename}: ${e.message}`);
  }
});

console.log(`\nTotal trades across all cache files: ${totalTradeCount}`);

// Command line arguments handling
const args = process.argv.slice(2);
const shouldDelete = args.includes('--delete');
const shouldRefresh = args.includes('--refresh');
const shouldView = args.includes('--view');
const targetFile = args.find(arg => arg.startsWith('--file='))?.split('=')[1];

// Delete cache files if requested
if (shouldDelete) {
  if (targetFile) {
    // Delete specific file
    const filePath = path.join(STORAGE_DIR, targetFile);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`\n✅ Deleted ${targetFile}`);
    } else {
      console.log(`\n❌ File not found: ${targetFile}`);
    }
  } else {
    // Delete all trade cache files
    console.log('\nDeleting all trade cache files:');
    tradeFiles.forEach(file => {
      const filePath = path.join(STORAGE_DIR, file);
      try {
        fs.unlinkSync(filePath);
        console.log(`  ✅ Deleted ${file}`);
      } catch (e) {
        console.error(`  ❌ Error deleting ${file}: ${e.message}`);
      }
    });
    console.log('\n✅ All trade cache files deleted');
  }
  
  // Also delete all data cache that might contain trade counts
  const allDataPath = path.join(STORAGE_DIR, 'unified_all_data.json');
  if (fs.existsSync(allDataPath)) {
    try {
      fs.unlinkSync(allDataPath);
      console.log('✅ Deleted all data cache file');
    } catch (e) {
      console.error(`❌ Error deleting all data cache: ${e.message}`);
    }
  }
  
  console.log('\n🔄 Restart the server to rebuild the trade cache');
}

// View specific cache file if requested
if (shouldView && targetFile) {
  const filePath = path.join(STORAGE_DIR, targetFile);
  if (fs.existsSync(filePath)) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(fileContent);
      
      console.log(`\nContents of ${targetFile}:`);
      console.log('--------------------------------------');
      
      // Print main statistics
      console.log(`Timestamp: ${data.timestamp}`);
      console.log(`Period: ${data.period || 'all'}`);
      console.log(`Trade count: ${data.count}`);
      console.log(`Stats: ${JSON.stringify(data.stats || {})}`);
      
      // Print sample trades if available
      if (data.ardor_trades && data.ardor_trades.length > 0) {
        console.log('\nSample trades:');
        data.ardor_trades.slice(0, 3).forEach((trade, i) => {
          console.log(`\nTrade ${i+1}:`);
          console.log(`  ID: ${trade.id}`);
          console.log(`  Card: ${trade.card_name}`);
          console.log(`  Buyer: ${trade.buyer}`);
          console.log(`  Seller: ${trade.seller}`);
          console.log(`  Price: ${trade.price} ${trade.currency}`);
          console.log(`  Time: ${trade.timestampISO}`);
        });
        console.log(`\n... and ${data.ardor_trades.length - 3} more trades`);
      }
    } catch (e) {
      console.error(`Error reading ${targetFile}: ${e.message}`);
    }
  } else {
    console.log(`\n❌ File not found: ${targetFile}`);
  }
}

// Help message if no arguments provided
if (args.length === 0) {
  console.log('\nUsage:');
  console.log('  node scripts/manage-trades-cache.js [options]');
  console.log('\nOptions:');
  console.log('  --delete         Delete all trade cache files');
  console.log('  --file=filename  Operate on specific file (e.g. --file=ardor_trades.json)');
  console.log('  --view           View contents of specified file (use with --file=)');
  console.log('\nExamples:');
  console.log('  node scripts/manage-trades-cache.js --delete');
  console.log('  node scripts/manage-trades-cache.js --delete --file=ardor_trades.json');
  console.log('  node scripts/manage-trades-cache.js --view --file=ardor_trades.json');
}

// Refresh server instruction
if (shouldRefresh) {
  console.log('\nTo force refresh trades after restarting the server:');
  console.log('  curl -X GET "http://localhost:3000/api/ardor/trades?refresh=true&period=all"');
}
