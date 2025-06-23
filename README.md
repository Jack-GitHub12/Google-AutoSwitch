# AutoSwitch for Google

**Version 1.0** | *Auto-switch Google accounts intelligently*

AutoSwitch automatically detects when you don't have permission to view a Google Doc, Sheet, or Slide, then seamlessly switches to the correct Google account. No more manual account switching or permission errors!

![AutoSwitch Logo](./autoswitcher.png)

## 🚀 Features

### Core Functionality
- **Silent Auto-Switch**: When exactly one account has access, switches automatically
- **Smart Account Picker**: When multiple accounts work, shows a clean selection modal
- **Permission Error Detection**: Automatically detects "You don't have permission" errors
- **Real-time Notifications**: Shows in-page toast and desktop notifications when switching

### Advanced Features
- **Undo Switch**: 8-second window to undo any account switch
- **Hover Previews**: Preview which account can access Drive links on hover
- **Context Menu**: Right-click "Open with AutoSwitch" on Google links
- **Keyboard Shortcut**: Alt+Shift+O to manually trigger AutoSwitch
- **Fallback Options**: Request access, retry, or open Google's native permission dialog

### Accessibility & UX
- **Full Accessibility**: ARIA labels, keyboard navigation, screen reader support
- **Dark Mode**: Automatic dark/light theme support
- **Mobile Responsive**: Works on all screen sizes
- **High Contrast**: Support for high contrast accessibility mode
- **Reduced Motion**: Respects user's motion preferences

## 📦 Installation

### From Chrome Web Store *(Coming Soon)*
1. Visit the [Chrome Web Store page](https://chrome.google.com/webstore) *(Link pending)*
2. Click "Add to Chrome"
3. Click "Add Extension" in the confirmation dialog

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension folder
5. The AutoSwitch icon should appear in your extensions toolbar

## 🎯 How It Works

### Automatic Detection
AutoSwitch monitors Google Docs, Sheets, Slides, and Drive for permission errors. When detected, it:

1. **Scans your Google accounts** to find which ones have access
2. **If exactly one account works**: Automatically switches and shows notification
3. **If multiple accounts work**: Shows account picker modal
4. **If no accounts work**: Shows fallback options (request access, retry, etc.)

### Manual Triggering
- **Keyboard**: Press Alt+Shift+O on any Google document
- **Context Menu**: Right-click any Google document link → "Open with AutoSwitch"
- **Extension Icon**: Click the AutoSwitch icon for settings and manual controls

## ⚙️ Settings & Configuration

Access settings by clicking the AutoSwitch extension icon in your toolbar.

### Core Settings
- **Enable AutoSwitch**: Master toggle for all functionality
- **Auto-switch on permission error**: Automatically switch when exactly one account works
- **Hover-preview tooltips**: Show account info when hovering over Google links

### Notifications
- **Show in-page toast**: Blue notification in bottom-left corner
- **Show desktop notifications**: Chrome system notifications
- **Enable undo option**: Show undo button in notifications (8-second timeout)

### Input Methods
- **Context-menu item**: Right-click menu on Google links
- **Keyboard shortcut**: Alt+Shift+O manual trigger

### Advanced Options
- **Enable in Incognito**: Allow AutoSwitch in private browsing
- **Auto-switch delay**: Delay before switching (0-30 seconds)
- **Toast duration**: How long notifications stay visible (3-30 seconds)

### Management
- **Manage remembered choices**: Clear saved account preferences per document
- **Domain overrides**: Disable AutoSwitch on specific domains
- **Export/Import settings**: Backup and restore your configuration

## 🔧 Technical Details

### Supported Google Services
- Google Docs (docs.google.com)
- Google Sheets (sheets.google.com)
- Google Slides (slides.google.com)
- Google Drive (drive.google.com)
- Gmail (mail.google.com) - *Limited support*

### Permissions Explained
- **Storage**: Save your settings and preferences
- **Notifications**: Show desktop notifications when switching accounts
- **Context Menus**: Add right-click menu options
- **Tabs**: Access current tab information for account switching
- **Active Tab**: Read page content to detect permission errors
- **Scripting**: Inject notification toasts and account picker modals
- **Host Permissions (Google domains)**: Monitor and interact with Google services

### Privacy & Security
- **No data collection**: AutoSwitch doesn't track or store any personal data
- **Local storage only**: All settings stored locally in your browser
- **No external servers**: All processing happens locally in your browser
- **Open source**: Full source code available for review

## 🛠️ Development

### Project Structure
```
autoswitch/
├── manifest.json          # Extension configuration
├── background.js          # Service worker (main logic)
├── content-script.js      # Page interaction script
├── content-script.css     # Styles for injected elements
├── popup.html            # Settings UI
├── popup.css             # Settings UI styles
├── popup.js              # Settings UI logic
├── icons/                # Extension icons (16, 32, 48, 128px)
└── README.md             # This file
```

### Building from Source
1. Clone the repository:
   ```bash
   git clone https://github.com/username/autoswitch.git
   cd autoswitch
   ```

2. The extension is ready to load without any build process

3. Load in Chrome:
   - Go to `chrome://extensions/`
   - Enable Developer mode
   - Click "Load unpacked"
   - Select the `autoswitch` folder

### Contributing
We welcome contributions! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📋 Changelog

### Version 1.0.0 (Current)
- Initial release
- Silent auto-switching for single valid accounts
- Account picker modal for multiple valid accounts
- Real-time notifications (toast + desktop)
- Undo functionality with 8-second timeout
- Hover previews for Drive links
- Context menu integration
- Keyboard shortcut support (Alt+Shift+O)
- Fallback options for no-access scenarios
- Comprehensive settings UI
- Full accessibility support
- Dark mode support
- Mobile responsive design

## 🐛 Troubleshooting

### Common Issues

**AutoSwitch isn't detecting permission errors**
- Ensure the extension is enabled in settings
- Check that you're on a supported Google service
- Try refreshing the page

**Account switching isn't working**
- Make sure you're logged into multiple Google accounts
- Check if the target account actually has access to the document
- Try manually triggering with Alt+Shift+O

**Notifications not showing**
- Check Chrome notification permissions
- Verify notification settings in the extension popup
- Ensure Chrome notifications are enabled in system settings

**Extension not working in Incognito**
- Enable "Allow in Incognito" in Chrome's extension management
- Enable the "Incognito Mode" setting in AutoSwitch settings

### Reset to Defaults
If you're experiencing issues:
1. Click the AutoSwitch extension icon
2. Scroll to the bottom of the settings
3. Click "Reset to Defaults"
4. Confirm the reset

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/username/autoswitch/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/username/autoswitch/discussions)
- **Email**: feedback@autoswitch.com

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with love for Google Workspace power users
- Inspired by the friction of constant account switching
- Thanks to the Chrome Extension community for best practices

---

**Made with ❤️ for better Google productivity** # Google-AutoSwitch
