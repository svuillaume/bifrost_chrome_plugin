'use strict';

const CVE_RE = /\bCVE-\d{4}-\d{4,}\b/i;

document.addEventListener('mouseup', () => {
  const sel = window.getSelection()?.toString().trim() ?? '';
  const m   = sel.match(CVE_RE);
  if (!m) return;
  chrome.runtime.sendMessage({ type: 'CVE_SELECTED', cveId: m[0].toUpperCase() });
});
