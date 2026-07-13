/* consent-video.jsx — "Consent for AI agents." 35s explainer (payments cut).
   Windows 11 Fluent (dark Mica) design language. Composes Sprites from
   animations.jsx (loaded first via x-import). Reads engine globals off window.
   Story: an agent fills a bank transfer ($40 to Acme). Hijacked, its real
   action is $4,000 to an attacker payee. The OS consent dialog shows the TRUE
   amount + payee; the human denies it; the transfer is blocked and recorded. */

const { Sprite, useTime, Easing, interpolate, clamp } = window;

/* ── tokens ──────────────────────────────────────────────────────────── */
const C = {
  layer1: '#2b2b2b', layer2: '#343434',
  chrome: '#2a2a2a', chromeHi: '#333333',
  stroke: 'rgba(255,255,255,0.09)', strokeStrong: 'rgba(255,255,255,0.16)',
  txt: 'rgba(255,255,255,0.92)', txt2: 'rgba(255,255,255,0.58)', txt3: 'rgba(255,255,255,0.36)',
  accent: '#0067C0', accentHi: '#4CC2FF', accentDeep: '#004a8f',
  green: '#6CCB5F', greenDeep: '#3f8f42',
  red: '#E24B5A', redDeep: '#a51f2b',
  webBg: '#FCFCFD', webCard: '#FFFFFF', webStroke: '#E6E6EA',
  webTxt: '#1E2126', webTxt2: '#6A7280', webField: '#F3F3F5',
};
const FONT = '"Segoe UI Variable Display","Segoe UI Variable Text","Segoe UI",Selawik,"Open Sans",system-ui,sans-serif';
const MONO = '"JetBrains Mono",ui-monospace,SFMono-Regular,monospace';
const SHADOW = '0 30px 70px rgba(0,0,0,0.55), 0 4px 14px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)';

/* ── math helpers ────────────────────────────────────────────────────── */
const eIO = Easing.easeInOutCubic, eOut = Easing.easeOutCubic, eIn = Easing.easeInCubic;
const eBack = Easing.easeOutBack, eExpo = Easing.easeOutExpo, eEl = Easing.easeOutElastic;
const ramp = (t, a, b) => (b <= a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a), 0, 1));
const lerp = (a, b, x) => a + (b - a) * x;
const typed = (full, t, a, b) => full.slice(0, Math.round(full.length * ramp(t, a, b)));
const bez = (p, P, Q, R) => [
  (1 - p) * (1 - p) * P[0] + 2 * (1 - p) * p * Q[0] + p * p * R[0],
  (1 - p) * (1 - p) * P[1] + 2 * (1 - p) * p * Q[1] + p * p * R[1],
];

/* ── layout constants (stage 1920x1080) ─────────────────────────────── */
const BR = { x: 566, y: 118, w: 1150, h: 812 };          // browser window
const CHROME = 96;                                        // titlebar+toolbar height
const CT = BR.y + CHROME;                                 // content top (216)
const CX = BR.x + 56;                                     // content left pad (622)
const CW = BR.w - 112;                                    // content width (1038)
const F = {                                               // field rects (global)
  name:   { y: CT + 150, h: 54 },
  email:  { y: CT + 262, h: 54 },
  upload: { y: CT + 386, h: 104 },
};
const UPLOAD_PT = [CX + 150, F.upload.y + F.upload.h / 2];   // agent target (authorize block)
const AG = { x: 118, y: 402, w: 356, h: 236 };            // agent card
const AG_OUT = [AG.x + AG.w - 26, AG.y + 104];            // beam origin
const ATT = { x: 1286, y: 604, w: 388, h: 224 };          // attacker payee card
const DLG = { x: 660, y: 300, w: 600, h: 476 };           // consent dialog
const BTN = { w: 258, h: 42, gap: 20, pad: 30 };
const DENY_C = [DLG.x + BTN.pad + BTN.w / 2, DLG.y + DLG.h - BTN.pad - BTN.h / 2];
const APPROVE_C = [DLG.x + BTN.pad + BTN.w + BTN.gap + BTN.w / 2, DLG.y + DLG.h - BTN.pad - BTN.h / 2];

