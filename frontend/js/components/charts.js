/**
 * Charts Component
 * 
 * Handles chart initialization, rendering, and updates.
 */

import { getState, setState } from '../state/index.js';
import { fetchActivityData } from '../api/data.js';

/**
 * Initialize charts
 */
export function initializeCharts() {
  console.log('Initializing charts...');
  
  // Only initialize if Chart.js is available
  if (typeof Chart === 'undefined') {
    console.error('Chart.js not loaded');
    return;
  }
  
  // Initialize activity chart if not already done
  if (!getState('charts.activity')) {
    console.log('Initializing activity chart');
    initActivityChart();
  }
  
  // Initialize network chart if not already done
  if (!getState('charts.network')) {
    console.log('Initializing network chart');
    initNetworkChart();
  }
  
  // Set up event listener for period changes
  document.addEventListener('period-changed', async (event) => {
    console.log('Period change event received:', event.detail.period);
    // Update charts with new period
    await updateActivityChartForPeriod(event.detail.period);
  });
  
  // Add a global refresh method
  window.refreshCharts = async () => {
    const currentPeriod = getState('currentPeriod');
    console.log('Manually refreshing charts for period:', currentPeriod);
    await updateActivityChartForPeriod(currentPeriod);
    updateNetworkChart();
  };
  
  console.log('Charts initialized');
}

/**
 * Initialize activity chart
 */
function initActivityChart() {
  const chartElement = document.getElementById('activity-chart');
  if (!chartElement) {
    console.error('Activity chart element not found');
    return;
  }
  
  try {
    const ctx = chartElement.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Loading...'],
        datasets: [
          {
            label: 'Trades',
            data: [0],
            borderColor: '#5e35b1',
            backgroundColor: 'rgba(94, 53, 177, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Burns',
            data: [0],
            borderColor: '#d32f2f',
            backgroundColor: 'rgba(211, 47, 47, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Crafts',
            data: [0],
            borderColor: '#388e3c',
            backgroundColor: 'rgba(56, 142, 60, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Morphs',
            data: [0],
            borderColor: '#ff9800',
            backgroundColor: 'rgba(255, 152, 0, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Giftz Sales',
            data: [0],
            borderColor: '#9c27b0',
            backgroundColor: 'rgba(156, 39, 176, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { 
            position: 'top',
            labels: {
              usePointStyle: true,
              boxWidth: 10,
              padding: 20
            }
          },
          tooltip: { 
            mode: 'index', 
            intersect: false,
            callbacks: {
              title: function(tooltipItems) {
                return tooltipItems[0].label;
              },
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += context.parsed.y;
                }
                return label;
              }
            }
          }
        },
        scales: {
          x: { 
            grid: {
              display: true,
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },
          y: { 
            beginAtZero: true,
            grid: {
              display: true,
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              precision: 0 // Only show integer values
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        },
        animation: {
          duration: 1000
        }
      }
    });
    
    setState('charts.activity', chart);
    
    // Immediately fetch data for the current period
    const currentPeriod = getState('currentPeriod');
    updateActivityChartForPeriod(currentPeriod);
  } catch (error) {
    console.error('Error initializing activity chart:', error);
  }
}

/**
 * Initialize network distribution chart
 */
function initNetworkChart() {
  const chartElement = document.getElementById('network-chart');
  if (!chartElement) return;
  
  try {
    const ctx = chartElement.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Ardor', 'Polygon'],
        datasets: [{
          data: [50, 50],
          backgroundColor: ['#5e35b1', '#3949ab']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' }
        },
        cutout: '65%'
      }
    });
    
    setState('charts.network', chart);
  } catch (error) {
    console.error('Error initializing network chart:', error);
  }
}

/**
 * Update all charts with latest data
 */
export function updateCharts() {
  try {
    const currentPeriod = getState('currentPeriod');
    updateActivityChartForPeriod(currentPeriod);
    updateNetworkChart();
  } catch (error) {
    console.error('Error updating charts:', error);
  }
}

