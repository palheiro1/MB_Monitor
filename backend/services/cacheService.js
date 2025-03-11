/**
 * Unified Cache Service
 * 
 * Centralizes all caching operations for the application with consistent APIs
 */
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

// Cache settings
const CACHE_DIR = path.join(__dirname, '../storage');
const DEFAULT_TTL = 5 * 60; // 5 minutes in seconds
const MAX_MEMORY_ITEMS = 1000; // Maximum items in memory caches
const CLEANUP_INTERVAL = 15 * 60 * 1000; // 15 minutes

// Cache event emitter
const cacheEvents = new EventEmitter();

// Memory caches
const memoryCache = new Map();
const transactionCache = new Map();
const requestCache = new Map();

/**
 * Cache class to standardize operations across different cache stores
 */
class CacheStore {
  constructor(storeName, storeMap) {
    this.name = storeName;
    this.store = storeMap;
    this.maxItems = MAX_MEMORY_ITEMS;
    this.hits = 0;
    this.misses = 0;
    this.lastCleanup = Date.now();
  }

  /**
   * Get item from cache
   */
  get(key) {
    const item = this.store.get(key);
    
    if (!item) {
      this.misses++;
      return undefined;
    }
    
    if (item.expiry && item.expiry < Date.now()) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }
    
    this.hits++;
    return item.value;
  }

  /**
   * Set item in cache
   */
  set(key, value, ttlSeconds = DEFAULT_TTL) {
    // Check if we need to evict items
    if (this.store.size >= this.maxItems) {
      this.evictOldest();
    }
    
    const expiry = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : null;
    this.store.set(key, { 
      value, 
      expiry,
      created: Date.now()
    });
    
    cacheEvents.emit('set', {
      store: this.name,
      key,
      ttl: ttlSeconds
    });
  }

  /**
   * Check if key exists in cache
   */
  has(key) {
    const item = this.store.get(key);
    if (!item) return false;
    
    if (item.expiry && item.expiry < Date.now()) {
      this.store.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete item from cache
   */
  delete(key) {
    const success = this.store.delete(key);
    if (success) {
      cacheEvents.emit('delete', {
        store: this.name,
        key
      });
    }
    return success;
  }

  /**
   * Clear all items from cache
   */
  clear() {
    const size = this.store.size;
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
    
    cacheEvents.emit('clear', {
      store: this.name,
      itemsCleared: size
    });
    
    return size;
  }

  /**
   * Clean up expired items
   */
  cleanup() {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [key, item] of this.store.entries()) {
      if (item.expiry && item.expiry < now) {
        this.store.delete(key);
        expiredCount++;
      }
    }
    
    this.lastCleanup = now;
    
    cacheEvents.emit('cleanup', {
      store: this.name,
      itemsRemoved: expiredCount,
      remaining: this.store.size
    });
    
    return expiredCount;
  }

  /**
   * Evict oldest items when cache is full
   */
  evictOldest() {
    // Convert to array to sort
    const entries = Array.from(this.store.entries())
      .sort((a, b) => a[1].created - b[1].created);
    
    // Remove oldest 10% or at least one item
    const removeCount = Math.max(1, Math.floor(this.store.size * 0.1));
    let removed = 0;
    
    for (let i = 0; i < removeCount && i < entries.length; i++) {
      this.store.delete(entries[i][0]);
      removed++;
    }
    
    cacheEvents.emit('eviction', {
      store: this.name,
      itemsRemoved: removed,
      remaining: this.store.size
    });
    
    return removed;
  }

  /**
   * Get statistics for this cache store
   */
  stats() {
    const now = Date.now();
    let validCount = 0;
    let expiredCount = 0;
    let totalSize = 0;
    
    this.store.forEach((item, key) => {
      if (!item.expiry || item.expiry >= now) {
        validCount++;
        // Rough size estimation
        totalSize += JSON.stringify(item.value).length * 2;
      } else {
        expiredCount++;
      }
    });
    
    return {
      name: this.name,
      size: this.store.size,
      validItems: validCount,
      expiredItems: expiredCount,
      hits: this.hits,
      misses: this.misses,
      hitRatio: this.hits + this.misses > 0 ? 
        (this.hits / (this.hits + this.misses)).toFixed(2) : 0,
      approximateSizeBytes: totalSize,
      lastCleanup: this.lastCleanup
    };
  }
}

/**
 * File cache operations
 */