/* ── icons ───────────────────────────────────────────────────────────── */
const Svg = ({ s = 24, sw = 1.7, children, style }) => (
  <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', ...style }}>
    {children}
  </svg>
);
const IcRobot = ({ s }) => (
  <Svg s={s} sw={1.7}>
    <rect x="4.2" y="8.2" width="15.6" height="11" rx="3.6" />
    <path d="M12 8.2V5.2" /><circle cx="12" cy="4" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="9.2" cy="13.6" r="1.35" fill="currentColor" stroke="none" />
    <circle cx="14.8" cy="13.6" r="1.35" fill="currentColor" stroke="none" />
    <path d="M9.8 16.6h4.4" /><path d="M4.2 12H2.6M19.8 12h1.6" />
  </Svg>
);
const IcLock = ({ s }) => (
  <Svg s={s} sw={1.7}>
    <rect x="4.6" y="10.4" width="14.8" height="9.8" rx="2.6" />
    <path d="M7.6 10.4V7.6a4.4 4.4 0 0 1 8.8 0v2.8" />
    <circle cx="12" cy="14.6" r="1.25" fill="currentColor" stroke="none" /><path d="M12 15.2v2" />
  </Svg>
);
const IcCheck = ({ s, sw = 2.4 }) => <Svg s={s} sw={sw}><path d="M5 12.5l4.2 4.2L19 7" /></Svg>;
const IcCross = ({ s, sw = 2.4 }) => <Svg s={s} sw={sw}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
const IcMoney = ({ s }) => (
  <Svg s={s} sw={1.6}>
    <rect x="2.6" y="6" width="18.8" height="12" rx="2.2" />
    <circle cx="12" cy="12" r="2.7" />
    <path d="M6 9.4v5.2M18 9.4v5.2" />
  </Svg>
);
const IcBank = ({ s }) => (
  <Svg s={s} sw={1.6}>
    <path d="M3.4 9.2 12 4l8.6 5.2" /><path d="M4.6 9.6v9M19.4 9.6v9" />
    <path d="M8 10v7M12 10v7M16 10v7" /><path d="M3.2 20.4h17.6" />
  </Svg>
);
const IcUpload = ({ s }) => <Svg s={s} sw={1.7}><path d="M12 15.5V4.5M12 4.5L7.5 9M12 4.5L16.5 9" /><path d="M4.5 15.5v2.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-2.5" /></Svg>;
const IcReceipt = ({ s }) => (
  <Svg s={s} sw={1.6}>
    <path d="M5.5 3.5h13v17l-2.2-1.4-2.1 1.4-2.2-1.4-2.1 1.4-2.1-1.4V3.5z" />
    <path d="M8.5 8h7M8.5 11.5h7" />
  </Svg>
);

