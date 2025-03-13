/**
 * Chart Manager
 * Manages data visualizations across the application
 */

export class ChartManager {
  constructor() {
    this.charts = {};
    this.chartDefaults = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          mode: 'index',
          intersect: false,
        }
      }
    };
    
    // Color schemes for different chart types
    this.colorSchemes = {
      burns: ['#ff6384', '#ff9f40', '#ffcd56'],
      crafts: ['#4bc0c0', '#36a2eb', '#9966ff'],
      trades: ['#42a5f5', '#7e57c2', '#26a69a'],
      morphs: ['#78909c', '#5c6bc0', '#ec407a']
    };
  }

  /**
   * Initialize all charts with data
   */
  initializeCharts(data) {
    this.initializeActivityChart(data);
    this.initializeCardTypeDistributionChart(data);
    this.initializeRarityDistributionChart(data);
    this.initializeTradePriceChart(data);
  }

  /**
   * Update all charts with new data
   */
  updateCharts(data) {
    this.updateActivityChart(data);
    this.updateCardTypeDistributionChart(data);
    this.updateRarityDistributionChart(data);
    this.updateTradePriceChart(data);
  }

  /**
   * Initialize activity over time chart
   */
  initializeActivityChart(data) {
    const canvas = document.getElementById('activity-chart');
    if (!canvas) return;
    
    const chartData = this.prepareActivityChartData(data);
    
    this.charts.activity = new Chart(canvas, {
      type: 'line',
      data: chartData,
      options: {
        ...this.chartDefaults,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Date'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Number of Transactions'
            },
            beginAtZero: true
          }
        }
      }
    });
  }

  /**
   * Update activity chart with new data
   */
  updateActivityChart(data) {
    if (!this.charts.activity) {
      this.initializeActivityChart(data);
      return;
    }
    
    const chartData = this.prepareActivityChartData(data);
    
    this.charts.activity.data = chartData;
    this.charts.activity.update();
  }

  /**
   * Prepare data for activity chart
   */
  prepareActivityChartData(data) {
    // Group transactions by date
    const dateGroups = {};
    
    // Process burns
    if (data.burns) {
      data.burns.forEach(burn => {
        const date = this.formatDateForGrouping(burn.date);
        dateGroups[date] = dateGroups[date] || { burns: 0, crafts: 0, trades: 0, morphs: 0 };
        dateGroups[date].burns++;
      });
    }
    
    // Process craftings
    if (data.craftings) {
      data.craftings.forEach(craft => {
        const date = this.formatDateForGrouping(craft.date);
        dateGroups[date] = dateGroups[date] || { burns: 0, crafts: 0, trades: 0, morphs: 0 };
        dateGroups[date].crafts++;
      });
    }
    
    // Process trades
    if (data.trades) {
      data.trades.forEach(trade => {
        const date = this.formatDateForGrouping(trade.date);
        dateGroups[date] = dateGroups[date] || { burns: 0, crafts: 0, trades: 0, morphs: 0 };
        dateGroups[date].trades++;
      });
    }
    
    // Process morphs
    if (data.morphs) {
      data.morphs.forEach(morph => {
        const date = this.formatDateForGrouping(morph.date);
        dateGroups[date] = dateGroups[date] || { burns: 0, crafts: 0, trades: 0, morphs: 0 };
        dateGroups[date].morphs++;
      });
    }
    
    // Sort dates
    const sortedDates = Object.keys(dateGroups).sort();
    
    // Prepare chart datasets
    return {
      labels: sortedDates,
      datasets: [
        {
          label: 'Burns',
          data: sortedDates.map(date => dateGroups[date].burns),
          borderColor: this.colorSchemes.burns[0],
          backgroundColor: this.colorSchemes.burns[0] + '80', // With transparency
          fill: false,
          tension: 0.1
        },
        {
          label: 'Crafts',
          data: sortedDates.map(date => dateGroups[date].crafts),
          borderColor: this.colorSchemes.crafts[0],
          backgroundColor: this.colorSchemes.crafts[0] + '80',
          fill: false,
          tension: 0.1
        },
        {
          label: 'Trades',
          data: sortedDates.map(date => dateGroups[date].trades),
          borderColor: this.colorSchemes.trades[0],
          backgroundColor: this.colorSchemes.trades[0] + '80',
          fill: false,
          tension: 0.1
        },
        {
          label: 'Morphs',
          data: sortedDates.map(date => dateGroups[date].morphs),
          borderColor: this.colorSchemes.morphs[0],
          backgroundColor: this.colorSchemes.morphs[0] + '80',
          fill: false,
          tension: 0.1
        }
      ]
    };
  }

  /**
   * Initialize card type distribution chart
   */
  initializeCardTypeDistributionChart(data) {
    const canvas = document.getElementById('card-type-chart');
    if (!canvas) return;
    
    const chartData = this.prepareCardTypeDistributionData(data);
    
    this.charts.cardType = new Chart(canvas, {
      type: 'pie',
      data: chartData,
      options: {
        ...this.chartDefaults,
        plugins: {
          legend: {
            position: 'right',
          }
        }
      }
    });
  }

  /**
   * Update card type distribution chart
   */
  updateCardTypeDistributionChart(data) {
    if (!this.charts.cardType) {
      this.initializeCardTypeDistributionChart(data);
      return;
    }
    
    const chartData = this.prepareCardTypeDistributionData(data);
    
    this.charts.cardType.data = chartData;
    this.charts.cardType.update();
  }

  /**
   * Prepare data for card type distribution chart
   */
  prepareCardTypeDistributionData(data) {
    // Count cards by type
    const typeCounts = { Terrestrial: 0, Aerial: 0, Aquatic: 0, Unknown: 0 };
    
    // Combine all transaction types that have card info
    const allCards = [
      ...(data.burns || []),
      ...(data.craftings || [])
    ];
    
    allCards.forEach(card => {
      const type = card.cardType || 'Unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    
    // Prepare chart data
    return {
      labels: Object.keys(typeCounts),
      datasets: [
        {
          data: Object.values(typeCounts),
          backgroundColor: [
            '#4bc0c0', // Terrestrial
            '#ff6384', // Aerial
            '#36a2eb', // Aquatic
            '#c9cbcf'  // Unknown
          ]
        }
      ]
    };
  }

  /**
   * Initialize rarity distribution chart
   */
  initializeRarityDistributionChart(data) {
    const canvas = document.getElementById('rarity-chart');
    if (!canvas) return;
    
    const chartData = this.prepareRarityDistributionData(data);
    
    this.charts.rarity = new Chart(canvas, {
      type: 'bar',
      data: chartData,
      options: {
        ...this.chartDefaults,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Count'
            }
          }
        }
      }
    });
  }

  /**
   * Update rarity distribution chart
   */
  updateRarityDistributionChart(data) {
    if (!this.charts.rarity) {
      this.initializeRarityDistributionChart(data);
      return;
    }
    
    const chartData = this.prepareRarityDistributionData(data);
    
    this.charts.rarity.data = chartData;
    this.charts.rarity.update();
  }

  /**
   * Prepare data for rarity distribution chart
   */
  prepareRarityDistributionData(data) {
    // Count cards by rarity
    const rarityCounts = { common: 0, rare: 0, 'very rare': 0, legendary: 0, mythical: 0, unknown: 0 };
    
    // Combine all transaction types that have card info
    const allCards = [
      ...(data.burns || []),
      ...(data.craftings || [])
    ];
    
    allCards.forEach(card => {
      const rarity = (card.cardRarity || 'unknown').toLowerCase();
      rarityCounts[rarity] = (rarityCounts[rarity] || 0) + 1;
    });
    
    // Prepare chart data
    return {
      labels: Object.keys(rarityCounts).map(r => r.charAt(0).toUpperCase() + r.slice(1)),
      datasets: [
        {
          label: 'Cards by Rarity',
          data: Object.values(rarityCounts),
          backgroundColor: [
            '#a5d6a7', // Common
            '#4fc3f7', // Rare
            '#ba68c8', // Very Rare
            '#ffd54f', // Legendary
            '#ff8a65', // Mythical
            '#e0e0e0'  // Unknown
          ]
        }
      ]
    };
  }

  /**
   * Initialize trade price chart
   */
  initializeTradePriceChart(data) {
    const canvas = document.getElementById('trade-price-chart');
    if (!canvas) return;
    
    const chartData = this.prepareTradePriceData(data);
    
    this.charts.tradePrice = new Chart(canvas, {
      type: 'line',
      data: chartData,
      options: {
        ...this.chartDefaults,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Date'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Price (GEM)'
            }
          }
        }
      }
    });
  }

  /**
   * Update trade price chart
   */
  updateTradePriceChart(data) {
    if (!this.charts.tradePrice) {
      this.initializeTradePriceChart(data);
      return;
    }
    
    const chartData = this.prepareTradePriceData(data);
    
    this.charts.tradePrice.data = chartData;
    this.charts.tradePrice.update();
  }

  /**
   * Prepare data for trade price chart
   */
  prepareTradePriceData(data) {
    if (!data.trades || data.trades.length === 0) {
      return {
        labels: [],
        datasets: [
          {
            label: 'Average Price',
            data: [],
            borderColor: this.colorSchemes.trades[0],
            backgroundColor: this.colorSchemes.trades[0] + '80',
            fill: false,
            tension: 0.1
          }
        ]
      };
    }
    
    // Group trades by date and calculate average prices
    const dateGroups = {};
    
    data.trades.forEach(trade => {
      const date = this.formatDateForGrouping(trade.date);
      
      if (!dateGroups[date]) {
        dateGroups[date] = {
          sum: 0,
          count: 0
        };
      }
      
      dateGroups[date].sum += parseFloat(trade.price || 0);
      dateGroups[date].count += 1;
    });
    
    // Sort dates
    const sortedDates = Object.keys(dateGroups).sort();
    
    // Calculate average price for each date
    const averagePrices = sortedDates.map(date => {
      const group = dateGroups[date];
      return group.count > 0 ? group.sum / group.count : 0;
    });
    
    // Prepare chart data
    return {
      labels: sortedDates,
      datasets: [
        {
          label: 'Average Price',
          data: averagePrices,
          borderColor: this.colorSchemes.trades[0],
          backgroundColor: this.colorSchemes.trades[0] + '80',
          fill: false,
          tension: 0.1
        }
      ]
    };
  }

  /**
   * Format date for grouping in charts (YYYY-MM-DD)
   */
  formatDateForGrouping(date) {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}