const fileCache = {
  /**
   * Read from file cache
   */
  read(cacheKey) {
    try {
      const filePath = path.join(CACHE_DIR, `${cacheKey}.json`);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        cacheEvents.emit('miss', {
          store: 'file',
          key: cacheKey,
          reason: 'not-found'
        });
        return null;
      }
      
      // Read and parse file
      const rawData = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(rawData);
      
      cacheEvents.emit('hit', {
        store: 'file',
        key: cacheKey,
        size: rawData.length
      });
      
      return data;
    } catch (error) {
      console.error(`Error reading file cache ${cacheKey}:`, error.message);
      cacheEvents.emit('error', {
        store: 'file',
        key: cacheKey,
        error: error.message,
        operation: 'read'
      });
      
      return null;
    }
  },
  
  /**
   * Write to file cache
   */
  write(cacheKey, data) {
    try {
      // Ensure storage directory exists
      if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
      }
      
      const filePath = path.join(CACHE_DIR, `${cacheKey}.json`);
      
      // Add metadata if not present
      if (typeof data === 'object' && data !== null) {
        if (!data.timestamp) {
          data.timestamp = new Date().toISOString();
        }
        if (!data.cacheVersion) {
          data.cacheVersion = 2; // Increment when schema changes
        }
      }
      
      // Write data to file
      const jsonData = JSON.stringify(data, null, 2);
      fs.writeFileSync(filePath, jsonData, 'utf8');
      
      cacheEvents.emit('set', {
        store: 'file',
        key: cacheKey,
        size: jsonData.length
      });
      
      return true;
    } catch (error) {
      console.error(`Error writing file cache ${cacheKey}:`, error.message);
      cacheEvents.emit('error', {
        store: 'file',
        key: cacheKey,
        error: error.message,
        operation: 'write'
      });
      
      return false;
    }
  },
  
  /**
   * Delete file from cache
   */
  delete(cacheKey) {
    try {
      const filePath = path.join(CACHE_DIR, `${cacheKey}.json`);
      
      if (!fs.existsSync(filePath)) {
        return false;
      }
      
      fs.unlinkSync(filePath);
      
      cacheEvents.emit('delete', {
        store: 'file',
        key: cacheKey
      });
      
      return true;
    } catch (error) {
      console.error(`Error deleting file cache ${cacheKey}:`, error.message);
      cacheEvents.emit('error', {
        store: 'file',
        key: cacheKey,
        error: error.message,
        operation: 'delete'
      });
      
      return false;
    }
  },
  
  /**
   * List all cache files
   */
  list() {
    try {
      if (!fs.existsSync(CACHE_DIR)) {
        return [];
      }
      
      return fs.readdirSync(CACHE_DIR)
        .filter(filename => filename.endsWith('.json'))
        .map(filename => {
          const filePath = path.join(CACHE_DIR, filename);
          const stats = fs.statSync(filePath);
          let metadata = {};
          
          try {
            const rawData = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(rawData);
            
            // Extract common metadata
            metadata = {
              timestamp: data.timestamp || null,
              recordCount: extractRecordCount(data),
              period: data.period || null,
              cacheVersion: data.cacheVersion || 1
            };
          } catch (e) {
            console.error(`Error parsing ${filename}:`, e.message);
          }
          
          return {
            key: filename.replace('.json', ''),
            filename,
            path: filePath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            ...metadata
          };
        });
    } catch (error) {
      console.error('Error listing cache files:', error.message);
      return [];
    }
  },
  
  /**
   * Clear all file caches
   */
  clearAll() {
    try {
      if (!fs.existsSync(CACHE_DIR)) {
        return { success: true, deleted: 0 };
      }
      
      const files = fs.readdirSync(CACHE_DIR)
        .filter(filename => filename.endsWith('.json'));
      
      let deleted = 0;
      
      files.forEach(filename => {
        try {
          fs.unlinkSync(path.join(CACHE_DIR, filename));
          deleted++;
        } catch (e) {
          console.error(`Error deleting ${filename}:`, e.message);
        }
      });
      
      cacheEvents.emit('clear', {
        store: 'file',
        itemsCleared: deleted
      });
      
      return {
        success: true,
        deleted
      };
    } catch (error) {
      console.error('Error clearing file cache:', error.message);
      cacheEvents.emit('error', {
        store: 'file',
        error: error.message,
        operation: 'clearAll'
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// Create cache store instances
const caches = {
  memory: new CacheStore('memory', memoryCache),
  transaction: new CacheStore('transaction', transactionCache),
  request: new CacheStore('request', requestCache),
  file: fileCache
};

/**
 * Helper function to extract record count from cache data
 */
function extractRecordCount(data) {
  if (!data) return 0;
  
  if (Array.isArray(data)) {
    return data.length;
  }
  
  if (data.count !== undefined) {
    return data.count;
  }
  
  // Look for common array properties
  const arrayProps = ['burns', 'craftings', 'crafts', 'trades', 
                     'users', 'transfers', 'morphs', 'morphings', 'sales'];
  
  for (const prop of arrayProps) {
    if (Array.isArray(data[prop])) {
      return data[prop].length;
    }
  }
  
  return 0;
}

/**
 * Check if cached data is still valid
 */
function isCacheValid(data, maxAgeSecs = DEFAULT_TTL) {
  if (!data || !data.timestamp) return false;
  
  const cacheTime = new Date(data.timestamp).getTime();
  const now = Date.now();
  
  // Invalid if timestamp is in future
  if (cacheTime > now) return false;
  
  // Check if cache is too old
  const ageSecs = (now - cacheTime) / 1000;
  return ageSecs <= maxAgeSecs;
}

/**
 * Set up periodic cleanup for all memory caches
 */
function setupCleanupTasks() {
  setInterval(() => {
    Object.values(caches).forEach(cache => {
      if (cache.cleanup) {
        cache.cleanup();
      }
    });
  }, CLEANUP_INTERVAL);
}

// Initialize cleanup
setupCleanupTasks();

/**
 * Get all cache metrics and statistics
 */
function getCacheMetrics() {
  // Memory cache stats
  const memoryCacheStats = {
    memory: caches.memory.stats(),
    transaction: caches.transaction.stats(),
    request: caches.request.stats()
  };
  
  // File cache stats
  const fileCacheList = caches.file.list();
  const fileCacheStats = {
    count: fileCacheList.length,
    totalSize: fileCacheList.reduce((sum, file) => sum + file.size, 0),
    files: fileCacheList
  };
  
  return {
    timestamp: new Date().toISOString(),
    memoryCaches: memoryCacheStats,
    fileCache: fileCacheStats
  };
}

module.exports = {
  memory: caches.memory,
  transaction: caches.transaction,
  request: caches.request,
  file: caches.file,
  getCacheMetrics,
  isCacheValid,
  events: cacheEvents
};
