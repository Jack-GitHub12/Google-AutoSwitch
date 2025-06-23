// AutoSwitch for Google - Background Service Worker
class AutoSwitchManager {
  constructor() {
    this.accountCache = new Map();
    this.switchHistory = new Map();
    this.settings = {
      enabled: true,
      showToast: true,
      showDesktopNotification: true,
      enableUndo: true,
      hoverPreview: true,
      contextMenu: true,
      keyboardShortcut: true
    };
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.createContextMenus();
    await this.setupNotificationPermission();
  }

  async loadSettings() {
    const result = await chrome.storage.sync.get('autoswitchSettings');
    if (result.autoswitchSettings) {
      this.settings = { ...this.settings, ...result.autoswitchSettings };
    }
  }

  async saveSettings() {
    await chrome.storage.sync.set({ autoswitchSettings: this.settings });
  }

  setupEventListeners() {
    // Handle permission errors and auto-switch triggers
    chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
    
    // Handle keyboard shortcuts
    chrome.commands.onCommand.addListener(this.handleCommand.bind(this));
    
    // Handle messages from content scripts
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
    return /https:\/\/(docs|sheets|slides|drive)\.google\.com/.test(url);
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
    switch (message.action) {
      case 'checkPermissionError':
        await this.handlePermissionError(sender.tab.id, sender.tab.url, message.data);
        break;
      case 'undoSwitch':
        await this.undoLastSwitch(sender.tab.id);
        break;
      case 'updateSettings':
        this.settings = { ...this.settings, ...message.settings };
        await this.saveSettings();
        this.createContextMenus();
        break;
      case 'getAccounts':
        sendResponse(await this.getGoogleAccounts());
        break;
      case 'requestAccess':
        await this.handleAccessRequest(message.data);
        break;
    }
  }

  async handleContextMenu(info, tab) {
    if (info.menuItemId === 'autoswitch-open') {
      await this.triggerAutoSwitch(tab.id, info.linkUrl);
    }
  }

  async checkAndHandlePermissionError(tabId, url) {
    if (!this.settings.enabled) return;
    
    // Inject content script to check for permission errors
    await chrome.scripting.executeScript({
      target: { tabId },
      func: this.detectPermissionError,
    });
  }

  // Function to be injected into page
  detectPermissionError() {
    const errorSelectors = [
      '[data-error-type="permission"]',
      '.error-page-content',
      '[aria-label*="permission"]',
      '.permission-denied',
      'div:contains("don\'t have permission")',
      'div:contains("You need permission")'
    ];

    for (const selector of errorSelectors) {
      if (document.querySelector(selector)) {
        chrome.runtime.sendMessage({
          action: 'checkPermissionError',
          data: { url: window.location.href, hasError: true }
        });
        return;
      }
    }

    // Check for specific error text
    const bodyText = document.body.innerText.toLowerCase();
    if (bodyText.includes("don't have permission") || 
        bodyText.includes("you need permission") ||
        bodyText.includes("access denied")) {
      chrome.runtime.sendMessage({
        action: 'checkPermissionError',
        data: { url: window.location.href, hasError: true }
      });
    }
  }

  async handlePermissionError(tabId, url, data) {
    if (!data.hasError) return;
    
    console.log('Permission error detected, scanning accounts...');
    await this.triggerAutoSwitch(tabId, url);
  }

  async triggerAutoSwitch(tabId, url) {
    try {
      const accounts = await this.getGoogleAccounts();
      const validAccounts = await this.scanAccountsForAccess(url, accounts);
      
      if (validAccounts.length === 0) {
        await this.showFallbackModal(tabId, url);
      } else if (validAccounts.length === 1) {
        await this.performAutoSwitch(tabId, url, validAccounts[0]);
      } else {
        await this.showAccountPicker(tabId, url, validAccounts);
      }
    } catch (error) {
      console.error('AutoSwitch error:', error);
    }
  }

  async getGoogleAccounts() {
    // Get Google accounts from cookies or other available methods
    try {
      const [tab] = await chrome.tabs.query({ url: '*://accounts.google.com/*' });
      if (tab) {
        // If accounts page is available, extract account info
        const result = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: this.extractAccountsFromPage
        });
        return result[0]?.result || [];
      }
      
