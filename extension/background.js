'use strict';

// Open the side panel when the toolbar icon is clicked
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// CVE text-selection relay: content script → background → panel
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type !== 'CVE_SELECTED' || !msg.cveId) return;
  const windowId = sender.tab?.windowId;
  if (!windowId) return;

  // Store so the panel can pick it up if it isn't open yet
  chrome.storage.session.set({ pendingCve: msg.cveId });

  // Open the side panel then let the panel poll storage
  chrome.sidePanel.open({ windowId });
});
