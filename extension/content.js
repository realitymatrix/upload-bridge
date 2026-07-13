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

// ---- one-pass form filling ----
// Receives {type:'fill', fields:[{label, value}]} and fills every matching
// control in one pass. Values are set the React-compatible way (native setter
// + input event) so ATS frameworks register them. Returns a per-field report.

function findControl(label) {
  const controls = [...document.querySelectorAll(
    'input[type="text"], input[type="email"], input[type="tel"], input:not([type]), textarea, select'
  )].filter((el) => el.offsetParent !== null);
  const hint = label.toLowerCase();
  let best = null, bestDepth = Infinity;
  for (const el of controls) {
    let node = el, depth = 0;
    while (node && depth < 8) {
      const text = (node.innerText || '').toLowerCase();
      if (text.includes(hint) && text.length < 1500) {
        if (depth < bestDepth) { best = el; bestDepth = depth; }
        break;
      }
      node = node.parentElement; depth++;
    }
  }
  return best;
}

function setReactValue(el, value) {
  const proto = el instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  setter.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function fillOne(field) {
  const el = findControl(field.label);
  if (!el) return { label: field.label, ok: false, reason: 'no control found' };
  try {
    if (el instanceof HTMLSelectElement) {
      const opt = [...el.options].find(
        (o) => o.value === field.value || o.text.trim().toLowerCase() === String(field.value).toLowerCase()
      );
      if (!opt) return { label: field.label, ok: false, reason: 'option not found' };
      el.value = opt.value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return { label: field.label, ok: true, kind: 'select' };
    }
    el.focus();
    setReactValue(el, String(field.value));
    if (field.commit) {
      // Combobox commit: filter text is set; nudge selection of first match.
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    }
    el.blur();
    return { label: field.label, ok: true, kind: el.tagName.toLowerCase() };
  } catch (e) {
    return { label: field.label, ok: false, reason: e.message };
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'fill') {
    const report = (msg.fields || []).map(fillOne);
    const okCount = report.filter((r) => r.ok).length;
    toast(`Upload Bridge: filled ${okCount}/${report.length} fields`, okCount === report.length);
    sendResponse({ ok: true, report });
    return true;
  }
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
