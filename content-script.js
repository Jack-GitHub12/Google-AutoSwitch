// AutoSwitch for Google - Content Script
class AutoSwitchContentManager {
  constructor() {
    this.settings = {};
    this.hoverCache = new Map();
    this.toastTimeout = null;
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.setupHoverPreview();
    this.checkForSwitchNotification();
  }

  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
      this.settings = response || {};
    } catch (error) {
      console.log('Using default settings');
      this.settings = {
        showToast: true,
        hoverPreview: true,
        enableUndo: true
      };
    }
  }

  setupEventListeners() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    
    // Listen for URL changes (for SPAs)
    let currentUrl = window.location.href;
    const urlObserver = new MutationObserver(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        this.onUrlChange();
      }
    });
    
    urlObserver.observe(document.body, { childList: true, subtree: true });
    
    // Check for permission errors when page loads
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.checkPermissionError());
    } else {
      this.checkPermissionError();
    }
  }

  handleMessage(message, sender, sendResponse) {
    switch (message.action) {
      case 'showSwitchNotification':
        this.showSwitchToast(message.data);
        break;
      case 'getSettings':
        sendResponse(this.settings);
        break;
    }
  }

  onUrlChange() {
    // Re-check for permission errors on URL changes
    setTimeout(() => this.checkPermissionError(), 1000);
  }

  checkPermissionError() {
    const errorSelectors = [
      '[data-error-type="permission"]',
      '.error-page-content',
      '[aria-label*="permission"]',
      '.permission-denied'
    ];

    let hasError = false;
    for (const selector of errorSelectors) {
      if (document.querySelector(selector)) {
        hasError = true;
        break;
      }
    }

    if (!hasError) {
      const bodyText = document.body.innerText.toLowerCase();
      hasError = bodyText.includes("don't have permission") || 
                 bodyText.includes("you need permission") ||
                 bodyText.includes("access denied") ||
                 bodyText.includes("request access");
    }

    if (hasError) {
      chrome.runtime.sendMessage({
        action: 'checkPermissionError',
        data: { url: window.location.href, hasError: true }
      });
    }
  }

  setupHoverPreview() {
    if (!this.settings.hoverPreview) return;

    let hoverTimeout;
    let currentTooltip = null;

    // Debounced hover handler
    const handleHover = (event) => {
      const link = event.target.closest('a[href*="docs.google.com"], a[href*="sheets.google.com"], a[href*="slides.google.com"], a[href*="drive.google.com"]');
      
      if (link) {
        clearTimeout(hoverTimeout);
        hoverTimeout = setTimeout(() => {
          this.showHoverPreview(link, event);
        }, 300);
      }
    };

    const handleMouseLeave = (event) => {
      clearTimeout(hoverTimeout);
      if (currentTooltip) {
        currentTooltip.remove();
        currentTooltip = null;
      }
    };

    // Add event listeners
    document.addEventListener('mouseover', handleHover);
    document.addEventListener('mouseleave', handleMouseLeave);
    
    // Store reference to clean up tooltip
    this.cleanupTooltip = handleMouseLeave;
  }

  async showHoverPreview(linkElement, event) {
    const url = linkElement.href;
    if (!url) return;

    // Check cache first
    let previewData = this.hoverCache.get(url);
    
    if (!previewData) {
      // Get account info and check access
      try {
        const accounts = await chrome.runtime.sendMessage({ action: 'getAccounts' });
        const validAccount = accounts[0]; // Simplified for now
        
        previewData = {
          account: validAccount,
          hasAccess: true // Simplified - in real implementation, would check access
        };
        
        this.hoverCache.set(url, previewData);
      } catch (error) {
        return;
      }
    }

    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'autoswitch-hover-tooltip';
    tooltip.style.cssText = `
      position: absolute;
      background: #333;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 10000;
      pointer-events: none;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;

    if (previewData.hasAccess && previewData.account) {
      tooltip.innerHTML = `👤 Open as ${previewData.account.email}`;
    } else {
      tooltip.innerHTML = `⚠️ No access found`;
      tooltip.style.background = '#ea4335';
    }

    // Position tooltip
    const rect = linkElement.getBoundingClientRect();
    tooltip.style.left = (rect.left + window.scrollX) + 'px';
    tooltip.style.top = (rect.bottom + window.scrollY + 5) + 'px';

    document.body.appendChild(tooltip);

    // Auto-remove after delay
    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.remove();
      }
    }, 3000);
  }

  showSwitchToast(data) {
    if (!this.settings.showToast) return;

    // Remove existing toast
    const existingToast = document.getElementById('autoswitch-toast');
    if (existingToast) {
      existingToast.remove();
    }

    // Create toast
    const toast = document.createElement('div');
    toast.id = 'autoswitch-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: #1a73e8;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      max-width: 400px;
      animation: slideIn 0.3s ease-out;
    `;

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(-100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(-100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    // Toast content
    const message = document.createElement('span');
    message.textContent = `Switched to ${data.account.email} ✓`;
    toast.appendChild(message);

    // Undo button
    if (this.settings.enableUndo) {
      const undoButton = document.createElement('button');
      undoButton.textContent = 'Undo';
      undoButton.style.cssText = `
        background: rgba(255,255,255,0.2);
        border: 1px solid rgba(255,255,255,0.3);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      `;
      
      undoButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'undoSwitch' });
        this.hideToast(toast);
      });
      
      toast.appendChild(undoButton);
    }

    document.body.appendChild(toast);

    // Auto-hide after 8 seconds
    this.toastTimeout = setTimeout(() => {
      this.hideToast(toast);
    }, 8000);
  }

  hideToast(toast) {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
      this.toastTimeout = null;
    }
    
    toast.style.animation = 'slideOut 0.3s ease-in forwards';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 300);
  }

  checkForSwitchNotification() {
    // Check if URL has authuser parameter (indicating a recent switch)
    const urlParams = new URLSearchParams(window.location.search);
    const authUser = urlParams.get('authuser');
    
    if (authUser && !sessionStorage.getItem('autoswitch-notified')) {
      // Mark as notified to prevent repeated notifications
      sessionStorage.setItem('autoswitch-notified', 'true');
      
      // Get account info and show notification
      chrome.runtime.sendMessage({ action: 'getAccounts' }, (accounts) => {
        const account = accounts[parseInt(authUser)] || accounts[0];
        if (account) {
          this.showSwitchToast({ account });
        }
      });
    }
  }
}

// Initialize the content manager
const contentManager = new AutoSwitchContentManager(); 