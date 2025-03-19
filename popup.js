// When the popup loads, display the notification information
document.addEventListener('DOMContentLoaded', function() {
  chrome.storage.local.get(['notificationData'], function(result) {
    if (result.notificationData) {
      document.getElementById('title').textContent = result.notificationData.title;
      document.getElementById('message').textContent = result.notificationData.message;
      
      // Format timestamp
      const date = new Date(result.notificationData.timestamp);
      document.getElementById('timestamp').textContent = 
        `${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
      
      // Set URL for the view button
      document.getElementById('viewButton').addEventListener('click', function() {
        chrome.runtime.sendMessage({ action: "openPerplexityTab" });
        window.close();
      });
    }
  });
}); 