/**
 * Update activity chart for a specific time period
 * @param {string} period - Time period (24h, 7d, 30d, all)
 */
export async function updateActivityChartForPeriod(period) {
  console.log('updateActivityChartForPeriod called with period:', period);
  
  const activityChart = getState('charts.activity');
  if (!activityChart) {
    console.warn('Activity chart not initialized, initializing now...');
    initActivityChart();
    return;
  }
  
  try {
    // Update chart title to show period
    const periodDisplay = getPeriodDisplay(period);
    activityChart.options.plugins.title = {
      display: true,
      text: `Activity Trends (${periodDisplay})`,
      font: {
        size: 16
      }
    };
    
    // Show loading state
    activityChart.data.labels = ['Loading...'];
    activityChart.data.datasets.forEach(dataset => {
      dataset.data = [0];
    });
    activityChart.update('none'); // Update without animation
    
    // Fetch activity data for the selected period
    console.log(`Fetching activity data for period: ${period}`);
    const activityData = await fetchActivityData(period);
    
    if (!activityData || !activityData.labels || !Array.isArray(activityData.labels) || activityData.labels.length === 0) {
      console.warn('No valid activity data received:', activityData);
      activityChart.data.labels = ['No Data Available'];
      activityChart.data.datasets.forEach(dataset => {
        dataset.data = [0];
      });
      activityChart.update();
      return;
    }
    
    // Apply data to chart
    activityChart.data.labels = activityData.labels;
    
    console.log('Setting chart data:', {
      labels: activityData.labels.length,
      trades: activityData.trades?.length || 0,
      burns: activityData.burns?.length || 0
    });
    
    // Update each dataset
    const datasets = [
      { key: 'trades', index: 0 },
      { key: 'burns', index: 1 },
      { key: 'crafts', index: 2 },
      { key: 'morphs', index: 3 },
      { key: 'giftz', index: 4 }
    ];
    
    datasets.forEach(({ key, index }) => {
      if (Array.isArray(activityData[key])) {
        activityChart.data.datasets[index].data = activityData[key];
      } else {
        console.warn(`Missing data for ${key}, using zeros`);
        activityChart.data.datasets[index].data = Array(activityData.labels.length).fill(0);
      }
    });
    
    // Update the chart with animation
    activityChart.update();
    
    console.log('Activity chart updated for period:', period);
  } catch (error) {
    console.error('Error updating activity chart:', error);
    
    // Show error in chart
    if (activityChart) {
      activityChart.data.labels = ['Error loading data'];
      activityChart.data.datasets.forEach(dataset => {
        dataset.data = [0];
      });
      activityChart.update();
    }
  }
}

/**
 * Update network distribution chart
 */
function updateNetworkChart() {
  const networkChart = getState('charts.network');
  const activityData = getState('currentData.activityData');
  
  if (!networkChart || !activityData || !activityData.network_distribution) return;
  
  try {
    // Update data
    networkChart.data.datasets[0].data = [
      activityData.network_distribution.ardor || 50,
      activityData.network_distribution.polygon || 50
    ];
    
    networkChart.update();
  } catch (error) {
    console.error('Error updating network chart:', error);
  }
}

/**
 * Format period for display
 * @param {string} period - Time period code
 * @returns {string} Human-readable period
 */
function getPeriodDisplay(period) {
  switch (period) {
    case '24h': return 'Last 24 Hours';
    case '7d': return 'Last 7 Days';
    case '30d': return 'Last 30 Days';
    case 'all': return 'All Time';
    default: return period;
  }
}

/**
 * Clean up charts (prevent memory leaks)
 */
export function destroyCharts() {
  const activityChart = getState('charts.activity');
  const networkChart = getState('charts.network');
  
  if (activityChart) {
    activityChart.destroy();
    setState('charts.activity', null);
  }
  
  if (networkChart) {
    networkChart.destroy();
    setState('charts.network', null);
  }
}
