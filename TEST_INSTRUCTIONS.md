# AutoSwitch Testing Instructions

## Quick Testing Steps

### 1. Extension Installation Check
1. Load the extension in Chrome (Developer mode)
2. Check that AutoSwitch icon appears in toolbar
3. Click icon to verify popup loads without errors

### 2. Console Debugging (CRITICAL)
**BEFORE testing account detection, you MUST open the browser console:**

1. **Open Chrome DevTools**: 
   - Right-click → "Inspect" → "Console" tab
   - OR press `F12` → "Console" tab

2. **Keep console open** during all testing

3. **Look for AutoSwitch initialization messages:**
   ```
   🚀 Loading AutoSwitch Content Manager...
   🚀 AutoSwitch Content Manager initializing...
   ⚙️ Settings loaded: {...}
   ✅ AutoSwitch Content Manager ready
   🔧 AutoSwitch Debug Commands:
   ```

### 3. Account Detection Test

#### Option A: Using Extension Popup
1. Open any Google page (Gmail, Drive, Docs)
2. Open browser console (F12)
3. Click AutoSwitch extension icon
4. Click "Quick Test" button
5. **Watch console output** for detailed detection process

#### Option B: Manual Console Command
1. Open any Google page with console open
2. Run: `window.autoswitchInstance.detectAccountsWithDebug()`
3. **Watch detailed console output**

### 4. What to Look For in Console

#### Expected Debug Output:
```
🔍 Starting comprehensive account detection...
🔄 Method 1: Attempting to expose accounts via account switcher...
🔍 Method 2: Enhanced DOM scanning...
📊 DOM Scan Results: X/40+ selectors successful
📄 Method 3: Page content regex scanning...
📧 Found X emails in page content: [...]
🌐 Method 4: JavaScript globals checking...
🍪 Method 5: URL and cookie analysis...
💾 Method 6: Checking background script stored accounts...
🗄️ Method 7: Storage scanning...
🎯 Final result: X unique accounts detected
📊 ACCOUNT DETECTION SUMMARY:
├── Total selectors tried: 40+
├── Successful selectors: X
├── DOM elements found: X  
├── Emails discovered: X
├── Final account count: X
└── Detection sources: DOM scanning, Page content, etc.
```

### 5. Troubleshooting Guide

#### If seeing "No accounts detected":
1. **Verify you're logged into multiple Google accounts**
2. **Try different Google services:**
   - Gmail (mail.google.com)
   - Drive (drive.google.com) 
   - Google Docs (docs.google.com)
3. **Check if logged in properly:**
   - Look for your profile picture in top-right corner
   - Can you manually switch accounts using Google's account switcher?

#### If only detecting 1 account:
1. **Check console for specific detection methods that succeeded**
2. **Look for emails in debug output** - are multiple emails found but deduplicated?
3. **Try the account switcher** - click your profile picture to see account menu
4. **Run manual debug**: `window.autoswitchInstance.debugData` after testing

#### Console shows errors:
1. **Red error messages** - Extension may have installation issues
2. **Permission errors** - Extension may lack required permissions
3. **"autoswitchInstance not defined"** - Extension didn't load properly

### 6. Detailed Debug Analysis

After running detection, check debug data:
```javascript
// View detailed debug information
window.autoswitchInstance.debugData

// Re-run detection with full logging
window.autoswitchInstance.detectAccountsWithDebug()
```

### 7. Specific Test Pages

Try testing on these specific pages:
1. **Gmail**: https://mail.google.com
2. **Drive**: https://drive.google.com  
3. **Google Docs**: Create/open any document
4. **Sheets**: https://sheets.google.com
5. **Account switcher page**: Click profile picture → "Add account"

### 8. Expected Results

#### For multiple logged-in accounts:
- Should detect 2+ accounts
- Console shows emails from different sources
- Account picker modal appears (if triggered)

#### For single account:
- Should detect 1 account  
- Console shows account details
- Auto-switching occurs (if permission error)

### 9. Report Format

When reporting results, include:

1. **Browser/OS**: Chrome version, operating system
2. **Google accounts**: How many accounts you're logged into
3. **Test page**: Which Google service you tested on
4. **Console output**: Copy the full debug summary
5. **Specific issue**: What behavior you expected vs. what happened

Example report:
```
Browser: Chrome 119 on macOS
Accounts: 2 Google accounts logged in
Test page: https://drive.google.com
Console shows: "Final result: 1 unique accounts detected"
Issue: Only detecting 1 account despite 2 being logged in

Debug data shows:
- DOM scanning: 0 accounts found
- Page content: 1 email found
- Other methods: 0 accounts found
```

This detailed information helps identify exactly where the detection is failing! 