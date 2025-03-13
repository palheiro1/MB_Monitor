/**
 * Tab Controller
 * Manages tab switching and content rendering
 */

export class TabController {
  constructor() {
    this.tabs = {};
    this.activeTab = null;
    this.eventListeners = {
      tabChanged: []
    };
  }

  /**
   * Initialize tabs from the DOM
   */
  initializeTabs() {
    // Find all tab elements
    const tabElements = document.querySelectorAll('[data-tab-id]');
    
    tabElements.forEach(tabElement => {
      const tabId = tabElement.dataset.tabId;
      const contentId = tabElement.dataset.contentId || `${tabId}-content`;
      const contentElement = document.getElementById(contentId);
      
      if (!contentElement) {
        console.warn(`Tab content not found for tab ${tabId}`);
        return;
      }
      
      // Store tab info
      this.tabs[tabId] = {
        tabElement,
        contentElement,
        isActive: false
      };
      
      // Add click event listener
      tabElement.addEventListener('click', (e) => {
        e.preventDefault();
        this.activateTab(tabId);
      });
    });
    
    // Activate first tab by default if none active
    const activeTabElement = document.querySelector('[data-tab-id].active');
    if (activeTabElement) {
      this.activateTab(activeTabElement.dataset.tabId, false);
    } else if (Object.keys(this.tabs).length > 0) {
      this.activateTab(Object.keys(this.tabs)[0], false);
    }
  }

  /**
   * Activate a specific tab
   * @param {string} tabId - ID of tab to activate
   * @param {boolean} triggerEvent - Whether to trigger change event
   */
  activateTab(tabId, triggerEvent = true) {
    if (!this.tabs[tabId]) {
      console.error(`Tab ${tabId} not found`);
      return;
    }
    
    // Deactivate current tab
    if (this.activeTab && this.tabs[this.activeTab]) {
      this.tabs[this.activeTab].isActive = false;
      this.tabs[this.activeTab].tabElement.classList.remove('active');
      this.tabs[this.activeTab].contentElement.classList.remove('active');
      this.tabs[this.activeTab].contentElement.classList.add('hidden');
    }
    
    // Activate new tab
    this.activeTab = tabId;
    this.tabs[tabId].isActive = true;
    this.tabs[tabId].tabElement.classList.add('active');
    this.tabs[tabId].contentElement.classList.add('active');
    this.tabs[tabId].contentElement.classList.remove('hidden');
    
    // Trigger event
    if (triggerEvent) {
      this.triggerEvent('tabChanged', tabId);
    }
  }

  /**
   * Get currently active tab ID
   */
  getActiveTab() {
    return this.activeTab;
  }

  /**
   * Add event listener
   */
  addEventListener(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  /**
   * Remove event listener
   */
  removeEventListener(event, callback) {
    if (!this.eventListeners[event]) {
      return;
    }
    this.eventListeners[event] = this.eventListeners[event].filter(
      listener => listener !== callback
    );
  }

  /**
   * Trigger event
   */
  triggerEvent(event, data) {
    if (!this.eventListeners[event]) {
      return;
    }
    this.eventListeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${event} event handler:`, error);
      }
    });
  }
}