// AutoSwitch for Google - Background Service Worker
class AutoSwitchManager {
  constructor() {
    this.accountCache = new Map();
    this.switchHistory = new Map();
    this.storedAccounts = [];
    this.settings = {
      enabled: true,
      autoSwitch: true,
      showToast: true,
      showDesktopNotification: true,
      enableUndo: true,
      hoverPreview: true,
      contextMenu: true,
      keyboardShortcut: true,
      incognitoMode: false,
      autoSwitchDelay: 5,
      toastDuration: 8
    };
    this.init();
  }

  async init() {
    console.log('🚀 AutoSwitch Background Script initializing...');
    await this.loadSettings();
    this.setupEventListeners();
    this.createContextMenus();
    await this.setupNotificationPermission();
    console.log('✅ AutoSwitch Background Script ready');
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get('autoswitchSettings');
      if (result.autoswitchSettings) {
        this.settings = { ...this.settings, ...result.autoswitchSettings };
      }
      console.log('⚙️ Background: Settings loaded:', this.settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.sync.set({ autoswitchSettings: this.settings });
      console.log('💾 Background: Settings saved');
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  setupEventListeners() {
    // Handle permission errors and auto-switch triggers
    chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
    
    // Handle keyboard shortcuts
    chrome.commands.onCommand.addListener(this.handleCommand.bind(this));
    
    // Handle messages from content scripts and popup
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    
    // Handle context menu clicks
    chrome.contextMenus.onClicked.addListener(this.handleContextMenu.bind(this));
  }

  async createContextMenus() {
    if (!this.settings.contextMenu) return;
    
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'autoswitch-open',
        title: 'Open with AutoSwitch',
        contexts: ['link'],
        targetUrlPatterns: [
          '*://docs.google.com/*',
          '*://sheets.google.com/*',
          '*://slides.google.com/*',
          '*://drive.google.com/*'
        ]
      });
    });
  }

  async setupNotificationPermission() {
    if (this.settings.showDesktopNotification) {
      // Notifications permission is already in manifest
    }
  }

  async handleTabUpdate(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.url) {
      if (this.isGoogleServiceUrl(tab.url)) {
        await this.checkAndHandlePermissionError(tabId, tab.url);
      }
    }
  }

  isGoogleServiceUrl(url) {
    return /https:\/\/(docs|sheets|slides|drive|mail)\.google\.com/.test(url);
  }

  async handleCommand(command) {
    if (command === 'trigger-autoswitch') {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && this.isGoogleServiceUrl(tab.url)) {
        await this.triggerAutoSwitch(tab.id, tab.url);
      }
    }
  }

  async handleMessage(message, sender, sendResponse) {
    console.log('📨 Background received message:', message.action);
    
    try {
      switch (message.action) {
        case 'checkPermissionError':
          await this.handlePermissionError(sender.tab.id, sender.tab.url, message.data);
          sendResponse({ success: true });
          break;
          
        case 'undoSwitch':
          await this.undoLastSwitch(sender.tab.id);
          sendResponse({ success: true });
          break;
          
        case 'updateSettings':
          this.settings = { ...this.settings, ...message.settings };
          await this.saveSettings();
          this.createContextMenus();
          sendResponse({ success: true });
          break;
          
        case 'getSettings':
          sendResponse(this.settings);
          break;
          
        case 'getAccounts':
          const accounts = await this.getSimpleAccountList();
          sendResponse(accounts);
          break;
          
        case 'getStoredAccounts':
          sendResponse(this.storedAccounts);
          break;
          
        case 'detectAccounts':
          // Delegate to content script for comprehensive detection
          if (sender.tab) {
            try {
              const result = await chrome.tabs.sendMessage(sender.tab.id, { action: 'runDetection' });
              sendResponse(result || []);
            } catch (error) {
              console.log('Content script not ready, returning stored accounts');
              sendResponse(this.storedAccounts);
            }
          } else {
            sendResponse(this.storedAccounts);
          }
          break;
          
        case 'switchToAccount':
          await this.switchToAccount(sender.tab.id, message.data);
          sendResponse({ success: true });
          break;
          
        case 'showAccountPicker':
          await this.showAccountPicker(sender.tab.id, message.data);
          sendResponse({ success: true });
          break;
          
        case 'storeAccounts':
          this.storedAccounts = message.data;
          console.log(`💾 Stored ${this.storedAccounts.length} accounts in background`);
          sendResponse({ success: true });
          break;
          
        case 'requestAccess':
          await this.handleAccessRequest(message.data);
          sendResponse({ success: true });
          break;
          
        default:
          console.log('⚠️ Unknown message action:', message.action);
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message });
    }
    
    return true; // Keep message channel open for async response
  }

  async handleContextMenu(info, tab) {
    if (info.menuItemId === 'autoswitch-open') {
      await this.triggerAutoSwitch(tab.id, info.linkUrl);
    }
  }

  async checkAndHandlePermissionError(tabId, url) {
    if (!this.settings.enabled) return;
    
    // The content script will handle permission error detection
    // and send us a message if an error is found
  }

  async handlePermissionError(tabId, url, data) {
    if (!data.hasError) return;
    
    console.log('🚫 Permission error detected, triggering AutoSwitch...');
    await this.triggerAutoSwitch(tabId, url);
  }

  async triggerAutoSwitch(tabId, url) {
    try {
      console.log('🔄 Triggering AutoSwitch for:', url);
      
      // Send message to content script to handle the switching logic
      const result = await chrome.tabs.sendMessage(tabId, { 
        action: 'triggerAutoSwitch',
        data: { url } 
      });
      
      if (result && result.success) {
        console.log('✅ AutoSwitch completed successfully');
        
        // Store switch history for undo
        if (result.switchData) {
          this.switchHistory.set(tabId, {
            ...result.switchData,
            timestamp: Date.now()
          });
          
          // Update last switch time
          await chrome.storage.local.set({ lastSwitch: Date.now() });
        }
        
        // Show desktop notification if enabled
        if (this.settings.showDesktopNotification && result.account) {
          this.showDesktopNotification(result.account);
        }
        
        // Flash badge
        this.flashBadge();
      }
      
    } catch (error) {
      console.error('AutoSwitch error:', error);
      
      // Fallback: try basic account switching
      try {
        await this.basicAccountSwitch(tabId, url);
      } catch (fallbackError) {
        console.error('Fallback switch also failed:', fallbackError);
      }
    }
  }

  async basicAccountSwitch(tabId, url) {
    console.log('🔄 Attempting basic account switch...');
    
    // Simple fallback: try authuser=1 if current is authuser=0 or no authuser
    const urlObj = new URL(url);
    const currentAuthUser = urlObj.searchParams.get('authuser') || '0';
    const newAuthUser = currentAuthUser === '0' ? '1' : '0';
    
    urlObj.searchParams.set('authuser', newAuthUser);
    const newUrl = urlObj.toString();
    
    await chrome.tabs.update(tabId, { url: newUrl });
    
    this.showDesktopNotification({ 
      email: `Account ${newAuthUser}`,
      name: `Account ${newAuthUser}`
    });
    
    this.flashBadge();
  }

  async getSimpleAccountList() {
    // Try to get accounts from active Google tab
    try {
      const googleTabs = await chrome.tabs.query({ 
        url: ['*://*.google.com/*'] 
      });
      
      if (googleTabs.length > 0) {
        for (const tab of googleTabs) {
          try {
            const result = await chrome.tabs.sendMessage(tab.id, { 
              action: 'detectAccounts' 
            });
            
            if (result && result.length > 0) {
              this.storedAccounts = result;
              return result;
            }
          } catch (error) {
            // Tab doesn't have content script, continue to next
            continue;
          }
        }
      }
      
      // Return stored accounts or default
      return this.storedAccounts.length > 0 ? this.storedAccounts : [
        { email: 'account@gmail.com', name: 'Account 1', index: 0 }
      ];
      
    } catch (error) {
      console.error('Failed to get account list:', error);
      return [{ email: 'account@gmail.com', name: 'Account 1', index: 0 }];
    }
  }

  async switchToAccount(tabId, data) {
    try {
      const { account, url } = data;
      console.log(`🔄 Switching to account: ${account.email}`);
      
      // Build URL with authuser parameter
      const urlObj = new URL(url);
      urlObj.searchParams.set('authuser', account.index || 0);
      const newUrl = urlObj.toString();
      
      // Store switch history
      this.switchHistory.set(tabId, {
        originalUrl: url,
        newUrl: newUrl,
        account: account,
        timestamp: Date.now()
      });
      
      // Update the tab
      await chrome.tabs.update(tabId, { url: newUrl });
      
      // Show notifications
      if (this.settings.showDesktopNotification) {
        this.showDesktopNotification(account);
      }
      
      // Send message to content script to show toast
      try {
        await chrome.tabs.sendMessage(tabId, {
          action: 'showSwitchNotification',
          data: { account }
        });
      } catch (error) {
        // Content script might not be ready yet, that's okay
      }
      
      this.flashBadge();
      
      // Update last switch time
      await chrome.storage.local.set({ lastSwitch: Date.now() });
      
    } catch (error) {
      console.error('Failed to switch account:', error);
      throw error;
    }
  }

  showDesktopNotification(account) {
    if (!this.settings.showDesktopNotification) return;
    
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'AutoSwitch',
      message: `Switched to ${account.email}`
    });
  }

  flashBadge() {
    chrome.action.setBadgeText({ text: '✓' });
    chrome.action.setBadgeBackgroundColor({ color: '#4285f4' });
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '' });
    }, 2000);
  }

  async showAccountPicker(tabId, data) {
    try {
      // Send message to content script to show picker
      await chrome.tabs.sendMessage(tabId, {
        action: 'showAccountPicker',
        data: data
      });
    } catch (error) {
      console.error('Failed to show account picker:', error);
    }
  }

  async undoLastSwitch(tabId) {
    const switchData = this.switchHistory.get(tabId);
    if (!switchData) {
      console.log('No switch history found for tab');
      return;
    }
    
    const timeSinceSwitch = Date.now() - switchData.timestamp;
    if (timeSinceSwitch > 30000) { // 30 second limit
      console.log('Switch too old to undo');
      return;
    }
    
    try {
      await chrome.tabs.update(tabId, { url: switchData.originalUrl });
      this.switchHistory.delete(tabId);
      
      if (this.settings.showDesktopNotification) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'AutoSwitch',
          message: 'Account switch undone'
        });
      }
      
    } catch (error) {
      console.error('Failed to undo switch:', error);
    }
  }

  async handleAccessRequest(data) {
    // Open Google's access request dialog
    const requestUrl = `https://accounts.google.com/AccountChooser?continue=${encodeURIComponent(data.url)}`;
    await chrome.tabs.create({ url: requestUrl });
  }
}

// Initialize the manager
const autoswitchManager = new AutoSwitchManager();

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // This will open the popup, no need to handle here
});

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
  console.log('🚀 AutoSwitch service worker started');
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('🎉 AutoSwitch extension installed/updated');
}); 