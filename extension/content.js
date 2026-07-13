// Upload Bridge extension — content script.
// Receives a human-approved file payload and sets it on the matching
// <input type="file"> in the page, then fires the change event.

function findFileInput(targetHint) {
  const inputs = [...document.querySelectorAll('input[type="file"]')];
  if (inputs.length === 0) return null;
  if (inputs.length === 1 || !targetHint) return inputs[0];

  const hint = targetHint.toLowerCase();
  // Score each input by whether nearby text (walking up ancestors) mentions the hint.
  let best = null, bestDepth = Infinity;
  for (const input of inputs) {
    let node = input, depth = 0;
    while (node && depth < 8) {
      const text = (node.innerText || '').toLowerCase();
      if (text.includes(hint) && text.length < 2000) {
        if (depth < bestDepth) { best = input; bestDepth = depth; }
        break;
      }
      node = node.parentElement; depth++;
    }
  }
  return best || inputs[0];
}

function toast(text, ok) {
  const el = document.createElement('div');
  el.textContent = text;
  el.style.cssText =
    'position:fixed;top:16px;right:16px;z-index:2147483647;padding:12px 18px;' +
    `background:${ok ? '#1a7f37' : '#b91c1c'};color:#fff;font:14px sans-serif;` +
    'border-radius:8px;box-shadow:0 4px 14px rgba(0,0,0,.3)';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 5000);
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== 'inject') return;
  try {
    const input = findFileInput(msg.targetHint);
    if (!input) { toast('Upload Bridge: no file input found', false); sendResponse({ ok: false, reason: 'no input' }); return; }

    const bytes = Uint8Array.from(atob(msg.b64), (c) => c.charCodeAt(0));
    const file = new File([bytes], msg.fileName, { type: msg.mime });
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    toast(`Upload Bridge: attached "${msg.fileName}" (${msg.targetHint})`, true);
    sendResponse({ ok: true, field: msg.targetHint });
  } catch (e) {
    toast('Upload Bridge: injection failed', false);
    sendResponse({ ok: false, reason: e.message });
  }
  return true;
});
