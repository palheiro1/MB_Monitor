const fs = require('fs');
const path = require('path');

// Storage directory
const STORAGE_DIR = path.join(__dirname, '../backend/storage');

console.log('Cache management utility');
console.log('------------------------');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  console.log('Storage directory does not exist:', STORAGE_DIR);
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
  console.log('Created storage directory');
} else {
  console.log('Storage directory exists:', STORAGE_DIR);
}

// Get all JSON files in storage directory
const files = fs.readdirSync(STORAGE_DIR)
  .filter(filename => filename.endsWith('.json'));

console.log(`\nFound ${files.length} cache files:`);

// List all cache files with details
files.forEach(filename => {
  const filePath = path.join(STORAGE_DIR, filename);
  const stats = fs.statSync(filePath);
  
  // Try to read file contents
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(fileContent);
    let count = 0;
    
    // Extract count from different cache formats
    if (parsed.count !== undefined) {
      count = parsed.count;
    } else if (parsed.burns && Array.isArray(parsed.burns)) {
      count = parsed.burns.length;
    } else if (parsed.craftings && Array.isArray(parsed.craftings)) {
      count = parsed.craftings.length;
    } else if (Array.isArray(parsed)) {
      count = parsed.length;
    }
    
    console.log(`  ${filename}: ${count} records, ${Math.round(stats.size / 1024)} KB, modified ${stats.mtime.toISOString()}`);
  } catch (e) {
    console.log(`  ${filename}: ERROR reading file - ${e.message}`);
  }
});

// Clear all cache files if requested
if (process.argv.includes('--clear')) {
  console.log('\nClearing all cache files...');
  
  files.forEach(filename => {
    const filePath = path.join(STORAGE_DIR, filename);
    fs.unlinkSync(filePath);
    console.log(`  Deleted ${filename}`);
  });
  
  console.log('Cache cleared successfully!');
}

// Show help message
if (!process.argv.includes('--clear')) {
  console.log('\nTo clear all cache files, run:');
  console.log('  node scripts/clear-cache.js --clear');
}
