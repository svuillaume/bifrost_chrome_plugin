'use strict';

// Open the side panel when the toolbar icon is clicked
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// CVE text-selection relay: content script → background → panel
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type !== 'CVE_SELECTED' || !msg.cveId) return;
  const windowId = sender.tab?.windowId;
  if (!windowId) return;

  // Always store — panel reads this on open if it wasn't already open
  chrome.storage.session.set({ pendingCve: msg.cveId }, () => {
    // Try to forward to an already-open panel; if none is open, open one
    // (the panel's storage.session.get on load will pick up pendingCve)
    chrome.runtime.sendMessage({ type: 'CVE_SELECTED', cveId: msg.cveId }, () => {
      // sendMessage throws if no listener answered — that just means the panel
      // wasn't open yet; suppress the error and open it
      void chrome.runtime.lastError;
      chrome.sidePanel.open({ windowId });
    });
  });
});
