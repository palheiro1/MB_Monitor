/**
 * Application State Manager
 * Centralized state management with pub/sub pattern
 */

// State store
const store = {
  // Application state
  currentPeriod: 'all',
  isLoading: false,
  lastUpdate: null,
  
  // UI state
  activeTabs: {},
  sortDirection: 'desc',
  
  // Data
  data: {
    trades: null,
    burns: null,
    crafts: null,
    morphs: null,
    users: null,
  },
  
  // Previous data for comparison
  prevData: {}
};

// Subscribers
const subscribers = new Map();

/**
 * Get state value
 * @param {string} path - Dot notation path to state value
 * @param {*} defaultValue - Default value if path not found
 * @returns {*} State value
 */
function getState(path = null, defaultValue = null) {
  if (!path) return { ...store };
  
  const parts = path.split('.');
  let current = store;
  
  for (const part of parts) {
    if (current === undefined || current === null || typeof current !== 'object') {
      return defaultValue;
    }
    current = current[part];
  }
  
  return current !== undefined ? current : defaultValue;
}

/**
 * Set state value
 * @param {string} path - Dot notation path to state value
 * @param {*} value - New value
 */
function setState(path, value) {
  if (!path) return;
  
  // Handle special case for root path
  if (path === '*') {
    Object.assign(store, value);
    notifySubscribers('*', store);
    return;
  }
  
  const parts = path.split('.');
  let current = store;
  
  // Navigate to the parent object of the property we want to set
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part];
  }
  
  // Set the value
  const lastPart = parts[parts.length - 1];
  current[lastPart] = value;
  
  // Notify subscribers
  notifySubscribers(path, value);
}

/**
 * Store previous data for comparison
 */
function storePreviousData() {
  store.prevData = JSON.parse(JSON.stringify(store.data));
}

/**
 * Subscribe to state changes
 * @param {string} path - Path to subscribe to
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
function subscribe(path, callback) {
  if (!subscribers.has(path)) {
    subscribers.set(path, new Set());
  }
  
  subscribers.get(path).add(callback);
  
  // Return unsubscribe function
  return () => {
    if (subscribers.has(path)) {
      subscribers.get(path).delete(callback);
    }
  };
}

/**
 * Notify subscribers of state changes
 * @param {string} path - Path that changed
 * @param {*} value - New value
 */
function notifySubscribers(path, value) {
  // Direct path subscribers
  if (subscribers.has(path)) {
    subscribers.get(path).forEach(callback => {
      try {
        callback(value, path);
      } catch (error) {
        console.error(`Error in subscriber for ${path}:`, error);
      }
    });
  }
  
  // Notify parent paths
  const parts = path.split('.');
  for (let i = parts.length - 1; i >= 0; i--) {
    const parentPath = parts.slice(0, i).join('.');
    if (parentPath && subscribers.has(parentPath)) {
      const parentValue = getState(parentPath);
      subscribers.get(parentPath).forEach(callback => {
        try {
          callback(parentValue, path);
        } catch (error) {
          console.error(`Error in subscriber for ${parentPath}:`, error);
        }
      });
    }
  }
  
  // Notify wildcard subscribers
  if (subscribers.has('*')) {
    subscribers.get('*').forEach(callback => {
      try {
        callback(getState(), path);
      } catch (error) {
        console.error('Error in wildcard subscriber:', error);
      }
    });
  }
}

export {
  getState,
  setState,
  subscribe,
  storePreviousData
};
