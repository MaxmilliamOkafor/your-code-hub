// ATS Tailored CV & Cover Letter - Background Service Worker v2.0
// Handles extension lifecycle, tab management, and bulk apply coordination

console.log('[ATS Tailor] Background service worker v2.0 started');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[ATS Tailor] Extension installed');
    // Initialize default credentials
    chrome.storage.local.set({
      workday_credentials: {
        email: 'Maxokafordev@gmail.com',
        password: 'May19315park@',
        autoLogin: true
      }
    });
  } else if (details.reason === 'update') {
    console.log('[ATS Tailor] Extension updated to version', chrome.runtime.getManifest().version);
  }
});

// Keep service worker alive and handle messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'keepAlive') {
    sendResponse({ status: 'alive' });
    return true;
  }
  
  // Open the extension popup when automation starts
  if (message.action === 'openPopup') {
    chrome.action.setBadgeText({ text: '⚙️' });
    chrome.action.setBadgeBackgroundColor({ color: '#7c3aed' });
    sendResponse({ status: 'badge_set' });
    return true;
  }
  
  // Clear badge when automation completes
  if (message.action === 'clearBadge') {
    chrome.action.setBadgeText({ text: '' });
    sendResponse({ status: 'badge_cleared' });
    return true;
  }

  // Update badge with progress
  if (message.action === 'updateProgress') {
    const { current, total } = message;
    chrome.action.setBadgeText({ text: `${current}/${total}` });
    chrome.action.setBadgeBackgroundColor({ color: '#00d4ff' });
    sendResponse({ status: 'progress_updated' });
    return true;
  }

  // Handle tab creation for bulk apply
  if (message.action === 'createTab') {
    chrome.tabs.create({ url: message.url, active: false }, (tab) => {
      sendResponse({ tabId: tab.id });
    });
    return true;
  }

  // Handle tab removal
  if (message.action === 'removeTab') {
    chrome.tabs.remove(message.tabId, () => {
      sendResponse({ status: 'removed' });
    });
    return true;
  }

  // Inject content script into tab
  if (message.action === 'injectContentScript') {
    chrome.scripting.executeScript({
      target: { tabId: message.tabId },
      files: ['content.js']
    }).then(() => {
      sendResponse({ status: 'injected' });
    }).catch((error) => {
      sendResponse({ status: 'error', error: error.message });
    });
    return true;
  }
});

// Listen for tab updates (for bulk apply coordination)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    // Notify any listening bulk apply instances
    chrome.runtime.sendMessage({ 
      action: 'tabLoaded', 
      tabId, 
      url: tab.url 
    }).catch(() => {
      // Ignore errors if no listener
    });
  }
});
