// AutoSwitch for Google - Content Script with Enhanced Debugging
class AutoSwitchContentManager {
  constructor() {
    this.settings = {};
    this.hoverCache = new Map();
    this.toastTimeout = null;
    this.debugData = {
      detectionMethods: [],
      selectorsTriedCount: 0,
      successfulSelectors: 0,
      elementsFound: 0,
      emailsDiscovered: [],
      finalAccountCount: 0,
      detectionSources: []
    };
    
    // Store instance globally for debugging
    window.autoswitchInstance = this;
    this.init();
  }

  async init() {
    console.log('🚀 AutoSwitch Content Manager initializing...');
    await this.loadSettings();
    this.setupEventListeners();
    this.setupHoverPreview();
    this.checkForSwitchNotification();
    console.log('✅ AutoSwitch Content Manager ready');
  }

  // Reset debug data for fresh detection
  resetDebugData() {
    this.debugData = {
      detectionMethods: [],
      selectorsTriedCount: 0,
      successfulSelectors: 0,
      elementsFound: 0,
      emailsDiscovered: [],
      finalAccountCount: 0,
      detectionSources: []
    };
  }

  // Method to manually trigger account detection with full debugging
  async detectAccountsWithDebug() {
    console.log('🔍 Starting comprehensive account detection...');
    this.resetDebugData();
    
    const accounts = await this.detectMultipleAccounts();
    
    // Log comprehensive debug summary
    console.log('📊 ACCOUNT DETECTION SUMMARY:');
    console.log(`├── Total selectors tried: ${this.debugData.selectorsTriedCount}`);
    console.log(`├── Successful selectors: ${this.debugData.successfulSelectors}`);
    console.log(`├── DOM elements found: ${this.debugData.elementsFound}`);
    console.log(`├── Emails discovered: ${this.debugData.emailsDiscovered.length}`);
    console.log(`├── Final account count: ${this.debugData.finalAccountCount}`);
    console.log(`└── Detection sources: ${this.debugData.detectionSources.join(', ')}`);
    
    if (this.debugData.emailsDiscovered.length > 0) {
      console.log('📧 Discovered emails:', this.debugData.emailsDiscovered);
    }
    
    console.log('🔧 Available debug methods:');
    console.log('  window.autoswitchInstance.detectAccountsWithDebug() - Run detection with full logging');
    console.log('  window.autoswitchInstance.debugData - View last detection data');
    
    return accounts;
  }

  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
      this.settings = response || {};
      console.log('⚙️ Settings loaded:', this.settings);
    } catch (error) {
      console.log('⚠️ Using default settings due to error:', error);
      this.settings = {
        showToast: true,
        hoverPreview: true,
        enableUndo: true,
        instantSwitch: false
      };
    }
  }

  setupEventListeners() {
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    
    let currentUrl = window.location.href;
    const urlObserver = new MutationObserver(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        this.onUrlChange();
      }
    });
    
    urlObserver.observe(document.body, { childList: true, subtree: true });
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.checkPermissionError());
    } else {
      this.checkPermissionError();
    }
  }

  async handleMessage(message, sender, sendResponse) {
    switch (message.action) {
      case 'ping':
        sendResponse({ status: 'ready' });
        break;
      case 'showSwitchNotification':
        this.showSwitchToast(message.data);
        break;
      case 'getSettings':
        sendResponse(this.settings);
        break;
      case 'detectAccounts':
        const accounts = await this.detectMultipleAccounts();
        sendResponse(accounts);
        break;
      case 'runDetection':
        const detectedAccounts = await this.detectAccountsWithDebug();
        sendResponse(detectedAccounts);
        break;
      case 'showAccountPicker':
        this.showAccountPicker(message.data);
        break;
      case 'triggerAutoSwitch':
        const result = await this.handleAutoSwitchTrigger(message.data);
        sendResponse(result);
        break;
    }
    return true; // Keep message channel open for async responses
  }

  onUrlChange() {
    console.log('🔄 URL changed, re-checking for permission errors...');
    setTimeout(() => this.checkPermissionError(), 1000);
  }

  checkPermissionError() {
    const errorSelectors = [
      '[data-error-type="permission"]',
      '.error-page-content',
      '[aria-label*="permission"]',
      '.permission-denied',
      '.docs-homescreen-reason-text',
      '[data-value="REQUEST_ACCESS"]'
    ];

    let hasError = false;
    for (const selector of errorSelectors) {
      if (document.querySelector(selector)) {
        hasError = true;
        console.log(`🚫 Permission error detected via selector: ${selector}`);
        break;
      }
    }

    if (!hasError) {
      const bodyText = document.body.innerText.toLowerCase();
      const permissionKeywords = [
        "don't have permission",
        "you need permission", 
        "access denied",
        "request access",
        "you need access",
        "sign in with a different account"
      ];
      
      for (const keyword of permissionKeywords) {
        if (bodyText.includes(keyword)) {
          hasError = true;
          console.log(`🚫 Permission error detected via text: "${keyword}"`);
          break;
        }
      }
    }

    if (hasError) {
      console.log('📤 Sending permission error to background script...');
      chrome.runtime.sendMessage({
        action: 'checkPermissionError',
        data: { url: window.location.href, hasError: true }
      });
    }
  }

  // Comprehensive account detection with 7 methods
  async detectMultipleAccounts() {
    console.log('🔍 Starting comprehensive account detection...');
    let accounts = [];
    
    // Method 1: Force-click account switcher to expose accounts
    console.log('🔄 Method 1: Attempting to expose accounts via account switcher...');
    try {
      await this.forceExposeAccountSwitcher();
      await this.sleep(500); // Wait for UI to update
    } catch (error) {
      console.log('⚠️ Method 1 failed:', error.message);
    }

    // Method 2: Enhanced DOM scanning with comprehensive selectors
    console.log('🔍 Method 2: Enhanced DOM scanning...');
    const domAccounts = await this.scanDOMForAccounts();
    if (domAccounts.length > 0) {
      accounts = accounts.concat(domAccounts);
      this.debugData.detectionSources.push('DOM scanning');
      console.log(`✅ Method 2 found ${domAccounts.length} accounts via DOM`);
    }

    // Method 3: Page content regex scanning
    console.log('📄 Method 3: Page content regex scanning...');
    const contentAccounts = this.scanPageContentForEmails();
    if (contentAccounts.length > 0) {
      accounts = accounts.concat(contentAccounts);
      this.debugData.detectionSources.push('Page content');
      console.log(`✅ Method 3 found ${contentAccounts.length} accounts via content`);
    }

    // Method 4: JavaScript globals checking
    console.log('🌐 Method 4: JavaScript globals checking...');
    const globalAccounts = this.checkJavaScriptGlobals();
    if (globalAccounts.length > 0) {
      accounts = accounts.concat(globalAccounts);
      this.debugData.detectionSources.push('JS globals');
      console.log(`✅ Method 4 found ${globalAccounts.length} accounts via globals`);
    }

    // Method 5: URL parameter and cookie analysis
    console.log('🍪 Method 5: URL and cookie analysis...');
    const urlAccounts = this.analyzeUrlAndCookies();
    if (urlAccounts.length > 0) {
      accounts = accounts.concat(urlAccounts);
      this.debugData.detectionSources.push('URL/cookies');
      console.log(`✅ Method 5 found ${urlAccounts.length} accounts via URL/cookies`);
    }

    // Method 6: Background script stored accounts
    console.log('💾 Method 6: Checking background script stored accounts...');
    try {
      const storedAccounts = await chrome.runtime.sendMessage({ action: 'getStoredAccounts' });
      if (storedAccounts && storedAccounts.length > 0) {
        accounts = accounts.concat(storedAccounts);
        this.debugData.detectionSources.push('Background storage');
        console.log(`✅ Method 6 found ${storedAccounts.length} stored accounts`);
      }
    } catch (error) {
      console.log('⚠️ Method 6 failed:', error.message);
    }

    // Method 7: localStorage/sessionStorage scanning
    console.log('🗄️ Method 7: Storage scanning...');
    const storageAccounts = this.scanBrowserStorage();
    if (storageAccounts.length > 0) {
      accounts = accounts.concat(storageAccounts);
      this.debugData.detectionSources.push('Browser storage');
      console.log(`✅ Method 7 found ${storageAccounts.length} accounts via storage`);
    }

    // Deduplicate and validate accounts
    const uniqueAccounts = this.deduplicateAccounts(accounts);
    this.debugData.finalAccountCount = uniqueAccounts.length;
    
    console.log(`🎯 Final result: ${uniqueAccounts.length} unique accounts detected`);
    if (uniqueAccounts.length > 0) {
      console.log('👥 Final accounts:', uniqueAccounts);
      
      // Store accounts in background script for later use
      try {
        chrome.runtime.sendMessage({
          action: 'storeAccounts',
          data: uniqueAccounts
        });
      } catch (error) {
        console.log('Could not store accounts in background:', error.message);
      }
    } else {
      console.log('❌ No accounts detected by any method');
    }

    return uniqueAccounts;
  }

  async forceExposeAccountSwitcher() {
    const switcherSelectors = [
      '[data-ved*="account"]',
      '[role="button"][aria-label*="account"]',
      '.gb_A', '.gb_B', '.gb_C', // Classic Google Bar
      '[data-ogsr-up]', // New Google Bar
      '.q7YKA', '.KhAyE' // Modern switcher buttons
    ];

    for (const selector of switcherSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log(`🎯 Found account switcher: ${selector}`);
        element.click();
        return true;
      }
    }
    throw new Error('No account switcher found');
  }

  async scanDOMForAccounts() {
    const accounts = [];
    
    // Enhanced comprehensive selectors for modern Google UI
    const accountSelectors = [
      // Profile pictures
      '[data-avatar] img[src*="googleusercontent"]',
      '[data-profile-picture] img',
      '.gb_l img', '.gb_m img', '.gb_n img',
      
      // Email containers
      '[data-email]',
      '[data-account-email]',
      '.gb_e', '.gb_f', '.gb_g',
      
      // Account menu items  
      '[role="menuitem"] [data-email]',
      '[role="option"] [data-email]',
      '.account-menu-item',
      
      // Account switcher elements
      '.account-chooser-item',
      '.account-list-item',
      '[data-account-index]',
      
      // Avatar containers
      '.avatar-container [data-email]',
      '.profile-menu [data-email]',
      
      // Google Workspace specific
      '.gs-account-email',
      '.workspace-account',
      
      // Drive/Docs specific
      '.drive-user-avatar img',
      '.docs-avatar img',
      '.sheets-avatar img',
      
      // Gmail specific
      '.gmail-user-email',
      '.user-email-address',
      
      // Modern Google header
      '.VvUAP img', '.LS8OJ img', '.gb_k img',
      
      // Account dropdown
      '.gb_sd', '.gb_tc', '.gb_uc',
      
      // New account selectors
      '[jsaction*="account"]',
      '[data-account-id]',
      '[data-authuser]'
    ];

    this.debugData.selectorsTriedCount = accountSelectors.length;

    for (const selector of accountSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          this.debugData.successfulSelectors++;
          this.debugData.elementsFound += elements.length;
          console.log(`🔍 Found ${elements.length} elements with selector: ${selector}`);
          
          elements.forEach(element => {
            const account = this.extractAccountFromElement(element);
            if (account) {
              accounts.push(account);
              this.debugData.emailsDiscovered.push(account.email);
            }
          });
        }
      } catch (error) {
        console.log(`⚠️ Error with selector ${selector}:`, error.message);
      }
    }

    console.log(`📊 DOM Scan Results: ${this.debugData.successfulSelectors}/${this.debugData.selectorsTriedCount} selectors successful`);
    return accounts;
  }

  extractAccountFromElement(element) {
    let email = null;
    let profilePicture = null;
    let name = null;

    try {
      // Extract email from various attributes
      email = element.dataset?.email || 
              element.dataset?.accountEmail ||
              element.dataset?.userEmail ||
              element.getAttribute('data-email') ||
              element.getAttribute('title') ||
              element.getAttribute('aria-label');

      // Extract from text content if it's an email
      if (!email && element.textContent) {
        const emailMatch = element.textContent.match(/[\w\.-]+@[\w\.-]+\.\w+/);
        if (emailMatch) {
          email = emailMatch[0];
        }
      }

      // Extract from href attributes (sometimes emails are in links)
      if (!email && element.href) {
        const hrefEmailMatch = element.href.match(/[\w\.-]+@[\w\.-]+\.\w+/);
        if (hrefEmailMatch) {
          email = hrefEmailMatch[0];
        }
      }

      // Extract profile picture
      if (element.tagName === 'IMG') {
        profilePicture = element.src;
      } else {
        const img = element.querySelector('img');
        if (img) {
          profilePicture = img.src;
        }
      }

      // Extract name from various sources
      name = element.dataset?.name ||
             element.dataset?.userName ||
             element.getAttribute('alt') ||
             element.getAttribute('aria-label');

      // Clean up email if found
      if (email) {
        email = email.trim().toLowerCase();
        
        // Remove common prefixes/suffixes
        email = email.replace(/^mailto:/, '');
        email = email.replace(/\?.*$/, ''); // Remove query parameters
      }

      // Validate email format
      if (email && this.isValidEmail(email)) {
        return {
          email: email,
          name: name || email.split('@')[0],
          profilePicture: profilePicture || null,
          source: 'DOM'
        };
      }

    } catch (error) {
      // Silently ignore errors from individual element extraction
    }

    return null;
  }

  scanPageContentForEmails() {
    const accounts = [];
    const emailRegex = /[\w\.-]+@[\w\.-]+\.\w+/g;
    const pageContent = document.body.textContent;
    const emails = pageContent.match(emailRegex);

    if (emails) {
      const uniqueEmails = [...new Set(emails)];
      console.log(`📧 Found ${uniqueEmails.length} emails in page content:`, uniqueEmails);
      
      uniqueEmails.forEach(email => {
        if (this.isValidEmail(email) && this.isGoogleAccount(email)) {
          accounts.push({
            email: email.toLowerCase(),
            name: email.split('@')[0],
            profilePicture: null,
            source: 'Page content'
          });
          this.debugData.emailsDiscovered.push(email);
        }
      });
    }

    return accounts;
  }

  checkJavaScriptGlobals() {
    const accounts = [];
    const globals = ['window.gapi', 'window.google', 'window.WIZ_global_data'];

    globals.forEach(globalPath => {
      try {
        const obj = this.getNestedProperty(window, globalPath.replace('window.', ''));
        if (obj) {
          console.log(`🌐 Found global: ${globalPath}`, obj);
          // Look for account data in the global object
          const emails = this.extractEmailsFromObject(obj);
          emails.forEach(email => {
            if (this.isValidEmail(email)) {
              accounts.push({
                email: email.toLowerCase(),
                name: email.split('@')[0],
                profilePicture: null,
                source: 'JS globals'
              });
              this.debugData.emailsDiscovered.push(email);
            }
          });
        }
      } catch (error) {
        console.log(`⚠️ Error checking global ${globalPath}:`, error.message);
      }
    });

    return accounts;
  }

  analyzeUrlAndCookies() {
    const accounts = [];
    
    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const authUser = urlParams.get('authuser');
    const userHint = urlParams.get('user_hint');
    
    if (authUser !== null) {
      console.log(`🔗 Found authuser parameter: ${authUser}`);
    }
    
    if (userHint && this.isValidEmail(userHint)) {
      accounts.push({
        email: userHint.toLowerCase(),
        name: userHint.split('@')[0],
        profilePicture: null,
        source: 'URL parameter'
      });
      this.debugData.emailsDiscovered.push(userHint);
    }

    // Analyze cookies (limited by same-origin policy)
    try {
      const cookies = document.cookie.split(';');
      cookies.forEach(cookie => {
        const emailMatch = cookie.match(/[\w\.-]+@[\w\.-]+\.\w+/);
        if (emailMatch && this.isValidEmail(emailMatch[0])) {
          accounts.push({
            email: emailMatch[0].toLowerCase(),
            name: emailMatch[0].split('@')[0],
            profilePicture: null,
            source: 'Cookies'
          });
          this.debugData.emailsDiscovered.push(emailMatch[0]);
        }
      });
    } catch (error) {
      console.log('⚠️ Error analyzing cookies:', error.message);
    }

    return accounts;
  }

  scanBrowserStorage() {
    const accounts = [];
    
    // Check localStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        
        if (value) {
          const emails = value.match(/[\w\.-]+@[\w\.-]+\.\w+/g);
          if (emails) {
            emails.forEach(email => {
              if (this.isValidEmail(email)) {
                accounts.push({
                  email: email.toLowerCase(),
                  name: email.split('@')[0],
                  profilePicture: null,
                  source: 'localStorage'
                });
                this.debugData.emailsDiscovered.push(email);
              }
            });
          }
        }
      }
    } catch (error) {
      console.log('⚠️ Error scanning localStorage:', error.message);
    }

    // Check sessionStorage
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        const value = sessionStorage.getItem(key);
        
        if (value) {
          const emails = value.match(/[\w\.-]+@[\w\.-]+\.\w+/g);
          if (emails) {
            emails.forEach(email => {
              if (this.isValidEmail(email)) {
                accounts.push({
                  email: email.toLowerCase(),
                  name: email.split('@')[0],
                  profilePicture: null,
                  source: 'sessionStorage'
                });
                this.debugData.emailsDiscovered.push(email);
              }
            });
          }
        }
      }
    } catch (error) {
      console.log('⚠️ Error scanning sessionStorage:', error.message);
    }

    return accounts;
  }

  deduplicateAccounts(accounts) {
    const uniqueMap = new Map();
    
    accounts.forEach(account => {
      if (!uniqueMap.has(account.email)) {
        uniqueMap.set(account.email, account);
      } else {
        // Merge data from multiple sources
        const existing = uniqueMap.get(account.email);
        if (!existing.profilePicture && account.profilePicture) {
          existing.profilePicture = account.profilePicture;
        }
        if (!existing.name && account.name) {
          existing.name = account.name;
        }
      }
    });

    const uniqueAccounts = Array.from(uniqueMap.values());
    
    // Ensure all accounts have proper index values
    uniqueAccounts.forEach((account, index) => {
      if (account.index === undefined || account.index === null) {
        account.index = index;
      }
    });

    return uniqueAccounts;
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isGoogleAccount(email) {
    // Check if it's a Google account (gmail.com or has been used with Google services)
    return email.includes('@gmail.com') || 
           email.includes('@googlemail.com') ||
           email.includes('@google.com') ||
           // Could be any email used with Google Workspace
           true; // For now, assume any email could be a Google account
  }

  getNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
  }

  extractEmailsFromObject(obj, depth = 0) {
    const emails = [];
    const maxDepth = 3; // Prevent infinite recursion
    
    if (depth > maxDepth) return emails;

    try {
      if (typeof obj === 'string') {
        const emailMatch = obj.match(/[\w\.-]+@[\w\.-]+\.\w+/g);
        if (emailMatch) {
          emails.push(...emailMatch);
        }
      } else if (typeof obj === 'object' && obj !== null) {
        Object.values(obj).forEach(value => {
          emails.push(...this.extractEmailsFromObject(value, depth + 1));
        });
      }
    } catch (error) {
      // Ignore errors from trying to access properties
    }

    return emails;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async handleAutoSwitchTrigger(data) {
    try {
      console.log('🔄 Content script handling AutoSwitch trigger...');
      
      // Run comprehensive account detection
      const accounts = await this.detectMultipleAccounts();
      
      if (accounts.length === 0) {
        console.log('❌ No accounts detected, showing fallback options');
        this.showFallbackOptions(data.url);
        return { success: false, reason: 'no_accounts' };
        
      } else if (accounts.length === 1) {
        console.log('✅ Single account detected, auto-switching...');
        const account = accounts[0];
        account.index = account.index || 0;
        
        // Perform auto-switch
        const urlObj = new URL(data.url);
        urlObj.searchParams.set('authuser', account.index);
        const newUrl = urlObj.toString();
        
        // Navigate to new URL
        window.location.href = newUrl;
        
        return { 
          success: true, 
          account: account,
          switchData: {
            originalUrl: data.url,
            newUrl: newUrl,
            account: account
          }
        };
        
      } else {
        console.log(`🎭 Multiple accounts detected (${accounts.length}), showing picker...`);
        this.showAccountPicker({ accounts: accounts, url: data.url });
        return { success: true, reason: 'multiple_accounts' };
      }
      
    } catch (error) {
      console.error('Error in handleAutoSwitchTrigger:', error);
      return { success: false, error: error.message };
    }
  }

  showFallbackOptions(url) {
    // Remove existing fallback modal
    const existingModal = document.getElementById('autoswitch-fallback-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'autoswitch-fallback-modal';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Create modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    `;

    const title = document.title || 'Document';
    modal.innerHTML = `
      <h3 style="margin: 0 0 16px 0; color: #ea4335; font-size: 18px; font-weight: 600;">No Access Found</h3>
      <p style="margin: 0 0 16px 0; color: #5f6368; line-height: 1.4;">None of your Google accounts have access to this document.</p>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <button id="request-access-btn" style="padding: 12px; background: #1a73e8; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">Request Access</button>
        <button id="retry-btn" style="padding: 12px; border: 1px solid #dadce0; background: white; border-radius: 8px; cursor: pointer;">Retry</button>
        <button id="add-account-btn" style="padding: 12px; border: 1px solid #dadce0; background: white; border-radius: 8px; cursor: pointer;">Add Another Account</button>
        <button id="close-btn" style="padding: 12px; border: 1px solid #dadce0; background: white; border-radius: 8px; cursor: pointer;">Close</button>
      </div>
    `;

    // Handle buttons
    modal.querySelector('#request-access-btn').addEventListener('click', () => {
      const subject = encodeURIComponent(`Access request for ${title}`);
      const body = encodeURIComponent(`Hi, I need access to this document: ${url}`);
      window.open(`mailto:?subject=${subject}&body=${body}`);
      overlay.remove();
    });

    modal.querySelector('#retry-btn').addEventListener('click', () => {
      window.location.reload();
    });

    modal.querySelector('#add-account-btn').addEventListener('click', () => {
      window.open('https://accounts.google.com/AccountChooser', '_blank');
      overlay.remove();
    });

    modal.querySelector('#close-btn').addEventListener('click', () => {
      overlay.remove();
    });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
  }

  showAccountPicker(data) {
    console.log('🎭 Showing account picker:', data);
    
    // Remove existing picker
    const existingPicker = document.getElementById('autoswitch-account-picker');
    if (existingPicker) {
      existingPicker.remove();
    }

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'autoswitch-account-picker';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Create modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      max-height: 70vh;
      overflow-y: auto;
    `;

    // Header
    const header = document.createElement('h3');
    header.textContent = 'Choose Account';
    header.style.cssText = `
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 600;
      color: #333;
    `;
    modal.appendChild(header);

    // Account list
    data.accounts.forEach((account, index) => {
      const accountItem = document.createElement('div');
      accountItem.style.cssText = `
        display: flex;
        align-items: center;
        padding: 12px;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: background-color 0.2s;
      `;

      accountItem.addEventListener('mouseenter', () => {
        accountItem.style.backgroundColor = '#f5f5f5';
      });

      accountItem.addEventListener('mouseleave', () => {
        accountItem.style.backgroundColor = 'transparent';
      });

      // Profile picture
      const avatar = document.createElement('div');
      avatar.style.cssText = `
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: #1a73e8;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 12px;
        color: white;
        font-weight: 600;
        overflow: hidden;
      `;

      if (account.profilePicture) {
        const img = document.createElement('img');
        img.src = account.profilePicture;
        img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
        avatar.appendChild(img);
      } else {
        avatar.textContent = account.email.charAt(0).toUpperCase();
      }

      // Account info
      const info = document.createElement('div');
      info.style.flexGrow = '1';
      
      const name = document.createElement('div');
      name.textContent = account.name || account.email.split('@')[0];
      name.style.cssText = 'font-weight: 500; color: #333; margin-bottom: 2px;';
      
      const email = document.createElement('div');
      email.textContent = account.email;
      email.style.cssText = 'color: #666; font-size: 14px;';

      info.appendChild(name);
      info.appendChild(email);

      accountItem.appendChild(avatar);
      accountItem.appendChild(info);

      // Click handler
      accountItem.addEventListener('click', () => {
        console.log(`👤 Account selected: ${account.email}`);
        chrome.runtime.sendMessage({
          action: 'switchToAccount',
          data: { account, url: window.location.href }
        });
        overlay.remove();
      });

      modal.appendChild(accountItem);
    });

    // Cancel button
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.cssText = `
      width: 100%;
      padding: 12px;
      margin-top: 16px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background: white;
      color: #666;
      cursor: pointer;
      font-size: 14px;
    `;

    cancelButton.addEventListener('click', () => {
      overlay.remove();
    });

    modal.appendChild(cancelButton);
    overlay.appendChild(modal);

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    document.body.appendChild(overlay);
  }

  setupHoverPreview() {
    if (!this.settings.hoverPreview) return;

    let hoverTimeout;
    let currentTooltip = null;

    const handleHover = (event) => {
      const link = event.target.closest('a[href*="docs.google.com"], a[href*="sheets.google.com"], a[href*="slides.google.com"], a[href*="drive.google.com"]');
      
      if (link) {
        clearTimeout(hoverTimeout);
        hoverTimeout = setTimeout(() => {
          this.showHoverPreview(link, event);
        }, 300);
      }
    };

    const handleMouseLeave = () => {
      clearTimeout(hoverTimeout);
      if (currentTooltip) {
        currentTooltip.remove();
        currentTooltip = null;
      }
    };

    document.addEventListener('mouseover', handleHover);
    document.addEventListener('mouseleave', handleMouseLeave);
    
    this.cleanupTooltip = handleMouseLeave;
  }

  async showHoverPreview(linkElement, event) {
    const url = linkElement.href;
    if (!url) return;

    let previewData = this.hoverCache.get(url);
    
    if (!previewData) {
      try {
        const accounts = await this.detectMultipleAccounts();
        const validAccount = accounts[0];
        
        previewData = {
          account: validAccount,
          hasAccess: !!validAccount
        };
        
        this.hoverCache.set(url, previewData);
      } catch (error) {
        return;
      }
    }

    // Remove existing tooltip
    const existingTooltip = document.querySelector('.autoswitch-hover-tooltip');
    if (existingTooltip) {
      existingTooltip.remove();
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
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
    `;

    if (previewData.hasAccess && previewData.account) {
      tooltip.innerHTML = `👤 Open as ${previewData.account.email}`;
    } else {
      tooltip.innerHTML = `⚠️ No access found`;
      tooltip.style.background = '#ea4335';
    }

    // Smart positioning to prevent overflow
    const rect = linkElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let left = rect.left + window.scrollX;
    let top = rect.bottom + window.scrollY + 5;
    
    // Prevent horizontal overflow
    const tooltipWidth = 300; // max-width
    if (left + tooltipWidth > viewportWidth) {
      left = viewportWidth - tooltipWidth - 10;
    }
    
    // Prevent vertical overflow
    if (top + 30 > viewportHeight + window.scrollY) {
      top = rect.top + window.scrollY - 35; // Show above instead
    }
    
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';

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

    // Add animation styles if not present
    if (!document.querySelector('#autoswitch-toast-styles')) {
      const style = document.createElement('style');
      style.id = 'autoswitch-toast-styles';
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
    }

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
    const urlParams = new URLSearchParams(window.location.search);
    const authUser = urlParams.get('authuser');
    
    if (authUser && !sessionStorage.getItem('autoswitch-notified')) {
      sessionStorage.setItem('autoswitch-notified', 'true');
      
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
console.log('🚀 Loading AutoSwitch Content Manager...');
const contentManager = new AutoSwitchContentManager();

// Global debugging access
console.log('🔧 AutoSwitch Debug Commands:');
console.log('  window.autoswitchInstance.detectAccountsWithDebug() - Run full account detection with debugging');
console.log('  window.autoswitchInstance.debugData - View last detection results'); 