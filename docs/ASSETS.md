# Media assets (README video + GIF)

How to (re)generate the graphics used in the README. GitHub cannot run the
HTML/CSS animation itself — README markdown strips JS/CSS — so the animation is
embedded as a rendered **video** (MP4) plus a short looping **GIF**.

Two assets, one source file:

| Asset | Path | Role | How it embeds |
|-------|------|------|---------------|
| Looping GIF | `docs/consent-demo.gif` | Always-visible autoplay loop at the top of the README | committed to the repo, referenced by `<img src>` |
| Full MP4 | (GitHub-hosted, not in repo) | The full 35s explainer with a play button | uploaded as a GitHub *attachment*, rendered as a player |

The source animation lives in Claude Design (project "Consent for AI Agents").
The scene source is mirrored in this repo at [`design/consent-video.jsx`](../design/consent-video.jsx)
for reference; it renders only inside the Claude Design canvas, not standalone.

---

## Step 1 — Export the MP4 from Claude Design

In the `Consent for AI Agents` Design session, use its export/render control to
save the animation as **MP4, 1920x1080, 35s**. Call it `consent-explainer.mp4`.
This single file is the source for both README assets below.

## Step 2 — Full MP4 into the README (no tools required)

1. Open the README on github.com and click the pencil (edit).
2. **Drag `consent-explainer.mp4`** onto the line under the `## Watch the explainer`
   heading (there is an HTML comment there with the same instructions).
3. GitHub uploads it and inserts a `https://github.com/user-attachments/assets/<uuid>`
   URL that renders as an inline video player. Commit.

This uploads to GitHub's attachment store; it does **not** commit the MP4 to the
repo, so it never bloats the clone size.

## Step 3 — The looping GIF (`docs/consent-demo.gif`)

Requires `ffmpeg`. Install once on Windows:

```powershell
winget install --id Gyan.FFmpeg -e
```

Trim the hero moment (consent dialog springs up -> deny -> block, roughly
15.3s-23.8s of the animation) and render an optimized, infinitely-looping GIF:

```powershell
# 1) generate an optimized color palette from the hero segment
ffmpeg -ss 15.3 -to 23.8 -i consent-explainer.mp4 -vf "fps=15,scale=760:-1:flags=lanczos,palettegen=stats_mode=diff" -y palette.png

# 2) render the looping GIF using that palette
ffmpeg -ss 15.3 -to 23.8 -i consent-explainer.mp4 -i palette.png -lavfi "fps=15,scale=760:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3" -loop 0 -y docs/consent-demo.gif
```

Result: ~760px wide, 15fps, ~8s loop, typically 2-5 MB.

Check the size (keep it under ~10 MB so the README loads fast):

```powershell
"{0:N1} MB" -f ((Get-Item docs/consent-demo.gif).Length/1MB)
```

If it is too big, reduce any of: `fps=12`, `scale=640`, or tighten the trim to
`-ss 17 -to 23`.

## Optional — a web-optimized MP4

If you want a smaller MP4 (e.g. for LinkedIn native upload) with fast-start
streaming and muted audio stripped:

```powershell
ffmpeg -i consent-explainer.mp4 -c:v libx264 -crf 22 -preset slow -movflags +faststart -an consent-explainer-web.mp4
```

---

## Timing reference (for trims)

Key beats in the 35s animation, useful for choosing GIF in/out points:

| Time | Beat |
|------|------|
| 0.0-2.3s | Title card: "Consent for AI agents." |
| 2.5-6.5s | Agent fills the Meridian transfer form ($40 to Acme) |
| 6.6-9.5s | Hijack: agent glitches red, reroutes $4,000 to QuickPay Settlements |
| 15.5s | Consent dialog springs up (shows the true $4,000 -> QuickPay) |
| 21.1s | Human clicks **Deny** |
| 21.7s | Red block pulse; transfer stopped |
| 23.2s | Form flips to "Transfer blocked" |
| 26.2s | Signed "Denied - transfer" receipt stamps down |
| 31.0-35s | Outro: "Agents request. Humans consent. Consent binds to the true amount." |

Good GIF loops: `15.3-23.8` (full dialog + deny, the hero) or a tighter
`17-23` if you need the file smaller.

## Existing assets

- `docs/consent-form.png` — static screenshot of the combined approval form
  (the shipped file-upload/questions dialog). Kept in the README as the "what
  the tool actually is today" image, below the explainer.
