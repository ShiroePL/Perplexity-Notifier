// Track if we're monitoring a response
let isMonitoringResponse = false;
let responseStableTimer = null;
let inPageNotification = null;

// Function to show notification when response is complete
function notifyResponseComplete() {
  // Only send message to background script if tab is not focused
  if (!document.hasFocus()) {
    chrome.runtime.sendMessage({
      action: "showNotification",
      title: "Perplexity Response Complete",
      message: "Your Perplexity AI query has finished generating a response!",
      url: window.location.href
    });
    
    // Only play sound if tab is not focused
    const audio = new Audio('https://actions.google.com/sounds/v1/alarms/medium_bell_ringing_near.ogg');
    audio.play().catch(e => console.log('Sound playback failed:', e));

    // Explicitly stop the sound after 3 seconds
    setTimeout(() => {
      audio.pause();
      audio.currentTime = 0;
    }, 3000);
  }

  // Always show in-page notification
  inPageNotification = document.createElement('div');
  inPageNotification.textContent = "Perplexity response complete! ✓";
  inPageNotification.style.cssText = 'position:fixed;top:20px;right:20px;background:#4CAF50;color:white;padding:12px 20px;border-radius:5px;z-index:9999;box-shadow:0 2px 5px rgba(0,0,0,0.2);font-weight:bold;font-family:Arial,sans-serif;';
  document.body.appendChild(inPageNotification);
  
  // Remove notification after 5 seconds or when tab gets focus
  window.addEventListener('focus', removeInPageNotification, {once: true});
  setTimeout(removeInPageNotification, document.hasFocus() ? 3000 : 5000);

  // Only flash title if tab is not focused
  if (!document.hasFocus()) {
    let originalTitle = document.title;
    let titleFlashInterval;

    // Flash the title to get attention
    function startTitleFlash() {
      let flashState = false;
      titleFlashInterval = setInterval(() => {
        document.title = flashState ? '🔴 RESPONSE READY!' : originalTitle;
        flashState = !flashState;
      }, 1000);
      
      // Stop flashing after 30 seconds or when tab becomes active
      setTimeout(stopTitleFlash, 30000);
      window.addEventListener('focus', stopTitleFlash, {once: true});
    }

    function stopTitleFlash() {
      if (titleFlashInterval) {
        clearInterval(titleFlashInterval);
        document.title = originalTitle;
      }
    }

    startTitleFlash();
  }
}

// Function to remove the in-page notification
function removeInPageNotification() {
  if (inPageNotification && inPageNotification.parentNode) {
    // Add a fade-out effect
    inPageNotification.style.transition = 'opacity 0.5s';
    inPageNotification.style.opacity = '0';
    
    // Remove after transition completes
    setTimeout(() => {
      if (inPageNotification && inPageNotification.parentNode) {
        inPageNotification.parentNode.removeChild(inPageNotification);
        inPageNotification = null;
      }
    }, 500);
  }
}

// Check specifically for the Perplexity typing indicator animation
function isTypingAnimationVisible() {
  // Specifically look for the typing indicator SVG
  const typingIndicator = document.querySelector('svg.animate-pplxIndicator');
  
  if (typingIndicator) {
    console.log('Found Perplexity typing indicator');
    return true;
  }
  
  // Backup method - look for any animation that might be the typing indicator
  const potentialIndicators = document.querySelectorAll('svg[class*="animat"]');
  for (const svg of potentialIndicators) {
    // Check for animation classes that match Perplexity's pattern
    if (svg.getAttribute('class')?.includes('pplx') || 
        svg.getAttribute('class')?.includes('typing') || 
        svg.getAttribute('class')?.includes('indicator')) {
      console.log('Found potential typing indicator via backup method');
      return true;
    }
  }
  
  return false;
}

// Detect if a query was just submitted (by looking for common patterns)
function detectQuerySubmission() {
  // Look for submit buttons in active/clicked state
  const activeButtons = document.querySelectorAll('button[aria-pressed="true"], button:active');
  
  if (activeButtons.length > 0) {
    return true;
  }
  
  // Also look for textarea/input that just lost focus
  const activeInputs = document.activeElement;
  if (activeInputs && 
      (activeInputs.tagName === 'TEXTAREA' || activeInputs.tagName === 'INPUT') && 
      !document.hasFocus()) {
    return true;
  }
  
  return false;
}