/* small composed skull glyph (circles/rects only) */
function Skull({ s = 40, color = C.red }) {
  const u = s / 40;
  return (
    <div style={{ position: 'relative', width: s, height: s }}>
      <div style={{ position: 'absolute', left: 3 * u, top: 1 * u, width: 34 * u, height: 30 * u, background: color, borderRadius: '50% 50% 42% 42%', boxShadow: `0 0 ${14 * u}px ${color}` }} />
      <div style={{ position: 'absolute', left: 12 * u, top: 27 * u, width: 16 * u, height: 12 * u, background: color, borderRadius: `${5 * u}px ${5 * u}px ${3 * u}px ${3 * u}px` }} />
      <div style={{ position: 'absolute', left: 9 * u, top: 12 * u, width: 8.5 * u, height: 9.5 * u, background: '#1a1013', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', left: 22.5 * u, top: 12 * u, width: 8.5 * u, height: 9.5 * u, background: '#1a1013', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', left: 18 * u, top: 21 * u, width: 4 * u, height: 5 * u, background: '#1a1013', borderRadius: '50% 50% 50% 50%' }} />
      {[0, 1, 2].map(i => <div key={i} style={{ position: 'absolute', left: (15 + i * 4) * u, top: 33 * u, width: 2.4 * u, height: 5 * u, background: '#1a1013', borderRadius: 1 }} />)}
    </div>
  );
}

/* Windows arrow cursor */
function Cursor({ x, y, press = 0, opacity = 1 }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: `scale(${1 - press * 0.12})`, transformOrigin: '3px 3px', opacity, zIndex: 60, filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.55))', pointerEvents: 'none' }}>
      <svg width="30" height="30" viewBox="0 0 24 24" style={{ display: 'block' }}>
        <path d="M4 2.2 L4 19.5 L8.6 15.2 L11.5 21.4 L14.1 20.2 L11.2 14.1 L17.6 14 Z"
          fill="#fff" stroke="#111" strokeWidth="1.1" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/* ── background (Mica) ───────────────────────────────────────────────── */
const NOISE = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";
function MicaBg() {
  return (
    <React.Fragment>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(1300px 900px at 18% -6%, rgba(92,112,152,0.16), transparent 58%), radial-gradient(1100px 820px at 104% 108%, rgba(120,92,146,0.10), transparent 55%)' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: NOISE, backgroundSize: '160px 160px', opacity: 0.05 }} />
    </React.Fragment>
  );
}

/* ── beam (agent → field) ────────────────────────────────────────────── */
function Beam({ to, color, dot, opacity }) {
  const dx = to[0] - AG_OUT[0], dy = to[1] - AG_OUT[1];
  const len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx) * 180 / Math.PI;
  return (
    <div style={{ position: 'absolute', left: AG_OUT[0], top: AG_OUT[1], width: len, height: 2, transformOrigin: '0 50%', transform: `rotate(${ang}deg)`, opacity }}>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, transparent, ${color} 30%, ${color})`, borderRadius: 2 }} />
      {dot != null && <div style={{ position: 'absolute', left: `${dot * 100}%`, top: '50%', width: 9, height: 9, marginLeft: -4.5, marginTop: -4.5, borderRadius: 9, background: '#fff', boxShadow: `0 0 12px ${color}` }} />}
    </div>
  );
}

/* ── agent card ──────────────────────────────────────────────────────── */
function AgentInner({ t, hijacked, status, statusColor }) {
  return (
    <div style={{ position: 'absolute', inset: 0, borderRadius: 16, background: C.layer1, border: `1px solid ${hijacked ? 'rgba(226,75,90,0.5)' : C.stroke}`, boxShadow: SHADOW, padding: 24, boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative', width: 60, height: 60, borderRadius: 14, background: hijacked ? 'rgba(226,75,90,0.18)' : 'rgba(0,103,192,0.18)', color: hijacked ? C.red : C.accentHi, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IcRobot s={34} />
        </div>
        <div>
          <div style={{ fontSize: 21, fontWeight: 600, color: C.txt, letterSpacing: '-0.01em' }}>AI Agent</div>
          <div style={{ fontSize: 13, color: C.txt3, marginTop: 2 }}>autonomous</div>
        </div>
      </div>
      <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {[0, 1, 2].map(i => {
            const a = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(t * 5 - i * 0.9));
            return <div key={i} style={{ width: 7, height: 7, borderRadius: 7, background: statusColor, opacity: a }} />;
          })}
        </div>
        <div style={{ fontSize: 14.5, color: statusColor, fontWeight: 500 }}>{status}</div>
      </div>
    </div>
  );
}
function AgentCard({ t }) {
  const hijacked = t >= 6.65;
  const glitch = Math.max(ramp(t, 6.35, 6.55) - ramp(t, 6.95, 7.25), ramp(t, 7.55, 7.62) - ramp(t, 7.72, 7.85));
  const jx = glitch * 7 * Math.sin(t * 90), jy = glitch * 3 * Math.sin(t * 70 + 1);
  let status = 'Preparing transfer…', sc = C.accentHi;
  if (t >= 4.7) status = 'Reaching Authorize…';
  if (hijacked) { status = 'Sending $4,000.00…'; sc = C.red; }
  const inner = (extra) => <AgentInner t={t} hijacked={hijacked} status={status} statusColor={sc} />;
  return (
    <div style={{ position: 'absolute', left: AG.x, top: AG.y, width: AG.w, height: AG.h, transform: `translate(${jx}px,${jy}px)` }}>
      {glitch > 0.02 && <div style={{ position: 'absolute', inset: 0, transform: 'translate(-5px,0)', opacity: 0.55, filter: 'brightness(1.4)', mixBlendMode: 'screen' }}><div style={{ position: 'absolute', inset: 0, borderRadius: 16, boxShadow: 'inset 0 0 0 2px rgba(226,75,90,0.9)' }} /></div>}
      {glitch > 0.02 && <div style={{ position: 'absolute', inset: 0, transform: 'translate(5px,0)', opacity: 0.5, mixBlendMode: 'screen' }}><div style={{ position: 'absolute', inset: 0, borderRadius: 16, boxShadow: 'inset 0 0 0 2px rgba(76,194,255,0.9)' }} /></div>}
      {inner()}
      {glitch > 0.02 && <div style={{ position: 'absolute', inset: 0, borderRadius: 16, background: 'repeating-linear-gradient(0deg, transparent 0 2px, rgba(0,0,0,0.28) 3px, transparent 4px)', opacity: 0.6 * glitch }} />}
      {hijacked && (
        <div style={{ position: 'absolute', left: 44, top: -14, opacity: eBack(ramp(t, 6.6, 6.95)), transform: `scale(${lerp(0.4, 1, eBack(ramp(t, 6.6, 6.95)))})` }}>
          <Skull s={40} />
        </div>
      )}
    </div>
  );
}

/* ── browser window + bank transfer form ─────────────────────────────── */
function Field({ label, y, h, children, focused, done }) {
  return (
    <div style={{ position: 'absolute', left: CX, top: y, width: CW }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.webTxt2, marginBottom: 9 }}>{label}</div>
      <div style={{ height: h, borderRadius: 8, background: C.webField, border: `1.5px solid ${focused ? C.accent : done ? 'rgba(108,203,95,0.6)' : C.webStroke}`, boxShadow: focused ? '0 0 0 3px rgba(0,103,192,0.16)' : 'none', display: 'flex', alignItems: 'center', padding: '0 16px', boxSizing: 'border-box', transition: 'none' }}>
        {children}
      </div>
    </div>
  );
}
function BrowserWindow({ t }) {
  const payeeV = typed('Acme Contracting', t, 2.5, 3.4);
  const amtV = typed('$40.00', t, 3.7, 4.4);
  const caret = (on) => on && (Math.floor(t * 1.6) % 2 === 0);
  const nameFoc = t >= 2.3 && t < 3.6, emailFoc = t >= 3.6 && t < 4.8, upFoc = t >= 4.8 && t < 15;
  const blocked = t >= 23.2;
  return (
    <div style={{ position: 'absolute', left: BR.x, top: BR.y, width: BR.w, height: BR.h, borderRadius: 13, overflow: 'hidden', background: C.chrome, border: `1px solid ${C.strokeStrong}`, boxShadow: SHADOW }}>
      {/* titlebar */}
      <div style={{ height: 44, background: C.chrome, display: 'flex', alignItems: 'flex-end', paddingLeft: 12, gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, height: 36, padding: '0 16px', background: C.webBg, borderRadius: '9px 9px 0 0', maxWidth: 300 }}>
          <div style={{ width: 15, height: 15, borderRadius: 4, background: C.accent }} />
          <span style={{ fontSize: 13, color: C.webTxt, fontWeight: 500, whiteSpace: 'nowrap' }}>Meridian — Send money</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', height: 44 }}>
          {['min', 'max', 'close'].map(k => (
            <div key={k} style={{ width: 46, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.txt2 }}>
              {k === 'min' && <div style={{ width: 11, height: 1.4, background: 'currentColor' }} />}
              {k === 'max' && <div style={{ width: 10, height: 10, border: '1.4px solid currentColor', borderRadius: 2 }} />}
              {k === 'close' && <Svg s={12} sw={1.5}><path d="M4 4l16 16M20 4L4 20" /></Svg>}
            </div>
          ))}
        </div>
      </div>
      {/* toolbar */}
      <div style={{ height: 52, background: C.webBg, borderBottom: `1px solid ${C.webStroke}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12 }}>
        <div style={{ display: 'flex', gap: 4, color: C.webTxt2 }}>
          <Svg s={19} sw={2}><path d="M15 5l-7 7 7 7" /></Svg>
          <Svg s={19} sw={2} style={{ opacity: 0.4 }}><path d="M9 5l7 7-7 7" /></Svg>
        </div>
        <div style={{ flex: 1, height: 34, borderRadius: 17, background: C.webField, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 9 }}>
          <span style={{ color: C.webTxt2, display: 'flex' }}><IcLock s={14} /></span>
          <span style={{ fontSize: 13.5, color: C.webTxt, fontFamily: MONO }}>meridian.app/pay/transfer</span>
        </div>
      </div>
      {/* page content */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: CHROME, bottom: 0, background: C.webBg }}>
        <div style={{ position: 'absolute', left: 56, top: 34, display: 'flex', alignItems: 'center', gap: 13 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#0067C0,#0a86e6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 20 }}>M</div>
          <div>
            <div style={{ fontSize: 23, fontWeight: 700, color: C.webTxt, letterSpacing: '-0.02em' }}>Send money</div>
            <div style={{ fontSize: 14, color: C.webTxt2, marginTop: 1 }}>Meridian · Everyday Chequing ****3310</div>
          </div>
        </div>
        <Field label="Pay to" y={F.name.y} h={F.name.h} focused={nameFoc} done={t >= 3.4}>
          <span style={{ fontSize: 16, color: C.webTxt }}>{payeeV}</span>
          {caret(nameFoc && payeeV.length < 16) && <span style={{ width: 1.5, height: 20, background: C.accent, marginLeft: 1 }} />}
        </Field>
        <Field label="Amount" y={F.email.y} h={F.email.h} focused={emailFoc} done={t >= 4.4}>
          <span style={{ fontSize: 16, color: C.webTxt, fontWeight: 500 }}>{amtV}</span>
          {caret(emailFoc && amtV.length < 6) && <span style={{ width: 1.5, height: 20, background: C.accent, marginLeft: 1 }} />}
        </Field>
        {/* authorize block */}
        <div style={{ position: 'absolute', left: CX, top: F.upload.y, width: CW }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.webTxt2, marginBottom: 9 }}>Review &amp; authorize</div>
          <div style={{ height: F.upload.h, borderRadius: 10, border: blocked ? `1.5px solid ${C.redDeep}` : `1.5px solid ${upFoc ? C.accent : C.webStroke}`, background: blocked ? 'rgba(226,75,90,0.09)' : (upFoc ? 'rgba(0,103,192,0.05)' : C.webField), boxShadow: upFoc && !blocked ? '0 0 0 3px rgba(0,103,192,0.14)' : 'none', display: 'flex', alignItems: 'center', gap: 14, padding: '0 20px', boxSizing: 'border-box' }}>
            <div style={{ width: 46, height: 46, borderRadius: 10, background: blocked ? 'rgba(226,75,90,0.14)' : 'rgba(0,103,192,0.12)', color: blocked ? C.redDeep : C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>{blocked ? <IcCross s={24} /> : <IcMoney s={24} />}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15.5, fontWeight: 600, color: blocked ? C.redDeep : C.webTxt }}>{blocked ? 'Transfer blocked' : 'Authorize transfer'}</div>
              <div style={{ fontSize: 12.5, color: C.webTxt2, marginTop: 2 }}>{blocked ? 'You denied $4,000.00 to QuickPay Settlements' : '$40.00 to Acme Contracting'}</div>
            </div>
            {!blocked && <div style={{ height: 44, padding: '0 22px', borderRadius: 8, background: upFoc ? C.accent : '#C9CBD1', color: '#fff', display: 'flex', alignItems: 'center', fontSize: 15, fontWeight: 600 }}>Authorize</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── browser world (scenes 1–3 base): agent + browser + beam + camera ─── */
function BrowserWorld() {
  const t = useTime();
  const intro = eOut(ramp(t, 1.7, 2.5));
  const outro = 1 - eIO(ramp(t, 25.5, 26.2));
  // camera push-in
  let cam = 1 + 0.05 * eOut(ramp(t, 2.2, 7.5)) - 0.05 * eIO(ramp(t, 15.0, 16.0));
  const scale = cam * lerp(0.985, 1, intro);
  // mood desaturation (browser + agent only)
  let sat = 1, bri = 1;
  if (t >= 6.6) { sat = lerp(1, 0.48, eIO(ramp(t, 6.6, 8.2))); bri = lerp(1, 0.9, eIO(ramp(t, 6.6, 8.2))); }
  if (t >= 15.0) { sat = lerp(0.48, 1, eIO(ramp(t, 15.0, 16.0))); bri = lerp(0.9, 1, eIO(ramp(t, 15.0, 16.0))); }
  // beam target + colour
  let target = UPLOAD_PT;
  if (t < 3.6) target = [CX + 90, F.name.y + F.name.h / 2];
  else if (t < 4.8) target = [CX + 90, F.email.y + F.email.h / 2];
  const beamColor = t >= 6.65 ? C.red : C.accentHi;
  const beamOp = (t >= 2.3 && t < 9.6) ? lerp(0, 0.85, eOut(ramp(t, 2.3, 2.7))) * (1 - eIn(ramp(t, 9.0, 9.6))) : 0;
  const dot = (t * 1.1) % 1;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: intro * outro, transform: `scale(${scale})`, transformOrigin: '1141px 470px', filter: `saturate(${sat}) brightness(${bri})` }}>
      <BrowserWindow t={t} />
      <AgentCard t={t} />
      {beamOp > 0.01 && <Beam to={target} color={beamColor} dot={dot} opacity={beamOp} />}
    </div>
  );
}