      // Fallback: try to detect from any Google service
      const googleTabs = await chrome.tabs.query({ url: '*://*.google.com/*' });
      if (googleTabs.length > 0) {
        const result = await chrome.scripting.executeScript({
          target: { tabId: googleTabs[0].id },
          func: this.extractAccountsFromGoogleService
        });
        return result[0]?.result || [];
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get Google accounts:', error);
      return [];
    }
  }

  // Function to be injected to extract accounts
  extractAccountsFromPage() {
    const accounts = [];
    // Try to find account elements in various Google service UIs
    const accountElements = document.querySelectorAll('[data-email], [aria-label*="@"], .gb_B, .gb_Ab');
    
    accountElements.forEach((el, index) => {
      const email = el.dataset.email || el.getAttribute('aria-label') || el.textContent;
      if (email && email.includes('@')) {
        accounts.push({
          email: email.trim(),
          index: index,
          name: email.split('@')[0]
        });
      }
    });
    
    return accounts.length > 0 ? accounts : [{ email: 'default@gmail.com', index: 0, name: 'default' }];
  }

  extractAccountsFromGoogleService() {
    const accounts = [];
    // Extract from account switcher or profile elements
    const profileElements = document.querySelectorAll('[data-email], .gb_Ab, [role="menuitem"]');
    
    profileElements.forEach((el, index) => {
      const text = el.textContent || el.getAttribute('aria-label') || '';
      const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (emailMatch) {
        accounts.push({
          email: emailMatch[0],
          index: index,
          name: emailMatch[0].split('@')[0]
        });
      }
    });
    
    return accounts.length > 0 ? accounts : [{ email: 'default@gmail.com', index: 0, name: 'default' }];
  }

  async scanAccountsForAccess(url, accounts) {
    const validAccounts = [];
    
    for (const account of accounts) {
      const testUrl = this.buildAuthUserUrl(url, account.index);
      const hasAccess = await this.testAccountAccess(testUrl);
      
      if (hasAccess) {
        validAccounts.push(account);
      }
    }
    
    return validAccounts;
  }

  buildAuthUserUrl(url, accountIndex) {
    const urlObj = new URL(url);
    urlObj.searchParams.set('authuser', accountIndex.toString());
    return urlObj.toString();
  }

  async testAccountAccess(url) {
    try {
      // Create a temporary tab to test access
      const tab = await chrome.tabs.create({ url, active: false });
      
      // Wait a moment for the page to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if there's a permission error
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const bodyText = document.body.innerText.toLowerCase();
          return !bodyText.includes("don't have permission") && 
                 !bodyText.includes("you need permission") &&
                 !bodyText.includes("access denied");
        }
      });
      
      // Close the test tab
      await chrome.tabs.remove(tab.id);
      
      return result[0]?.result || false;
    } catch (error) {
      return false;
    }
  }

  async performAutoSwitch(tabId, url, account) {
    const newUrl = this.buildAuthUserUrl(url, account.index);
    
    // Store switch history for undo
    this.switchHistory.set(tabId, {
      originalUrl: url,
      newUrl: newUrl,
      account: account,
      timestamp: Date.now()
    });
    
    // Update the tab
    await chrome.tabs.update(tabId, { url: newUrl });
    
    // Show notifications
    await this.showSwitchNotification(account);
    
    // Flash badge
    if (this.settings.showDesktopNotification) {
      this.flashBadge();
    }
  }

  async showSwitchNotification(account) {
    // Desktop notification
    if (this.settings.showDesktopNotification) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'AutoSwitch',
        message: `You're now viewing with ${account.email}`
      });
    }
    
    // In-page toast will be handled by content script
  }

  flashBadge() {
    chrome.action.setBadgeText({ text: '✓' });
    chrome.action.setBadgeBackgroundColor({ color: '#4285f4' });
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '' });
    }, 1000);
  }

  async showAccountPicker(tabId, url, validAccounts) {
    // Send message to content script to show picker modal
    await chrome.scripting.executeScript({
      target: { tabId },
      func: this.injectAccountPicker,
      args: [validAccounts, url]
    });
  }

  // Function to be injected to show account picker
  injectAccountPicker(validAccounts, url) {
    // Remove existing picker if any
    const existingPicker = document.getElementById('autoswitch-account-picker');
    if (existingPicker) {
      existingPicker.remove();
    }

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'autoswitch-account-picker';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      border-radius: 8px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;

    modal.innerHTML = `
      <h3 style="margin: 0 0 16px 0; color: #1a73e8;">Choose Account</h3>
      <p style="margin: 0 0 16px 0; color: #5f6368;">Multiple accounts have access. Which would you like to use?</p>
      <div id="account-list"></div>
      <div style="margin-top: 16px; display: flex; gap: 8px; justify-content: flex-end;">
        <button id="cancel-btn" style="padding: 8px 16px; border: 1px solid #dadce0; background: white; border-radius: 4px; cursor: pointer;">Cancel</button>
        <button id="open-btn" style="padding: 8px 16px; background: #1a73e8; color: white; border: none; border-radius: 4px; cursor: pointer;">Open</button>
      </div>
    `;

    const accountList = modal.querySelector('#account-list');
    let selectedAccount = validAccounts[0];

    validAccounts.forEach((account, index) => {
      const accountDiv = document.createElement('div');
      accountDiv.style.cssText = `
        display: flex;
        align-items: center;
        padding: 8px;
        margin: 4px 0;
        border: 1px solid #dadce0;
        border-radius: 4px;
        cursor: pointer;
        ${index === 0 ? 'background: #e8f0fe;' : ''}
      `;
      
      accountDiv.innerHTML = `
        <input type="radio" name="account" value="${index}" ${index === 0 ? 'checked' : ''} style="margin-right: 8px;">
        <div>
          <div style="font-weight: 500;">${account.email}</div>
          <div style="font-size: 12px; color: #5f6368;">${account.name}</div>
        </div>
      `;

      accountDiv.addEventListener('click', () => {
        accountList.querySelectorAll('input[type="radio"]').forEach(radio => radio.checked = false);
        accountDiv.querySelector('input').checked = true;
        selectedAccount = account;
        
        accountList.querySelectorAll('div').forEach(div => div.style.background = '');
        accountDiv.style.background = '#e8f0fe';
      });

      accountList.appendChild(accountDiv);
    });

    // Handle buttons
    modal.querySelector('#cancel-btn').addEventListener('click', () => {
      overlay.remove();
    });

    modal.querySelector('#open-btn').addEventListener('click', () => {
      const newUrl = url.includes('?') 
        ? `${url}&authuser=${selectedAccount.index}`
        : `${url}?authuser=${selectedAccount.index}`;
      
      window.location.href = newUrl;
      overlay.remove();
    });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  async showFallbackModal(tabId, url) {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: this.injectFallbackModal,
      args: [url]
    });
  }

  // Function to be injected to show fallback modal
  injectFallbackModal(url) {
    const overlay = document.createElement('div');
    overlay.id = 'autoswitch-fallback-modal';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      border-radius: 8px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;

    const title = document.title || 'Document';
    modal.innerHTML = `
      <h3 style="margin: 0 0 16px 0; color: #ea4335;">No Access Found</h3>
      <p style="margin: 0 0 16px 0; color: #5f6368;">None of your Google accounts have access to this document.</p>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <button id="request-access-btn" style="padding: 12px; background: #1a73e8; color: white; border: none; border-radius: 4px; cursor: pointer;">Request Access from Owner</button>
        <button id="retry-btn" style="padding: 12px; border: 1px solid #dadce0; background: white; border-radius: 4px; cursor: pointer;">Retry Now</button>
        <button id="native-dialog-btn" style="padding: 12px; border: 1px solid #dadce0; background: white; border-radius: 4px; cursor: pointer;">Open Google's Permission Dialog</button>
        <button id="close-btn" style="padding: 12px; border: 1px solid #dadce0; background: white; border-radius: 4px; cursor: pointer;">Close</button>
      </div>
    `;

    // Handle buttons
    modal.querySelector('#request-access-btn').addEventListener('click', () => {
      const subject = encodeURIComponent(`Access request for ${title}`);
      const body = encodeURIComponent(`Hi, I need access to this document: ${url}`);
      window.open(`mailto:?subject=${subject}&body=${body}`);
    });

    modal.querySelector('#retry-btn').addEventListener('click', () => {
      window.location.reload();
    });

    modal.querySelector('#native-dialog-btn').addEventListener('click', () => {
      // Trigger Google's native permission dialog by trying to access
      window.location.href = url;
    });

    modal.querySelector('#close-btn').addEventListener('click', () => {
      overlay.remove();
    });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  async undoLastSwitch(tabId) {
    const switchData = this.switchHistory.get(tabId);
    if (switchData && Date.now() - switchData.timestamp < 30000) { // 30 second window
      await chrome.tabs.update(tabId, { url: switchData.originalUrl });
      this.switchHistory.delete(tabId);
    }
  }

  async handleAccessRequest(data) {
    // Handle access request functionality
    const subject = encodeURIComponent(`Access request for ${data.title || 'document'}`);
    const body = encodeURIComponent(`Hi, I need access to this document: ${data.url}`);
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.create({ 
      url: `mailto:?subject=${subject}&body=${body}`,
      index: tab.index + 1
    });
  }
}

// Initialize the AutoSwitch manager
const autoSwitchManager = new AutoSwitchManager(); 