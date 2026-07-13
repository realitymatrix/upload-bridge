// Upload Bridge extension — background service worker.
// Connects to the local bridge over WebSocket and forwards approved file
// payloads to the content script in the tab that was active AT REQUEST TIME
// (bound via the 'pending' message), so a tab switch during the human's
// deliberation cannot redirect the file to a different page.

let ws = null;

async function bindPendingTab(requestId) {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab) return;
  await chrome.storage.session.set({ ['req_' + requestId]: tab.id });
}

async function takePendingTab(requestId) {
  const key = 'req_' + requestId;
  const stored = await chrome.storage.session.get(key);
  await chrome.storage.session.remove(key);
  return stored[key];
}

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  ws = new WebSocket('ws://127.0.0.1:8765');

  ws.onopen = () => console.log('[upload-bridge] connected');

  ws.onmessage = async (event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }

    if (msg.type === 'pending') return bindPendingTab(msg.requestId);
    if (msg.type === 'cancelled') return takePendingTab(msg.requestId);
    if (msg.type !== 'inject') return;

    let tabId = await takePendingTab(msg.requestId);
    if (tabId === undefined) {
      // Fallback (e.g. service worker restarted mid-request): active tab.
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      tabId = tab && tab.id;
    }
    if (tabId === undefined) return console.warn('[upload-bridge] no target tab');
    try {
      const reply = await chrome.tabs.sendMessage(tabId, msg);
      console.log('[upload-bridge] inject result:', reply);
    } catch (e) {
      console.warn('[upload-bridge] content script unreachable on target tab:', e.message);
    }
  };

  ws.onclose = () => { ws = null; };
  ws.onerror = () => { try { ws.close(); } catch {} };
}

// Keep the service worker alive-ish and the socket connected.
chrome.alarms.create('reconnect', { periodInMinutes: 0.4 });
chrome.alarms.onAlarm.addListener(connect);
chrome.runtime.onStartup.addListener(connect);
connect();