/* ── scene 2 danger layer: red mood, chat bubble lie, reroute to attacker ─ */
function DangerLayer() {
  const t = useTime();
  const mood = lerp(0, 1, eIO(ramp(t, 6.6, 9.0))) * (1 - eIO(ramp(t, 14.8, 15.6)));
  if (mood < 0.001 && t > 15.6) return null;
  const bubbleIn = eBack(ramp(t, 7.0, 7.4)) * (1 - eIn(ramp(t, 13.8, 14.4)));
  const attIn = eBack(ramp(t, 7.3, 7.9)) * (1 - eIn(ramp(t, 14.6, 15.3)));
  const draw = eOut(ramp(t, 7.7, 8.7));
  const moveP = ramp(t, 8.2, 9.5);
  const showChip = t >= 8.2 && t <= 9.9;
  const cp = bez(moveP, [UPLOAD_PT[0] + 40, UPLOAD_PT[1]], [1030, 780], [ATT.x + 34, ATT.y + 96]);
  const headAng = Math.atan2((ATT.y + 96) - 780, (ATT.x + 34) - 1030) * 180 / Math.PI;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* red mood wash + vignette */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(1500px 1000px at 78% 62%, rgba(226,75,90,0.20), transparent 60%)', opacity: mood }} />
      <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 260px rgba(120,10,20,0.55)', opacity: mood }} />
      {/* reroute arrow */}
      <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0, opacity: attIn }}>
        <path d={`M${UPLOAD_PT[0] + 40} ${UPLOAD_PT[1]} Q 1030 780 ${ATT.x + 34} ${ATT.y + 96}`} pathLength="1"
          fill="none" stroke={C.red} strokeWidth="3.5" strokeLinecap="round" strokeDasharray="1" strokeDashoffset={1 - draw} style={{ filter: 'drop-shadow(0 0 6px rgba(226,75,90,0.8))' }} />
        {draw > 0.98 && <g transform={`translate(${ATT.x + 34} ${ATT.y + 96}) rotate(${headAng})`}>
          <path d="M0 0 L-17 -8 L-12 0 L-17 8 Z" fill={C.red} />
        </g>}
      </svg>
      {/* traveling money (the real, hidden action) */}
      {showChip && (
        <div style={{ position: 'absolute', left: cp[0] - 74, top: cp[1] - 20, display: 'flex', alignItems: 'center', gap: 8, padding: '7px 13px', borderRadius: 9, background: 'rgba(43,43,43,0.96)', border: `1px solid ${C.red}`, boxShadow: `0 0 18px rgba(226,75,90,0.6)`, color: C.red }}>
          <IcMoney s={17} /><span style={{ fontSize: 14, color: C.txt, fontWeight: 600 }}>$4,000.00</span>
        </div>
      )}
      {/* attacker payee card */}
      <div style={{ position: 'absolute', left: ATT.x, top: ATT.y, width: ATT.w, height: ATT.h, opacity: attIn, transform: `scale(${lerp(0.9, 1, attIn)})`, transformOrigin: 'left center', borderRadius: 14, background: C.layer1, border: `1px solid rgba(226,75,90,0.55)`, boxShadow: '0 24px 60px rgba(0,0,0,0.55), 0 0 40px rgba(226,75,90,0.28)', padding: 22, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: 'rgba(226,75,90,0.16)', color: C.red, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IcBank s={27} /></div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.red, letterSpacing: '-0.01em' }}>QuickPay Settlements</div>
            <div style={{ fontSize: 13, color: C.txt3, fontFamily: MONO, marginTop: 2 }}>acct ****0071 · unknown payee</div>
          </div>
        </div>
        <div style={{ marginTop: 16, height: 1, background: C.stroke }} />
        <div style={{ marginTop: 14, fontSize: 13.5, color: C.txt2 }}>Incoming <span style={{ color: C.red, fontWeight: 600 }}>$4,000.00</span> · rerouted</div>
      </div>
      {/* the agent's stated intent (the lie) */}
      {bubbleIn > 0.01 && (
        <div style={{ position: 'absolute', left: UPLOAD_PT[0] - 30, top: F.upload.y - 92, opacity: bubbleIn, transform: `translateY(${lerp(10, 0, bubbleIn)}px)` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderRadius: 12, background: C.layer1, border: `1px solid ${C.stroke}`, boxShadow: '0 14px 34px rgba(0,0,0,0.5)' }}>
            <span style={{ color: C.accentHi, display: 'flex' }}><IcRobot s={20} /></span>
            <span style={{ fontSize: 15.5, color: C.txt, fontWeight: 500 }}>“Pay $40 to Acme?”</span>
          </div>
          <div style={{ width: 14, height: 14, background: C.layer1, borderRight: `1px solid ${C.stroke}`, borderBottom: `1px solid ${C.stroke}`, transform: 'rotate(45deg)', marginLeft: 40, marginTop: -7 }} />
        </div>
      )}
    </div>
  );
}

