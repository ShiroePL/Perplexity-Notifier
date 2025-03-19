// When notification window loads, display the notification information
document.addEventListener('DOMContentLoaded', function() {
  chrome.storage.local.get(['notificationData'], function(result) {
    if (result.notificationData) {
      document.getElementById('title').textContent = result.notificationData.title;
      document.getElementById('message').textContent = result.notificationData.message;
    }
  });
  
  // Set up button actions with better error handling
  document.getElementById('viewButton').addEventListener('click', function() {
    console.log('View button clicked');
    chrome.runtime.sendMessage({ action: "openPerplexityTab" }, function(response) {
      // Log any error
      if (chrome.runtime.lastError) {
        console.error('Error sending message:', chrome.runtime.lastError);
      }
      
      // Close window after sending message
      window.close();
    });
  });
  
  document.getElementById('dismissButton').addEventListener('click', function() {
    window.close();
  });
}); 