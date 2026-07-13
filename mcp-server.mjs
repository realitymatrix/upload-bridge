// Upload Bridge MCP server - exposes the consent layer as first-class agent tools.
//
// Any MCP-capable agent (Claude Code, Claude Desktop, etc.) can call these
// tools; the trust model is unchanged. File uploads and decision forms still
// require the human's approval in the native dialog. The agent only requests.
//
// Register (Claude Code):  claude mcp add upload-bridge -- node mcp-server.mjs
// Or in a project .mcp.json:
//   { "mcpServers": { "upload-bridge": { "command": "node",
//       "args": ["C:/path/to/upload-bridge/mcp-server.mjs"] } } }

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BRIDGE = "http://127.0.0.1:8765";

async function bridgeRequest(path, body, timeoutMs = 610000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BRIDGE}${path}`, {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const text = await res.text();
    return { status: res.status, text };
  } catch (e) {
    return { status: 0, text: `bridge unreachable: ${e.message}. Is "node bridge.js" running?` };
  } finally {
    clearTimeout(timer);
  }
}

const asText = (r) => ({ content: [{ type: "text", text: `HTTP ${r.status}: ${r.text}` }] });

const server = new McpServer({ name: "upload-bridge", version: "1.0.0" });

server.tool(
  "bridge_health",
  "Check that the Upload Bridge is running and the browser extension is connected.",
  {},
  async () => asText(await bridgeRequest("/health", null, 5000))
);

server.tool(
  "upload_file",
  "Request a file upload into a web form. A native consent dialog is shown to the human (deny-by-default); the upload only happens if they approve. Blocks until they decide.",
  {
    file: z.string().describe("Absolute local path (pdf, doc, docx, txt, rtf)"),
    target: z.string().optional().describe('Hint matched against label text near the file input, e.g. "Resume"'),
    targetUrl: z.string().optional().describe('URL substring selecting the destination tab, e.g. "greenhouse.io/acme"'),
  },
  async ({ file, target, targetUrl }) => asText(await bridgeRequest("/trigger", { file, target, targetUrl }, 150000))
);

server.tool(
  "fill_form",
  "Fill many form fields on the target page in one pass (text values only, no files, no dialog). Values should already be human-approved. Check the on-page toast for the per-field report.",
  {
    targetUrl: z.string().optional().describe("URL substring selecting the destination tab"),
    fields: z
      .array(
        z.object({
          label: z.string().describe("Matched against text near the control"),
          value: z.string(),
          commit: z.boolean().optional().describe("ArrowDown+Enter nudge for combobox fields (best-effort)"),
        })
      )
      .min(1),
  },
  async ({ targetUrl, fields }) => asText(await bridgeRequest("/fill", { targetUrl, fields }, 30000))
);

server.tool(
  "request_decisions",
  "Show the human ONE native form containing file-upload approvals (deny-by-default checkboxes) and/or questions (choice or text). Blocks until they submit or cancel; returns their answers as JSON and dispatches any approved files.",
  {
    title: z.string().optional(),
    targetUrl: z.string().optional(),
    items: z
      .array(
        z.union([
          z.object({
            kind: z.literal("file"),
            label: z.string(),
            path: z.string(),
            target: z.string().optional(),
          }),
          z.object({
            kind: z.literal("choice"),
            id: z.string(),
            question: z.string(),
            options: z.array(z.string()).min(1),
            other: z.boolean().optional(),
          }),
          z.object({
            kind: z.literal("text"),
            id: z.string(),
            question: z.string(),
            value: z.string().optional(),
          }),
        ])
      )
      .min(1),
  },
  async ({ title, targetUrl, items }) => asText(await bridgeRequest("/form", { title, targetUrl, items }))
);

const transport = new StdioServerTransport();
await server.connect(transport);
