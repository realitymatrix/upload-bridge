# Upload Bridge

Human-in-the-loop file uploads for agentic browser automation.

AI agents that drive a browser (filling job applications, submitting forms) inevitably hit `<input type="file">`. Letting a model push arbitrary local files into arbitrary webpages is unsafe: a compromised or prompt-injected agent could exfiltrate any file it can name. Upload Bridge closes that gap. The agent may **request** an upload, but the upload only happens after a **human approves it in a native OS dialog** rendered by trusted local code — showing the true resolved file path, size, and target field, with **Deny** as the default button.

## Architecture

```
+--------+   HTTP POST /trigger     +------------------+
| Agent  | -----------------------> |  bridge.js       |
| (CLI:  |   {file, target}         |  127.0.0.1:8765  |
| trigger.js)                       +---------+--------+
+--------+                                    |
                                              v
                                   +----------------------+
                                   | Native approval      |
                                   | dialog (PowerShell   |
                                   | MessageBox,          |
                                   | default = Deny)      |
                                   +----------+-----------+
                                              | human clicks Yes
                                              v
                                   +----------------------+
                                   | WebSocket (only      |
                                   | chrome-extension://  |
                                   | origins accepted)    |
                                   +----------+-----------+
                                              v
                                   +----------------------+
                                   | Extension background |
                                   | -> content script    |
                                   | -> DataTransfer into |
                                   |    <input type=file> |
                                   +----------------------+
```

## The trust model

This is the whole point of the project:

- **The model can request, never consent.** The agent's only capability is asking. It cannot render, click, or bypass the approval UI.
- **Trusted UI shows the true object.** The approval dialog is drawn by local code the agent does not control, and it displays the *resolved* file path and size — not whatever the agent claims it is uploading. A prompt-injected agent cannot misrepresent an upload.
- **Default = Deny.** The dialog's default button is "No". Pressing Enter, or the dialog timing out, denies.
- **No skip-dialog flag, by design.** There is deliberately no environment variable, config option, or CLI flag that suppresses the dialog.
- **Per-file consent, no standing grants.** Every single upload requires a fresh approval. Approving one file never authorizes the next.
- **Audit log.** Every request, approval, and denial is appended to `uploads.log` with a timestamp.

## Setup

1. `npm install`
2. `node bridge.js` (or `npm start`) — listens on `127.0.0.1:8765`
3. In a Chromium browser (Chrome, Vivaldi, Edge, Brave): open `chrome://extensions`, enable Developer mode, **Load unpacked**, and select the `extension/` folder.
4. Edit `extension/manifest.json` `host_permissions` and `content_scripts.matches` to the sites you actually use. The shipped list targets common job-application/ATS domains; **trim it to your own targets** — the content script only needs to run where you upload files.

## Usage

Agent (or you) requests an upload:

```
node trigger.js "C:\Users\you\Documents\resume.pdf" "Resume"
```

The second argument is a target hint used to pick the right file input on the page (matched against nearby label text). A native dialog appears; click **Yes** to approve. On approval the file is injected into the matching `<input type="file">` on the active tab and a `change` event is fired.

Health check:

```
curl http://127.0.0.1:8765/health
# {"ok":true,"extensionConnected":true}
```

Supported file types: pdf, doc, docx, txt, rtf (see `MIME` map in `bridge.js`).

## Security notes and known limitations

- **The localhost trigger endpoint is unauthenticated.** Any local process can *request* an upload — but every request still faces the human dialog, which shows the true file. Requesting is cheap; consent is not.
- **WebSocket connections are restricted to `chrome-extension://` origins**, so web pages cannot connect to the bridge and receive file bytes.
- The extension keeps its service worker and WebSocket alive via `chrome.alarms` (~24s period); after a browser restart it may take a moment to reconnect. Check `/health`.
- The content script only attaches to pages loaded **after** the extension is installed/reloaded; refresh existing tabs.
- Injection targets the **active tab** in the last-focused window; make sure the form you intend is frontmost when approving.
- Windows-only approval dialog for now (PowerShell `MessageBox`).

## Roadmap

- MCP-server wrapper so agents can use it as a first-class tool
- Per-origin allowlists (bind approvals to the target site, shown in the dialog)
- One-time request tokens for the trigger endpoint
- macOS (osascript) and Linux (zenity) approval dialogs

## Why this exists

Agentic automation is only safe when consent is bound to the true object, in UI the model cannot draw or click. Upload Bridge was designed so that even a fully compromised or prompt-injected agent cannot misrepresent an upload: the human sees the actual resolved file in a trusted native dialog, and nothing moves without their click.

## License

MIT — see [LICENSE](LICENSE).
