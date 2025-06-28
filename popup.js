// AutoSwitch for Google - Popup Script
class PopupManager {
  constructor() {
    this.settings = {};
    this.defaultSettings = {
      enabled: true,
      autoSwitch: true,
      hoverPreview: true,
      showToast: true,
      showDesktopNotification: true,
      enableUndo: true,
      contextMenu: true,
      keyboardShortcut: true,
      incognitoMode: false,
      autoSwitchDelay: 5,
      toastDuration: 8
    };
    this.init();
  }

  async init() {
    this.showLoading(true);
    await this.loadSettings();
    this.setupEventListeners();
    this.updateUI();
    await this.updateStatus();
    this.showLoading(false);
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get('autoswitchSettings');
      this.settings = { ...this.defaultSettings, ...result.autoswitchSettings };
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = { ...this.defaultSettings };
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.sync.set({ autoswitchSettings: this.settings });
      // Notify background script of settings change
      chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: this.settings
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  setupEventListeners() {
    // Toggle switches
    const toggles = document.querySelectorAll('input[type="checkbox"]');
    toggles.forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        this.handleToggleChange(e.target.id, e.target.checked);
      });
    });

    // Number inputs
    const numberInputs = document.querySelectorAll('input[type="number"]');
    numberInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        this.handleNumberChange(e.target.id, parseInt(e.target.value));
      });
    });

    // Advanced section toggle
    const advancedToggle = document.getElementById('advancedToggle');
    const advancedContent = document.getElementById('advancedContent');
    
    advancedToggle.addEventListener('click', () => {
      const isExpanded = advancedToggle.classList.contains('expanded');
      advancedToggle.classList.toggle('expanded');
      advancedContent.classList.toggle('expanded');
    });

    // Management buttons
    document.getElementById('rememberedChoices').addEventListener('click', () => {
      this.openRememberedChoicesManager();
    });

    document.getElementById('domainOverrides').addEventListener('click', () => {
      this.openDomainOverrides();
    });

    document.getElementById('exportSettings').addEventListener('click', () => {
      this.exportSettings();
    });

    document.getElementById('importSettings').addEventListener('click', () => {
      this.importSettings();
    });

    // Footer links
    document.getElementById('helpLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.openHelp();
    });

    document.getElementById('feedbackLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.openFeedback();
    });

    document.getElementById('resetLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.resetSettings();
    });

    // Quick test button
    document.getElementById('quickTestBtn').addEventListener('click', (e) => {
      e.preventDefault();
      this.runQuickTest();
    });

    // File input for import
    const fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('change', (e) => {
      this.handleFileImport(e.target.files[0]);
    });

    // Label clicks for accessibility
    const labels = document.querySelectorAll('label');
    labels.forEach(label => {
      label.addEventListener('click', (e) => {
        const targetId = label.getAttribute('for');
        if (targetId) {
          const target = document.getElementById(targetId);
          if (target && target.type === 'checkbox') {
            e.preventDefault();
            target.checked = !target.checked;
            target.dispatchEvent(new Event('change'));
          }
        }
      });
    });
  }

  handleToggleChange(settingId, value) {
    this.settings[settingId] = value;
    this.saveSettings();
    this.updateDependentSettings(settingId, value);
  }

  handleNumberChange(settingId, value) {
    this.settings[settingId] = value;
    this.saveSettings();
  }

  updateDependentSettings(settingId, value) {
    // Handle dependent settings
    if (settingId === 'enabled') {
      // If main toggle is disabled, update UI to show dependent settings as disabled
      this.updateEnabledState();
    }

    if (settingId === 'showToast' && !value) {
      // If toast is disabled, also disable undo
      document.getElementById('enableUndo').disabled = true;
    } else if (settingId === 'showToast' && value) {
      document.getElementById('enableUndo').disabled = false;
    }
  }

  updateEnabledState() {
    const isEnabled = this.settings.enabled;
    const dependentToggles = [
      'autoSwitch', 'hoverPreview', 'showToast', 'showDesktopNotification',
      'enableUndo', 'contextMenu', 'keyboardShortcut'
    ];

    dependentToggles.forEach(toggleId => {
      const toggle = document.getElementById(toggleId);
      if (toggle) {
        toggle.disabled = !isEnabled;
        toggle.parentElement.parentElement.style.opacity = isEnabled ? '1' : '0.5';
      }
    });

    // Update status
    const statusElement = document.getElementById('extensionStatus');
    statusElement.textContent = isEnabled ? 'Active' : 'Disabled';
    statusElement.className = `status-value ${isEnabled ? 'status-active' : 'status-inactive'}`;
  }

  updateUI() {
    // Update all toggle switches
    Object.keys(this.settings).forEach(key => {
      const element = document.getElementById(key);
      if (element) {
        if (element.type === 'checkbox') {
          element.checked = this.settings[key];
        } else if (element.type === 'number') {
          element.value = this.settings[key];
        }
      }
    });

    this.updateEnabledState();
  }

  async updateStatus() {
    try {
      // Get account count
      const accounts = await chrome.runtime.sendMessage({ action: 'getAccounts' });
      document.getElementById('accountCount').textContent = accounts ? accounts.length : '0';

      // Get last switch info
      const lastSwitch = await chrome.storage.local.get('lastSwitch');
      if (lastSwitch.lastSwitch) {
        const date = new Date(lastSwitch.lastSwitch);
        document.getElementById('lastSwitch').textContent = this.formatDate(date);
      } else {
        document.getElementById('lastSwitch').textContent = 'Never';
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      document.getElementById('accountCount').textContent = 'Error';
    }
  }

  formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }

  showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.toggle('visible', show);
  }

  async openRememberedChoicesManager() {
    try {
      // Create a new tab for the management interface
      const url = chrome.runtime.getURL('pages/remembered-choices.html');
      await chrome.tabs.create({ url });
      window.close();
    } catch (error) {
      // Fallback: open in popup
      this.showManagementModal('remembered-choices');
    }
  }

  async openDomainOverrides() {
    try {
      const url = chrome.runtime.getURL('pages/domain-overrides.html');
      await chrome.tabs.create({ url });
      window.close();
    } catch (error) {
      this.showManagementModal('domain-overrides');
    }
  }

  showManagementModal(type) {
    // Simple modal for basic management
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 24px;
      border-radius: 8px;
      max-width: 400px;
      width: 90%;
    `;

    content.innerHTML = `
      <h3>${type === 'remembered-choices' ? 'Remembered Choices' : 'Domain Overrides'}</h3>
      <p>Management interface coming soon. For now, you can reset all settings to clear saved preferences.</p>
      <div style="margin-top: 16px; display: flex; gap: 8px; justify-content: flex-end;">
        <button id="closeModal" style="padding: 8px 16px; border: 1px solid #ccc; background: white; border-radius: 4px;">Close</button>
      </div>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    content.querySelector('#closeModal').addEventListener('click', () => {
      modal.remove();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  exportSettings() {
    const settingsData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      settings: this.settings
    };

    const blob = new Blob([JSON.stringify(settingsData, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `autoswitch-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast('Settings exported successfully!');
  }

  importSettings() {
    document.getElementById('fileInput').click();
  }

  async handleFileImport(file) {
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.settings) {
        this.settings = { ...this.defaultSettings, ...data.settings };
        await this.saveSettings();
        this.updateUI();
        this.showToast('Settings imported successfully!');
      } else {
        throw new Error('Invalid settings file format');
      }
    } catch (error) {
      this.showToast('Failed to import settings. Please check the file format.', true);
    }
  }

  async resetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      this.settings = { ...this.defaultSettings };
      await this.saveSettings();
      this.updateUI();
      
      // Clear all stored data
      await chrome.storage.sync.clear();
      await chrome.storage.local.clear();
      
      this.showToast('Settings reset to defaults');
    }
  }

  openHelp() {
    chrome.tabs.create({
      url: 'https://github.com/username/autoswitch/wiki/help'
    });
  }

  openFeedback() {
    chrome.tabs.create({
      url: 'mailto:feedback@autoswitch.com?subject=AutoSwitch%20Feedback'
    });
  }

  async runQuickTest() {
    try {
      // Show loading state on button
      const testBtn = document.getElementById('quickTestBtn');
      const originalText = testBtn.innerHTML;
      testBtn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Testing...</span>';
      testBtn.disabled = true;

      // Send message to active tab to run account detection
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length > 0) {
        const tab = tabs[0];
        
        // Check if tab is a Google service
        const isGoogleService = tab.url.includes('google.com');
        if (!isGoogleService) {
          this.showToast('Please navigate to a Google service (Gmail, Drive, Docs, etc.) and try again.', true);
          testBtn.innerHTML = originalText;
          testBtn.disabled = false;
          return;
        }

        try {
          // First, ensure content script is loaded
          await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
          
          // Run comprehensive account detection
          console.log('🧪 Starting Quick Test - check console on the Google page for detailed output');
          const result = await chrome.tabs.sendMessage(tab.id, { action: 'detectAccounts' });
          
          if (result && result.length > 0) {
            this.showToast(`✅ Found ${result.length} account(s)! Check console for details.`);
            console.log('🎯 Quick Test Results:', result);
          } else {
            this.showToast('⚠️ No accounts detected. Check console for debug info.', true);
            console.log('❌ Quick Test: No accounts detected');
          }

          // Also trigger the debug version via content script
          try {
            await chrome.tabs.executeScript(tab.id, {
              code: `
                if (window.autoswitchInstance) {
                  console.log('🧪 Running comprehensive debug detection...');
                  window.autoswitchInstance.detectAccountsWithDebug();
                } else {
                  console.log('❌ AutoSwitch instance not found - extension may not be loaded properly');
                }
              `
            });
          } catch (executeError) {
            console.log('Note: Could not run debug command:', executeError.message);
          }

        } catch (messageError) {
          // Content script not loaded, try to inject it
          console.log('Content script not loaded, attempting to inject...');
          
          try {
            await chrome.tabs.executeScript(tab.id, { file: 'content-script.js' });
            await chrome.tabs.insertCSS(tab.id, { file: 'content-script.css' });
            
            // Wait a moment for injection to complete
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Try again
            const result = await chrome.tabs.sendMessage(tab.id, { action: 'detectAccounts' });
            
            if (result && result.length > 0) {
              this.showToast(`✅ Found ${result.length} account(s) after injection!`);
            } else {
              this.showToast('⚠️ Still no accounts detected. Check console.', true);
            }
            
          } catch (injectionError) {
            this.showToast('❌ Could not inject content script. Try refreshing the page.', true);
            console.error('Injection failed:', injectionError);
          }
        }

        // Update account count in status
        this.updateStatus();
        
      } else {
        this.showToast('No active tab found', true);
      }

    } catch (error) {
      console.error('Quick test failed:', error);
      this.showToast('Test failed. Check console for details.', true);
    } finally {
      // Restore button
      const testBtn = document.getElementById('quickTestBtn');
      testBtn.innerHTML = '<span class="btn-icon">🔍</span><span class="btn-text">Quick Test</span>';
      testBtn.disabled = false;
    }
  }

  showToast(message, isError = false) {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${isError ? '#d93025' : '#137333'};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 10001;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Fade in
    setTimeout(() => {
      toast.style.opacity = '1';
    }, 100);
    
    // Fade out and remove
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }
}

// Accessibility enhancements
class AccessibilityEnhancer {
  constructor() {
    this.init();
  }

  init() {
    this.setupKeyboardNavigation();
    this.setupAriaLabels();
    this.setupFocusManagement();
  }

  setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      // Escape key closes modals
      if (e.key === 'Escape') {
        const modals = document.querySelectorAll('[role="dialog"]');
        modals.forEach(modal => modal.remove());
      }

      // Enter key on buttons
      if (e.key === 'Enter' && e.target.tagName === 'BUTTON') {
        e.target.click();
      }

      // Space key on labels
      if (e.key === ' ' && e.target.tagName === 'LABEL') {
        e.preventDefault();
        const targetId = e.target.getAttribute('for');
        if (targetId) {
          const target = document.getElementById(targetId);
          if (target && target.type === 'checkbox') {
            target.click();
          }
        }
      }
    });
  }

  setupAriaLabels() {
    // Add ARIA labels to toggle switches
    const toggles = document.querySelectorAll('.toggle-switch input');
    toggles.forEach(toggle => {
      const label = document.querySelector(`label[for="${toggle.id}"]`);
      if (label) {
        toggle.setAttribute('aria-label', label.textContent);
      }
    });

    // Add roles
    document.querySelector('.popup-container').setAttribute('role', 'main');
    document.querySelector('.header').setAttribute('role', 'banner');
    document.querySelector('.footer').setAttribute('role', 'contentinfo');
  }

  setupFocusManagement() {
    // Ensure first focusable element gets focus
    const firstFocusable = document.querySelector('input, button, [tabindex="0"]');
    if (firstFocusable) {
      firstFocusable.focus();
    }

    // Add focus indicators
    document.addEventListener('focusin', (e) => {
      e.target.classList.add('focused');
    });

    document.addEventListener('focusout', (e) => {
      e.target.classList.remove('focused');
    });
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const popupManager = new PopupManager();
  const accessibilityEnhancer = new AccessibilityEnhancer();
});

// Handle extension context invalidation
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'settingsUpdated') {
    // Reload settings if updated from another source
    window.location.reload();
  }
}); 