/* ── scene 3 consent gate (deny path) ────────────────────────────────── */
function ConsentScene() {
  const t = useTime();
  const scrim = lerp(0, 0.5, eIO(ramp(t, 15.2, 16.0))) * (1 - eIO(ramp(t, 25.3, 26.1)));
  const rise = eBack(ramp(t, 15.5, 16.4));                 // spring up
  const dlgY = lerp(150, 0, rise), dlgS = lerp(0.95, 1, rise), dlgO = eOut(ramp(t, 15.5, 16.0));
  const dlgExit = eIn(ramp(t, 23.0, 23.7));                 // slide away after deny
  const denied = t >= 21.15;
  const hover = t >= 20.3 && t < 21.15;
  const press = ramp(t, 20.95, 21.12) * (1 - ramp(t, 21.12, 21.25));
  // cursor path -> Deny button
  const cx = interpolate([17.8, 19.6, 20.35, 20.95, 21.2, 22.4], [1210, 1150, DENY_C[0] + 6, DENY_C[0] + 6, DENY_C[0] + 6, 1320], eIO)(t);
  const cy = interpolate([17.8, 19.6, 20.35, 20.95, 21.2, 22.4], [1010, 828, DENY_C[1] + 4, DENY_C[1] + 4, DENY_C[1] + 4, 1010], eIO)(t);
  const curOp = eOut(ramp(t, 17.6, 18.0)) * (1 - eIn(ramp(t, 22.2, 22.7)));
  // mild push-in on dialog group toward deny, reset before block
  const gz = 1 + 0.06 * eOut(ramp(t, 18.8, 20.4)) - 0.06 * eIO(ramp(t, 21.9, 22.6));
  // red block pulse
  const blk = eBack(ramp(t, 21.2, 21.7));
  const blkRing = ramp(t, 21.15, 22.0);
  const showBlk = t >= 21.2 && t < 24.2;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: scrim }} />
      {/* dialog group (push-in) */}
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${gz})`, transformOrigin: `${DENY_C[0]}px ${DENY_C[1]}px` }}>
        {dlgO > 0.01 && dlgExit < 1 && (
          <div style={{ position: 'absolute', left: DLG.x, top: DLG.y, width: DLG.w, minHeight: DLG.h, opacity: dlgO * (1 - dlgExit), transform: `translateY(${dlgY + dlgExit * 120}px) scale(${dlgS})`, transformOrigin: 'center bottom', borderRadius: 14, background: C.layer1, border: `1px solid ${C.strokeStrong}`, boxShadow: SHADOW, padding: 30, boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: 13, background: 'rgba(0,103,192,0.20)', color: C.accentHi, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IcLock s={28} /></div>
              <div>
                <div style={{ fontSize: 23, fontWeight: 600, color: C.txt, letterSpacing: '-0.01em' }}>Authorize a payment</div>
                <div style={{ fontSize: 14.5, color: C.txt2, marginTop: 2 }}>An agent is requesting a money transfer.</div>
              </div>
            </div>
            {/* real action panel */}
            <div style={{ marginTop: 22, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.stroke}`, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                <div style={{ width: 42, height: 42, borderRadius: 9, background: 'rgba(226,75,90,0.14)', color: '#ff8a8a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IcMoney s={22} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 21, fontWeight: 700, color: C.txt }}>$4,000.00 <span style={{ color: C.txt3, fontWeight: 400, fontSize: 15 }}>· USD</span></div>
                  <div style={{ fontSize: 13.5, color: C.txt2, marginTop: 2 }}>to <span style={{ color: C.txt }}>QuickPay Settlements LLC</span></div>
                </div>
              </div>
              <div style={{ marginTop: 15, paddingTop: 15, borderTop: `1px solid ${C.stroke}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: C.txt3, display: 'flex' }}><IcBank s={16} /></span>
                <span style={{ fontSize: 14, color: C.txt2 }}>To account</span>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 14.5, color: C.txt, fontFamily: MONO, fontWeight: 500 }}>****0071</span>
              </div>
            </div>
            {/* buttons */}
            <div style={{ position: 'absolute', left: BTN.pad, bottom: BTN.pad, display: 'flex', gap: BTN.gap }}>
              <div style={{ width: BTN.w, height: BTN.h, borderRadius: 7, background: hover || denied ? 'rgba(226,75,90,0.16)' : 'rgba(255,255,255,0.06)', border: `1px solid ${denied ? C.red : C.strokeStrong}`, transform: `scale(${1 - press * 0.04})`, boxShadow: '0 0 0 2px rgba(76,194,255,0.55), 0 0 0 4px rgba(76,194,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, color: denied ? '#ff9aa2' : C.txt }}>{denied ? 'Denied' : 'Deny'}</div>
              <div style={{ width: BTN.w, height: BTN.h, borderRadius: 7, background: C.accent, boxShadow: '0 2px 8px rgba(0,103,192,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, color: '#fff' }}>Approve</div>
            </div>
          </div>
        )}
        {/* red block pulse */}
        {showBlk && (
          <div style={{ position: 'absolute', left: DENY_C[0], top: DENY_C[1], transform: 'translate(-50%,-50%)' }}>
            <div style={{ position: 'absolute', left: '50%', top: '50%', width: 90, height: 90, marginLeft: -45, marginTop: -45, borderRadius: 90, border: `2px solid ${C.red}`, opacity: 0.7 * (1 - blkRing), transform: `scale(${lerp(0.5, 2.2, blkRing)})` }} />
            <div style={{ width: 62, height: 62, borderRadius: 62, background: C.red, color: '#2a0d10', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${blk})`, boxShadow: '0 6px 22px rgba(226,75,90,0.6)' }}><IcCross s={32} sw={3} /></div>
          </div>
        )}
        {curOp > 0.01 && <Cursor x={cx} y={cy} press={press} opacity={curOp} />}
      </div>
    </div>
  );
}

