(() => {
  const HOST_ID = 'highlight-saver-host';
  let host = null;
  let pendingText = '';
  let shownAt = 0;

  const hideOverlay = () => {
    host?.remove();
    host = null;
    pendingText = '';
    shownAt = 0;
  };

  const isOurUI = (event) => {
    if (!host) return false;
    const path = event.composedPath?.() ?? [];
    return path.includes(host);
  };

  const showToast = (message, isError = false) => {
    const toastHost = document.createElement('div');
    toastHost.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
    const shadow = toastHost.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        .toast {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          padding: 12px 20px;
          background: rgba(2, 8, 23, 0.97);
          color: ${isError ? '#f87171' : '#22d3ee'};
          border: 1px solid ${isError ? 'rgba(248,113,113,0.5)' : 'rgba(34,211,238,0.5)'};
          border-radius: 12px;
          font: 600 14px system-ui, sans-serif;
          box-shadow: 0 12px 30px rgba(0,0,0,0.4);
          pointer-events: none;
        }
      </style>
      <div class="toast">${message}</div>
    `;
    document.documentElement.appendChild(toastHost);
    setTimeout(() => toastHost.remove(), 3000);
  };

  const isExtensionAlive = () => {
    try {
      return Boolean(chrome?.runtime?.id);
    } catch {
      return false;
    }
  };

  const saveHighlight = async (entry) => {
    // Method 1: direct storage (fastest)
    if (chrome?.storage?.local) {
      try {
        const result = await chrome.storage.local.get('highlights');
        const existing = Array.isArray(result.highlights) ? result.highlights : [];
        const next = [entry, ...existing];
        await chrome.storage.local.set({ highlights: next });
        return next.length;
      } catch (error) {
        const message = String(error);
        if (message.includes('Extension context invalidated')) {
          throw new Error('REFRESH');
        }
        // fall through to background save
      }
    }

    // Method 2: ask background worker (works when content script is stale)
    const response = await chrome.runtime.sendMessage({
      type: 'SAVE_HIGHLIGHT',
      entry,
    });

    if (response?.ok) {
      return response.count;
    }

    throw new Error(response?.error ?? 'SAVE_FAILED');
  };

  const saveSelection = async (text) => {
    if (!text) {
      showToast('Nothing to save — try selecting text again.', true);
      return;
    }

    if (!isExtensionAlive()) {
      showToast('Extension was updated — press F5 to refresh this page, then try again.', true);
      return;
    }

    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      text,
      sourceUrl: window.location.href,
      title: document.title || 'Untitled page',
      createdAt: new Date().toISOString(),
    };

    try {
      const count = await saveHighlight(entry);
      hideOverlay();
      window.getSelection()?.removeAllRanges();
      showToast(`Saved! (${count} total) — click the extension icon to view.`);
    } catch (error) {
      const message = String(error);
      if (message.includes('REFRESH') || message.includes('Extension context invalidated')) {
        showToast('Extension was updated — press F5 to refresh this page, then try again.', true);
      } else if (message.includes('Could not establish connection')) {
        showToast('Extension reconnecting — press F5 to refresh this page, then try again.', true);
      } else {
        showToast('Save failed — press F5 to refresh this page, then try again.', true);
      }
      console.error('[Highlight Saver] Save failed:', error);
    }
  };

  const showOverlay = (range, text) => {
    hideOverlay();
    pendingText = text;
    if (!text || !range) return;

    const rect = range.getBoundingClientRect();
    const top = Math.min(Math.max(rect.bottom + 10, 16), window.innerHeight - 70);
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - 260));

    host = document.createElement('div');
    host.id = HOST_ID;
    host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;';

    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        *, *::before, *::after { box-sizing: border-box; }
        .popup {
          position: fixed;
          top: ${top}px;
          left: ${left}px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          background: rgba(2, 8, 23, 0.98);
          border: 2px solid #22d3ee;
          border-radius: 12px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55);
          font-family: system-ui, -apple-system, sans-serif;
          pointer-events: auto;
          user-select: none;
        }
        .label {
          color: #94a3b8;
          font-size: 13px;
          white-space: nowrap;
        }
        #save-btn {
          background: linear-gradient(135deg, #22d3ee, #38bdf8);
          color: #020617;
          border: none;
          border-radius: 8px;
          padding: 10px 18px;
          cursor: pointer;
          font: 700 14px system-ui, sans-serif;
          white-space: nowrap;
          pointer-events: auto;
          touch-action: manipulation;
        }
        #save-btn:hover { filter: brightness(1.08); }
        #save-btn:active { transform: scale(0.97); }
        #cancel-btn {
          background: transparent;
          color: #94a3b8;
          border: 1px solid #475569;
          border-radius: 8px;
          padding: 10px 12px;
          cursor: pointer;
          font: 600 13px system-ui, sans-serif;
          pointer-events: auto;
          touch-action: manipulation;
        }
      </style>
      <div class="popup">
        <span class="label">Save this text?</span>
        <button type="button" id="save-btn">Save Highlight</button>
        <button type="button" id="cancel-btn">✕</button>
      </div>
    `;

    const saveBtn = shadow.getElementById('save-btn');
    const cancelBtn = shadow.getElementById('cancel-btn');

    saveBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      void saveSelection(pendingText);
    });

    cancelBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      hideOverlay();
    });

    document.documentElement.appendChild(host);
    shownAt = Date.now();
    saveBtn.focus();
  };

  const handleSelection = () => {
    if (host) return;

    const selection = window.getSelection();
    const text = selection?.toString().trim();
    const range = selection?.rangeCount > 0 ? selection.getRangeAt(0) : null;

    if (!text || !range || text.length < 2) return;

    showOverlay(range, text);
  };

  document.addEventListener('mouseup', handleSelection, true);

  document.addEventListener('keyup', (event) => {
    if (event.key === 'Escape') hideOverlay();
    if (host && event.key === 'Enter') void saveSelection(pendingText);
  }, true);

  document.addEventListener('mousedown', (event) => {
    if (!host) return;
    if (Date.now() - shownAt < 500) return;
    if (isOurUI(event)) return;
    hideOverlay();
  }, true);

  console.log('[Highlight Saver] v1.0.6 ready — select text, then click Save Highlight.');
})();
