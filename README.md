# Perplexity Response Notifier

This Chrome extension monitors Perplexity AI responses and notifies you when a response is complete, even when the tab is not in focus.

## How It Works

The extension works by monitoring the Perplexity AI page for specific changes that indicate when a response is being generated and when it completes.

### Detection Mechanism

The core of the extension relies on detecting Perplexity's typing indicator animation, which appears when the AI is generating a response. Here's how it works:

1. The extension looks for a specific SVG element with the class `animate-pplxIndicator`, which is Perplexity's typing animation.
2. As a fallback, it also searches for any SVG elements with animation classes that contain "pplx", "typing", or "indicator" in their names.

### Monitoring Process

The extension uses multiple approaches to detect when to start monitoring for a response:

1. **Event Listeners**: The extension listens for form submissions, button clicks, and Enter key presses in textareas, which typically indicate that a user has submitted a query.

2. **DOM Change Monitoring**: A MutationObserver watches for changes to the page DOM, particularly focusing on class changes which might indicate the appearance of the typing indicator.

### Response Completion Detection

Once monitoring begins, the extension:

1. Checks if the typing animation is visible, which indicates a response is being generated
2. Continues monitoring until the animation disappears after having been visible
3. Waits for a short period (1 second) to confirm the animation has stopped
4. Triggers the notification when it determines the response is complete

## Notification Features

When a response is complete, the extension provides several types of notifications:

1. Chrome notification (if tab is not focused)
2. Sound alert (if tab is not focused)
3. In-page notification (always shown)
4. Title bar flashing (if tab is not focused)

These notifications help ensure you don't miss when Perplexity AI has finished generating a response to your query, even when you're working in another tab or application.
