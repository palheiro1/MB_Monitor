import { DEFAULT_PERIOD } from './config.js';

/**
 * Application state management
 */
export const state = {
  currentPeriod: DEFAULT_PERIOD,
  activityChart: null,
  networkChart: null,
  lastUpdate: null,
  isLoading: false,
  refreshTimer: null,
  sortDirection: 'desc',
  previousData: {},
  animationsEnabled: true,
  
  // Data storage properties
  statsData: null,
  activityData: null,
  tradesData: null,
  giftzData: null,
  craftsData: null,
  morphsData: null,
  burnsData: null,
  usersData: null,
  cacheData: null
};

/**
 * Update state with new data
 * @param {string} key - State key to update
 * @param {*} value - New value
 */
export function updateState(key, value) {
  if (key in state) {
    state[key] = value;
  }
}

/**
 * Store current data as previous data for comparison
 */
export function storePreviousData() {
  state.previousData = {
    statsData: state.statsData,
    tradesData: state.tradesData,
    giftzData: state.giftzData,
    craftsData: state.craftsData,
    morphsData: state.morphsData,
    burnsData: state.burnsData,
    usersData: state.usersData
  };
}