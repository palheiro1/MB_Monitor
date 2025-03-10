/**
 * Cache Diagnostics Script
 * Helps identify cache files and patterns before migration
 */
const fs = require('fs');
const path = require('path');

// Storage directory
const STORAGE_DIR = path.join(__dirname, '../storage');

// Run diagnostics
async function runDiagnostics() {
  console.log('Running cache diagnostics...');
  
  try {
    // Ensure storage directory exists
    if (!fs.existsSync(STORAGE_DIR)) {
      console.error('Storage directory not found:', STORAGE_DIR);
      return;
    }
    
    // Read all JSON files in the directory
    const files = fs.readdirSync(STORAGE_DIR)
      .filter(filename => filename.endsWith('.json'));
    
    console.log(`Found ${files.length} JSON files in ${STORAGE_DIR}`);
    
    // Group files by base name (without period suffix)
    const groupedFiles = {};
    
    files.forEach(filename => {
      // Extract base name and period (if any)
      // Format could be either ardor_type_period.json or ardor_type.json
      let baseName, period;
      
      if (filename.includes('_24h.') || filename.includes('_7d.') || 
          filename.includes('_30d.') || filename.includes('_all.')) {
        // Has period suffix
        const parts = filename.split('_');
        period = parts.pop().replace('.json', '');
        baseName = parts.join('_');
      } else {
        // No period suffix
        baseName = filename.replace('.json', '');
        period = null;
      }
      
      if (!groupedFiles[baseName]) {
        groupedFiles[baseName] = [];
      }
      
      groupedFiles[baseName].push({
        filename,
        period,
        path: path.join(STORAGE_DIR, filename)
      });
    });
    
    // Print grouped files
    console.log('\nFiles grouped by base name:');
    for (const [baseName, files] of Object.entries(groupedFiles)) {
      console.log(`\n${baseName}:`);
      files.forEach(file => {
        const stats = fs.statSync(file.path);
        console.log(`  - ${file.filename} (${formatBytes(stats.size)}, period: ${file.period || 'none'})`);
      });
    }
    
    // Suggest migration strategy
    console.log('\n\nSuggested Migration Strategy:');
    
    for (const [baseName, files] of Object.entries(groupedFiles)) {
      const hasPeriodFiles = files.some(file => file.period !== null);
      const hasUnifiedFile = files.some(file => file.period === null);
      
      if (hasPeriodFiles && !hasUnifiedFile) {
        console.log(`✅ Migrate ${baseName}_* files to a single ${baseName}.json`);
      } else if (hasPeriodFiles && hasUnifiedFile) {
        console.log(`⚠️ ${baseName} has both period files and a unified file. Manual check needed.`);
      } else if (!hasPeriodFiles && hasUnifiedFile) {
        console.log(`✓ ${baseName} already has a unified format, no migration needed`);
      }
    }
    
  } catch (error) {
    console.error('Error running diagnostics:', error);
  }
}

// Helper function to format bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Run the diagnostics
runDiagnostics();