/* ── scene 4 receipts ────────────────────────────────────────────────── */
function ReceiptCard({ w = 560, faded = 0 }) {
  return (
    <div style={{ width: w, borderRadius: 14, background: C.layer1, border: `1px solid ${C.stroke}`, boxShadow: SHADOW, padding: 22, boxSizing: 'border-box', opacity: 1 - faded }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 22, background: 'rgba(226,75,90,0.16)', color: C.red, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IcCross s={22} sw={2.6} /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: C.txt }}>Denied · transfer</div>
          <div style={{ fontSize: 13.5, color: C.txt2, marginTop: 2, fontFamily: MONO }}>$4,000.00 → QuickPay Settlements</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13.5, color: C.txt, fontFamily: MONO }}>10:24:07</div>
          <div style={{ fontSize: 12, color: C.txt3, marginTop: 2 }}>Jul 13, 2026</div>
        </div>
      </div>
      <div style={{ marginTop: 15, paddingTop: 14, borderTop: `1px dashed ${C.strokeStrong}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: C.txt3, display: 'flex' }}><IcReceipt s={15} /></span>
        <span style={{ fontSize: 12.5, color: C.txt3, fontFamily: MONO, letterSpacing: '0.02em' }}>record #UB-7F3A-2C9E · signed</span>
      </div>
    </div>
  );
}
function ReceiptScene() {
  const t = useTime();
  const stamp = eBack(ramp(t, 26.2, 26.85));
  const rot = lerp(-4, 0, eOut(ramp(t, 26.2, 26.95)));
  const drop = lerp(-34, 0, eOut(ramp(t, 26.5, 27.1)));
  const impact = ramp(t, 26.55, 27.3);
  const groupO = eOut(ramp(t, 26.0, 26.4)) * (1 - eIO(ramp(t, 30.7, 31.2)));
  const push = 1 + 0.04 * eOut(ramp(t, 26.6, 31));
  const past = [{ dy: 96, s: 0.9, o: 0.5 }, { dy: 74, s: 0.94, o: 0.7 }, { dy: 52, s: 0.97, o: 0.85 }];
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: groupO, transform: `scale(${push})`, transformOrigin: '960px 540px' }}>
      <div style={{ position: 'absolute', left: '50%', top: 470, transform: 'translateX(-50%)', width: 560 }}>
        {past.map((p, i) => (
          <div key={i} style={{ position: 'absolute', left: '50%', top: p.dy, transform: `translateX(-50%) scale(${p.s})`, opacity: p.o * eOut(ramp(t, 26.0 + i * 0.12, 26.5 + i * 0.12)) }}>
            <ReceiptCard w={560} faded={0} />
          </div>
        ))}
        <div style={{ position: 'relative', transform: `translateY(${drop}px) scale(${lerp(1.22, 1, stamp)}) rotate(${rot}deg)`, transformOrigin: 'center' }}>
          {impact > 0 && impact < 1 && <div style={{ position: 'absolute', inset: -6, borderRadius: 18, boxShadow: `0 0 0 ${lerp(0, 22, impact)}px rgba(226,75,90,${0.35 * (1 - impact)})` }} />}
          <ReceiptCard w={560} />
        </div>
      </div>
    </div>
  );
}

/* ── scene 5 outro ───────────────────────────────────────────────────── */
function OutroLine({ children, y, size, start, t, color = C.txt, weight = 600 }) {
  const a = eOut(ramp(t, start, start + 0.55));
  const ty = lerp(20, 0, a);
  return <div style={{ position: 'absolute', left: 0, right: 0, top: y, textAlign: 'center', opacity: a, transform: `translateY(${ty}px)`, fontSize: size, fontWeight: weight, color, letterSpacing: '-0.02em' }}>{children}</div>;
}
function OutroScene() {
  const t = useTime();
  const out = 1 - eIO(ramp(t, 34.55, 35.0));
  const push = 1 + 0.03 * eOut(ramp(t, 31.2, 35));
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: out, transform: `scale(${push})`, transformOrigin: '960px 470px' }}>
      <OutroLine y={330} size={60} start={31.15} t={t}>Agents request.</OutroLine>
      <OutroLine y={412} size={60} start={31.6} t={t}>Humans consent.</OutroLine>
      <OutroLine y={494} size={60} start={32.05} t={t}>
        Consent binds to the <span style={{ color: C.accentHi }}>true amount</span>.
      </OutroLine>
      {/* product / url */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 648, textAlign: 'center', opacity: eOut(ramp(t, 32.75, 33.3)), transform: `translateY(${lerp(16, 0, eOut(ramp(t, 32.75, 33.3)))}px)` }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, color: C.txt }}>
          <span style={{ width: 42, height: 42, borderRadius: 11, background: 'rgba(0,103,192,0.18)', color: C.accentHi, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><IcLock s={22} /></span>
          <span style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.01em' }}>Upload Bridge</span>
          <span style={{ fontSize: 17, color: C.txt3, fontWeight: 500 }}>· open source</span>
        </div>
        <div style={{ marginTop: 16, fontSize: 19, color: C.txt2, fontFamily: MONO, opacity: eOut(ramp(t, 33.15, 33.7)) }}>github.com/realitymatrix/upload-bridge</div>
      </div>
    </div>
  );
}

/* ── captions + scrim ────────────────────────────────────────────────── */
function Caption({ lines, start, end }) {
  const t = useTime();
  const op = Math.min(eOut(ramp(t, start, start + 0.5)), 1 - eIn(ramp(t, end - 0.45, end)));
  if (op <= 0.001) return null;
  const ty = lerp(14, 0, eOut(ramp(t, start, start + 0.5)));
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: lines.length > 1 ? 938 : 978, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, opacity: op, transform: `translateY(${ty}px)`, padding: '0 80px' }}>
      {lines.map((ln, i) => (
        <div key={i} style={{ fontSize: 33, fontWeight: 500, color: 'rgba(255,255,255,0.94)', textShadow: '0 2px 16px rgba(0,0,0,0.7)', letterSpacing: '-0.01em', textAlign: 'center', lineHeight: 1.28 }}>{ln}</div>
      ))}
    </div>
  );
}

/* ── world root ──────────────────────────────────────────────────────── */
function World() {
  const t = useTime();
  const label = `0:${String(Math.min(35, Math.floor(t))).padStart(2, '0')}`;
  const titleO = eOut(ramp(t, 0.3, 1.0)) * (1 - eIO(ramp(t, 1.7, 2.3)));
  const titleY = lerp(18, 0, eOut(ramp(t, 0.3, 1.0))) - 22 * eIO(ramp(t, 1.7, 2.3));
  const scrim = eOut(ramp(t, 1.5, 2.3)) * (1 - eIO(ramp(t, 30.8, 31.4)));
  return (
    <div data-screen-label={label} style={{ position: 'absolute', inset: 0, fontFamily: FONT, background: '#202020' }}>
      <MicaBg />

      {/* title card */}
      {titleO > 0.01 && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 452, textAlign: 'center', opacity: titleO, transform: `translateY(${titleY}px)` }}>
          <div style={{ fontSize: 76, fontWeight: 600, color: C.txt, letterSpacing: '-0.025em' }}>Consent for AI agents.</div>
          <div style={{ margin: '22px auto 0', width: lerp(0, 90, eOut(ramp(t, 0.7, 1.4))), height: 4, borderRadius: 4, background: C.accent }} />
        </div>
      )}

      <Sprite start={1.6} end={26.3}><BrowserWorld /></Sprite>
      <Sprite start={6.3} end={15.7}><DangerLayer /></Sprite>
      <Sprite start={14.9} end={26.4}><ConsentScene /></Sprite>
      <Sprite start={25.7} end={31.3}><ReceiptScene /></Sprite>
      <Sprite start={31.0} end={35.05}><OutroScene /></Sprite>

      {/* bottom scrim for captions */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 320, background: 'linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0) 100%)', opacity: scrim, pointerEvents: 'none' }} />

      <Caption lines={['AI agents now act for us.', 'They move money, pay invoices, send funds.']} start={2.6} end={5.9} />
      <Caption lines={['But “the agent asked and I said yes” is broken.', 'A hijacked agent can send $4,000 while showing you $40.']} start={9.2} end={14.7} />
      <Caption lines={['So the OS shows you the real amount and payee.', 'You see the truth, and you can still say no.']} start={18.6} end={25.2} />
      <Caption lines={['Every decision leaves a record.']} start={27.6} end={30.7} />
    </div>
  );
}

function ConsentVideo() {
  return (
    <window.Stage width={1920} height={1080} duration={35} background="#202020" persistKey="consent35">
      <World />
    </window.Stage>
  );
}
window.ConsentVideo = ConsentVideo;
