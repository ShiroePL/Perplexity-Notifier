// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "showNotification") {
    // Always set badge on extension icon
    chrome.action.setBadgeText({ text: "✓" });
    chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
    
    // Store notification data for popup usage
    chrome.storage.local.set({
      notificationData: {
        title: message.title || 'Perplexity Response Complete',
        message: message.message || 'Your query has been answered!',
        url: message.url,
        timestamp: Date.now()
      }
    });
    
    // Keep track of which tab sent the notification
    lastNotificationTabId = sender.tab.id;
    
    // Just don't specify position, let Chrome position it automatically
    chrome.windows.create({
      url: 'notification.html',
      type: 'popup',
      width: 360,
      height: 180,
      focused: true
      // No left/top positioning
    }, function(window) {
      // Store window ID immediately to avoid race conditions
      notificationWindowId = window.id;
      
      // Auto-close the notification window after 15 seconds
      setTimeout(() => {
        // Double-check the window still exists
        chrome.windows.get(notificationWindowId, function(win) {
          if (chrome.runtime.lastError) {
            // Window doesn't exist anymore
            console.log("Window already closed");
            notificationWindowId = null;
          } else {
            // Window exists, close it
            chrome.windows.remove(notificationWindowId, function() {
              notificationWindowId = null;
            });
          }
        });
      }, 15000);
      
      // Log success
      console.log("Notification window shown");
    });
    
    // Clear the badge after 30 seconds
    setTimeout(() => {
      chrome.action.setBadgeText({ text: "" });
    }, 30000);
  }
  
  if (message.action === "contentScriptReady") {
    console.log("Content script ready in tab", sender.tab.id);
  }
  
  if (message.action === "checkNotificationPermission") {
    sendResponse({ permissionLevel: 'granted' });
    return true;
  }
  
  if (message.action === "openPerplexityTab") {
    console.log("Opening Perplexity tab:", lastNotificationTabId);
    
    if (lastNotificationTabId) {
      // Close the notification window if it exists
      if (notificationWindowId) {
        try {
          chrome.windows.remove(notificationWindowId, function() {
            if (chrome.runtime.lastError) {
              console.error("Error closing window:", chrome.runtime.lastError);
            }
            notificationWindowId = null;
          });
        } catch (e) {
          console.error("Failed to close notification window:", e);
          notificationWindowId = null;
        }
      }
      
      // Focus the Perplexity tab with better error handling
      chrome.tabs.get(lastNotificationTabId, function(tab) {
        if (chrome.runtime.lastError) {
          console.error("Tab error:", chrome.runtime.lastError);
          return;
        }
        
        // Tab exists, focus it
        chrome.tabs.update(lastNotificationTabId, { active: true }, function() {
          if (chrome.runtime.lastError) {
            console.error("Tab update error:", chrome.runtime.lastError);
            return;
          }
          
          // Focus the window containing the tab
          chrome.windows.update(tab.windowId, { focused: true }, function() {
            if (chrome.runtime.lastError) {
              console.error("Window focus error:", chrome.runtime.lastError);
            }
          });
        });
      });
      
      // Send response to notify content.js to hide the in-page notification
      chrome.tabs.sendMessage(lastNotificationTabId, { action: "tabFocused" });
    }
    
    if (sendResponse) {
      sendResponse({ success: true });
    }
  }
  
  // Always return true if you intend to respond asynchronously
  return true;
});

// Handle extension icon clicks
chrome.action.onClicked.addListener((tab) => {
  if (lastNotificationTabId) {
    chrome.tabs.update(lastNotificationTabId, { active: true });
  }
});

// Keep track of which tab sent the notification and notification window
let lastNotificationTabId = null;
let notificationWindowId = null;

// Optional: Keep the service worker alive for background tabs
function keepAlive() {
  setInterval(() => {
    console.log("Background service worker keeping alive");
  }, 20000);
}

keepAlive(); 