// Start monitoring for a completed response
function startMonitoringResponse() {
  if (isMonitoringResponse) return;
  
  console.log('Starting response monitoring...');
  isMonitoringResponse = true;
  
  let wasAnimationVisible = false;
  let animationStoppedTime = null;
  let startTime = Date.now();
  
  // Use requestAnimationFrame for more reliable background tab execution
  function checkAnimation() {
    const currentlyAnimating = isTypingAnimationVisible();
    
    // If we see animation, mark that we've seen it
    if (currentlyAnimating) {
      console.log('Animation visible - response being generated');
      wasAnimationVisible = true;
      animationStoppedTime = null;
    } 
    // If animation was previously visible but now stopped
    else if (wasAnimationVisible) {
      if (!animationStoppedTime) {
        console.log('Animation stopped - starting completion timer');
        animationStoppedTime = Date.now();
      } 
      // If animation has been stopped for at least 1 second
      else if (Date.now() - animationStoppedTime > 1000) {
        console.log('Response appears complete!');
        notifyResponseComplete();
        isMonitoringResponse = false;
        return; // Stop the monitoring loop
      }
    }
    // If no animation detected within 5 seconds, stop monitoring
    else if (Date.now() - startTime > 5000 && !wasAnimationVisible) {
      console.log('No animation detected within timeout - stopping');
      isMonitoringResponse = false;
      return; // Stop the monitoring loop
    }
    
    // Check for safety timeout
    if (Date.now() - startTime > 120000) {
      console.log('Safety timeout reached - stopping monitoring');
      isMonitoringResponse = false;
      return; // Stop the monitoring loop
    }
    
    // Continue monitoring if still active
    if (isMonitoringResponse) {
      setTimeout(checkAnimation, 300);
    }
  }
  
  // Start the monitoring loop
  checkAnimation();
}

// Setup event listeners to detect when to start monitoring
function initialize() {
  console.log('Perplexity Response Notifier initialized');
  
  // Debug notifications
  debugNotifications();
  
  // Let background script know the content script is initialized
  chrome.runtime.sendMessage({ action: "contentScriptReady" });
  
  // Detect form submissions
  document.addEventListener('submit', (event) => {
    console.log('Form submit detected');
    setTimeout(startMonitoringResponse, 300);
  });
  
  // Detect clicks on buttons
  document.addEventListener('click', (event) => {
    // Target submit buttons, divs that look like buttons, etc.
    if (event.target.closest('button, [role="button"], [type="submit"]')) {
      console.log('Button click detected');
      setTimeout(startMonitoringResponse, 300);
    }
  });
  
  // Detect Enter key in textareas
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && 
        (event.target.tagName === 'TEXTAREA' || 
         event.target.tagName === 'INPUT')) {
      console.log('Enter key detected in input');
      setTimeout(startMonitoringResponse, 300);
    }
  });
  
  // Monitor DOM changes for typing indicator appearing
  const observer = new MutationObserver((mutations) => {
    if (!isMonitoringResponse && isTypingAnimationVisible()) {
      console.log('Animation detected via DOM mutation');
      startMonitoringResponse();
    }
  });
  
  // Start observing the document
  observer.observe(document.body, { 
    childList: true, 
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });
  
  // Handle background page requests
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "tabFocused") {
      removeInPageNotification();
    }
    if (message.action === "checkStatus") {
      sendResponse({ isMonitoring: isMonitoringResponse });
    }
  });

  // Track tab visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && inPageNotification) {
      removeInPageNotification();
    }
  });
}

// Start the extension when the page is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Optional debugging function that you can keep or remove
function debugAnimations() {
  console.log('Checking for animation elements...');
  
  // Look specifically for the typing indicator
  const typingIndicator = document.querySelector('svg.animate-pplxIndicator');
  if (typingIndicator) {
    console.log('DEBUG: Found typing indicator:', typingIndicator);
  } else {
    console.log('DEBUG: No typing indicator found');
  }
  
  // Look for any SVGs with animation classes
  const svgElements = document.querySelectorAll('svg[class*="animat"]');
  console.log(`DEBUG: Found ${svgElements.length} SVG animation elements`);
  svgElements.forEach(el => {
    console.log('- SVG Element:', el.className);
  });
}

// Call periodically for debugging - comment this out in the final version
// setInterval(debugAnimations, 3000);

// Add this near the top of your file
function debugNotifications() {
  chrome.runtime.sendMessage({ action: "checkNotificationPermission" }, (response) => {
    console.log("Notification permission status:", response);
  });
}