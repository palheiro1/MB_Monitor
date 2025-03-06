/**
 * Charts Component
 * 
 * Handles chart initialization, rendering, and updates.
 * Uses Chart.js for visualization.
 */

import { getState, setState } from '../state/index.js';
import { getElement } from './ui-manager.js';

/**
 * Initialize charts
 */
export function initializeCharts() {
  // Initialize charts only if they don't already exist
  if (!getState('charts.activity')) {
    initActivityChart();
  }
  
  if (!getState('charts.network')) {
    initNetworkChart();
  }
}

/**
 * Initialize activity chart
 */
function initActivityChart() {
  const chartElement = getElement('activityChart');
  if (!chartElement) return;
  
  const animationsEnabled = getState('animationsEnabled');
  const animationDuration = getState('config.CHART_ANIMATION_DURATION');
  
  const activityChart = new Chart(chartElement, {
    type: 'line',
    data: {
      labels: [],
      datasets: []
    },
    options: {
      responsive: true,
      animation: { duration: animationsEnabled ? animationDuration : 0 },
      plugins: {
        legend: { position: 'top' },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 10
          }
        },
        y: { beginAtZero: true }
      }
    }
  });
  
  setState('charts.activity', activityChart);
}

/**
 * Initialize network distribution chart
 */
function initNetworkChart() {
  const chartElement = getElement('networkChart');
  if (!chartElement) return;
  
  const animationsEnabled = getState('animationsEnabled');
  const animationDuration = getState('config.CHART_ANIMATION_DURATION');
  
  const networkChart = new Chart(chartElement, {
    type: 'doughnut',
    data: {
      labels: ['Ardor', 'Polygon'],
      datasets: [{
        data: [50, 50], // Default placeholder data
        backgroundColor: [
          '#5e35b1', // Ardor color
          '#3949ab'  // Polygon color
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      animation: { duration: animationsEnabled ? animationDuration : 0 },
      plugins: {
        legend: { position: 'bottom' }
      },
      cutout: '65%'
    }
  });
  
  setState('charts.network', networkChart);
}

/**
 * Update all charts with latest data
 */
export function updateCharts() {
  updateActivityChart();
  updateNetworkChart();
}

/**
 * Update activity chart with latest data
 */
function updateActivityChart() {
  const activityChart = getState('charts.activity');
  const activityData = getState('currentData.activityData') || {};
  
  if (!activityChart) return;
  
  // Update chart data
  activityChart.data.labels = activityData.dates || [];
  activityChart.data.datasets = [
    {
      label: 'Trades',
      data: activityData.trades || [],
      borderColor: '#3949ab',
      backgroundColor: 'rgba(57, 73, 171, 0.1)',
      tension: 0.4,
      fill: true
    },
    {
      label: 'Crafts',
      data: activityData.crafts || [],
      borderColor: '#f57c00',
      backgroundColor: 'rgba(245, 124, 0, 0.1)',
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
      label: 'Giftz',
      data: activityData.giftz || [],
      borderColor: '#9c27b0',
      backgroundColor: 'rgba(156, 39, 176, 0.1)',
      tension: 0.4,
      fill: true
    },
    {
      label: 'Morphs',
      data: activityData.morphs || [],
      borderColor: '#00897b',
      backgroundColor: 'rgba(0, 137, 123, 0.1)',
      tension: 0.4,
      fill: true
    }
  ];
  
  activityChart.update('normal');
}

/**
 * Update network distribution chart
 */
function updateNetworkChart() {
  const networkChart = getState('charts.network');
  const activityData = getState('currentData.activityData') || {};
  
  if (!networkChart) return;
  
  // Get network distribution data
  const networkData = activityData.network_distribution || {
    ardor: 50,
    polygon: 50
  };
  
  // Update chart data
  networkChart.data.datasets[0].data = [
    networkData.ardor,
    networkData.polygon
  ];
  
  networkChart.update('normal');
}

/**
 * Destroy all charts to prevent memory leaks
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
