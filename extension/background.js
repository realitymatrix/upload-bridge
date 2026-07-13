// Upload Bridge extension — background service worker.
// Connects to the local bridge over WebSocket and forwards approved file
// payloads to the content script in the active tab.

let ws = null;

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  ws = new WebSocket('ws://127.0.0.1:8765');

  ws.onopen = () => console.log('[upload-bridge] connected');

  ws.onmessage = async (event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }
    if (msg.type !== 'inject') return;
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab) return console.warn('[upload-bridge] no active tab');
    try {
      const reply = await chrome.tabs.sendMessage(tab.id, msg);
      console.log('[upload-bridge] inject result:', reply);
    } catch (e) {
      console.warn('[upload-bridge] content script unreachable on this tab:', e.message);
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
