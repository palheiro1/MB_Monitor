/**
 * Charts Component
 * 
 * Handles chart initialization, rendering, and updates.
 */

import { getState, setState } from '../state/index.js';

/**
 * Initialize charts
 */
export function initializeCharts() {
  // Only initialize if Chart.js is available
  if (typeof Chart === 'undefined') {
    console.error('Chart.js not loaded');
    return;
  }
  
  // Initialize activity chart if not already done
  if (!getState('charts.activity')) {
    initActivityChart();
  }
  
  // Initialize network chart if not already done
  if (!getState('charts.network')) {
    initNetworkChart();
  }
}

/**
 * Initialize activity chart
 */
function initActivityChart() {
  const chartElement = document.getElementById('activity-chart');
  if (!chartElement) return;
  
  try {
    const ctx = chartElement.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Loading...'],
        datasets: [{
          label: 'Activity',
          data: [0],
          borderColor: '#5e35b1',
          backgroundColor: 'rgba(94, 53, 177, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          x: { ticks: { maxRotation: 0 } },
          y: { beginAtZero: true }
        }
      }
    });
    
    setState('charts.activity', chart);
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
    updateActivityChart();
    updateNetworkChart();
  } catch (error) {
    console.error('Error updating charts:', error);
  }
}

/**
 * Update activity chart with latest data
 */
function updateActivityChart() {
  const activityChart = getState('charts.activity');
  const activityData = getState('currentData.activityData');
  
  if (!activityChart || !activityData) return;
  
  try {
    // Check if we have real data
    if (!activityData.labels || !Array.isArray(activityData.labels)) {
      console.log('No activity chart data available');
      return;
    }
    
    // Update labels
    activityChart.data.labels = activityData.labels;
    
    // Update datasets
    activityChart.data.datasets = [
      {
        label: 'Trades',
        data: activityData.trades || [],
        borderColor: '#5e35b1',
        backgroundColor: 'rgba(94, 53, 177, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Burns',
        data: activityData.burns || [],
        borderColor: '#d32f2f',
        backgroundColor: 'rgba(211, 47, 47, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Crafts',
        data: activityData.crafts || [],
        borderColor: '#388e3c',
        backgroundColor: 'rgba(56, 142, 60, 0.1)',
        tension: 0.4,
        fill: true
      }
    ];
    
    activityChart.update();
  } catch (error) {
    console.error('Error updating activity chart:', error);
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
