# Roadmap

Upload Bridge started as a file-upload consent tool and is growing into something more general: **a governance layer for agentic browsing**. The core pattern stays fixed at every step:

> Agents request. Humans consent in trusted native UI. Consent binds to the true object. Everything is auditable.

## Phase 1 — Agent-native integration (in progress)

- [x] HTTP endpoints for upload (`/trigger`), one-pass form fill (`/fill`), combined approval form (`/form`)
- [x] MCP server wrapper (`mcp-server.mjs`) so any MCP-capable agent (Claude Code, Claude Desktop, others) can use the bridge as a first-class tool
- [x] OpenAPI 3.0 specification (`openapi.yaml`) for framework-agnostic integration
- [ ] One-time request tokens for the localhost endpoints (close the unauthenticated-localhost gap)

## Phase 2 — Governed action classes

Generalize consent beyond file uploads. Each *action class* gets its own request shape, trusted-UI presentation, and audit format:

- [ ] **Form submission** as a consented action: the final Submit click approved in the native form, with a rendered summary of exactly what will be sent
- [ ] **Downloads**: agent-initiated downloads face the same dialog (true URL, size, destination)
- [ ] **Sensitive-page guard**: content script detects credential/payment surfaces and refuses agent-driven interaction outright
- [ ] Per-origin policies: e.g. "greenhouse.io may receive files from ~/job-applications, per-file consent still required"; policies editable only in trusted UI, never by the agent

## Phase 3 — Accountability

- [ ] Signed, tamper-evident audit log (hash-chained entries)
- [ ] "What did my agent do today" digest generated from the log
- [ ] Per-session receipts: a signed summary the human can archive after each approval session

## Phase 4 — Reach

- [ ] Proper Windows packaging: winget manifest, tray app with bridge status, auto-start
- [ ] macOS (osascript/SwiftDialog) and Linux (zenity/GTK) consent dialogs
- [ ] Chrome Web Store listing for the extension
- [ ] Firefox (WebExtensions) port

## Phase 5 — Story

- [ ] Write-up of the origin story: an agent was asked to bypass its own sandbox, declined, and proposed building the right thing instead
- [ ] Demo video / GIF for the README

## Non-goals

- **A Chromium fork.** The bridge's strength is meeting users in *their* browser with *their* sessions. A dedicated browser inverts that and inherits a security-patch treadmill that consumes whole companies. If a dedicated surface is ever justified, an Electron/CEF shell reusing this exact governance layer is the path — but the extension model comes first.
- **A skip-consent mode.** There will never be a flag that suppresses the human dialog. That is the product.
