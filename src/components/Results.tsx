import { useCompact } from '../hooks/useCompact';
import { useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { LanternLayer } from '../design/layer';
import { css } from '../design/css';
import { Sigil } from '../design/sigils';
import { BARCODE_HTML } from '../design/static';
import { useCountUp } from '../hooks/useCountUp';
import { prefersReducedMotion } from '../hooks/motion';
import { BANDS, BAND_ORDER, findings, kb, noteFor, quiet, verdict, word, type Note, BAND_SCRAWLS } from '../lib/present';
import type { CheckCategory, Finding, ScanResult } from '../lib/types';
import { ThemeIcon } from './Landing';
import { toPng } from 'html-to-image';

interface ResultsProps {
  result: ScanResult;
  onReset: () => void;
  lantern: boolean;
  onToggleLantern: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  soundOn: boolean;
  onToggleSound: () => void;
}

const MAX_ROWS = 3;
const CIRC = 1294.3;

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function tagNumber(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return String(h % 10000).padStart(4, '0');
}

interface OpenNote {
  cat: CheckCategory;
  index: number;
  top: number;
}

export function Results({ result, onReset, lantern, onToggleLantern, theme, onToggleTheme, soundOn, onToggleSound }: ResultsProps) {
  const score = Math.max(0, Math.min(100, Math.round(result.healthScore)));
  const shown = useCountUp(score, 1400, 400);
  const [armed, setArmed] = useState(prefersReducedMotion());
  const [open, setOpen] = useState<OpenNote | null>(null);
  const [expanded, setExpanded] = useState<Set<CheckCategory>>(new Set());
  const [copied, setCopied] = useState<'' | 'one' | 'all'>('');
  const [sharing, setSharing] = useState(false);
  const section = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const bands = useRef<Partial<Record<CheckCategory, HTMLDivElement | null>>>({});
  const layer = useContext(LanternLayer);
  const C = useCompact();
  /** desktop poster style vs phone single-column style */
  const at = (desk: string, phone: string) => css(C ? phone : desk);
  const [geo, setGeo] = useState<Partial<Record<CheckCategory, { left: number; top: number; width: number; height: number }>>>({});

  // Handwritten notes live in the lantern layer (only visible near the light), so they need each band's position there.
  useEffect(() => {
    const sec = section.current;
    if (!layer || !sec) return;
    const measure = () => {
      const lr = layer.getBoundingClientRect();
      const k = lr.width / (layer.offsetWidth || 1) || 1;
      const next: typeof geo = {};
      for (const cat of BAND_ORDER) {
        const el = bands.current[cat];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        next[cat] = { left: (r.left - lr.left) / k, top: (r.top - lr.top) / k, width: r.width / k, height: r.height / k };
      }
      setGeo(next);
    };
    measure();
    const settle = window.setTimeout(measure, 3200); // after the bands finish rising
    const ro = new ResizeObserver(measure);
    ro.observe(sec);
    ro.observe(layer);
    return () => {
      window.clearTimeout(settle);
      ro.disconnect();
    };
  }, [layer]);
  const timer = useRef(0);
  const [last, setLast] = useState<{ note: Note; kind: string; top: number } | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setArmed(true)));
    return () => cancelAnimationFrame(id);
  }, []);
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(timer.current);
    };
  }, []);

  const by = (c: CheckCategory) => findings(result, c);
  const saved = by('resurrection').length;
  const bound = Math.max(0, result.totalFindings - saved);
  const bloat = by('bloated').reduce((s, f) => s + (f.gzipSize ?? 0), 0);
  const maxBloat = Math.max(1, ...by('bloated').map((f) => f.gzipSize ?? 0));
  const allCmds = Array.from(
    new Set(BAND_ORDER.flatMap((c) => by(c).map((f) => noteFor(c, f))).filter((n) => n.fix && n.cmd).map((n) => n.cmd as string)),
  );

  const flash = (k: 'one' | 'all') => {
    setCopied(k);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(''), 1600);
  };

  const shareTag = async () => {
    const el = tagRef.current;
    if (!el || sharing) return;
    setSharing(true);
    try {
      const url = await toPng(el, { pixelRatio: 2 });
      // Try native share first (mobile), fall back to download
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], `${result.projectName || 'exorcist'}-report.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${result.projectName} — ${verdict(score)} ${score}/100` });
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
      }
    } catch { /* user cancelled share or export failed */ }
    setSharing(false);
  };

  const pick = (cat: CheckCategory, index: number) => {
    if (open && open.cat === cat && open.index === index) return setOpen(null);
    const el = bands.current[cat];
    const top = (el?.offsetTop ?? 0) + 6;
    setCopied('');
    setOpen({ cat, index, top });
    setLast({ note: noteFor(cat, by(cat)[index]), kind: BANDS[cat].title, top });
  };

  const rows = (cat: CheckCategory, list: Finding[]): ReactNode => {
    const col = BANDS[cat].color;
    const show = expanded.has(cat) ? list : list.slice(0, MAX_ROWS);
    return (
      <>
        {show.map((f, i) => {
          const sel = open?.cat === cat && open.index === i;
          const label = noteFor(cat, f).title;
          return (
            <button
              key={`${f.package}-${i}`}
              className="line"
              type="button"
              aria-label={`Open case note: ${label}`}
              style={{ boxShadow: sel ? 'inset 3px 0 0 var(--bloodtext), inset 0 0 0 999px rgba(var(--rgb-bloodtext),0.1)' : 'none' }}
              onClick={() => pick(cat, i)}
            >
              {cat === 'dead' && (
                <>
                  <span className="pk">{f.package}</span><span className="sp" /><span className="dt">{f.since ?? 'deprecated'}</span>
                </>
              )}
              {cat === 'cursed' && (
                <>
                  <span className="pk">{f.package}</span><span className="sp" /><span className="pk" style={{ color: col }}>{f.licenseName ?? f.detail}</span>
                </>
              )}
              {cat === 'possession' && (
                <>
                  <span className="pk">{f.package}</span><span className="dt">≈</span><span className="pk">{f.pairedWith}</span><span className="sp" />
                  <span className="pk" style={{ color: col }}>{f.similarity}%</span>
                </>
              )}
              {cat === 'ancient' && (
                <>
                  <span className="pk">{f.package}</span><span className="sp" /><span className="dt">{f.detail}</span>
                </>
              )}
              {cat === 'bloated' && (
                <>
                  <span className="pk">{f.package}</span>
                  <span className="bar"><i style={{ width: `${Math.max(4, Math.round(((f.gzipSize ?? 0) / maxBloat) * 96))}%`, background: col }} /></span>
                  <span className="dt">{kb(f.gzipSize ?? 0)}</span>
                </>
              )}
              {cat === 'dormant' && (
                <>
                  <span className="pk">{f.package}</span><span className="sp" /><span className="dt">{quiet(f.since)}</span>
                </>
              )}
              {cat === 'resurrection' && (
                <>
                  <span className="pk" style={{ textDecoration: 'line-through', color: 'var(--text2)' }}>{f.package}</span>
                  <span className="dt">→</span>
                  <span className="pk" style={{ color: col, fontWeight: 500 }}>{f.alternative}</span><span className="sp" />
                  <span className="dt" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.alternativeReason}</span>
                </>
              )}
              <span className="chev" aria-hidden="true">›</span>
            </button>
          );
        })}
        {list.length > MAX_ROWS && (
          <button
            type="button"
            className="more"
            onClick={() =>
              setExpanded((p) => {
                const n = new Set(p);
                if (n.has(cat)) n.delete(cat);
                else n.add(cat);
                return n;
              })
            }
          >
            {expanded.has(cat) ? 'Show fewer' : `+ ${list.length - MAX_ROWS} more`}
          </button>
        )}
      </>
    );
  };

  const [date] = useState(() => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));
  const heroLine =
    bound === 0 ? (
      <>No souls are bound to this project. <span style={{ color: 'var(--ecto)' }}>The tome is clean.</span></>
    ) : (
      <>
        {word(bound)} {bound === 1 ? 'soul is' : 'souls are'} bound to this project.{' '}
        <span style={{ color: 'var(--ecto)' }}>{saved === 0 ? 'None' : word(saved)} can still be saved.</span>
      </>
    );

  return (
    <div style={{ position: 'relative', width: C ? '100%' : 1200, margin: '0 auto' }}>
      {/* Hero */}
      <div style={C ? { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 28 } : { position: 'relative', height: 690 }}>
        {/* Hanging toe tag with the receipt stapled below */}
        <div className="swing" style={at('position:absolute;left:48px;top:0;width:264px;z-index:4', 'position:relative;order:4;margin:28px auto 0;width:264px;z-index:4')}>
          <div style={css('width:2px;height:72px;margin:0 auto;background:var(--string)')} />
          <div ref={tagRef} style={css('position:relative;box-sizing:border-box;padding:52px 28px 26px;color:#1B1410;clip-path:polygon(0 34px, 58px 0, 206px 0, 264px 34px, 264px 100%, 264px 100%, 253px calc(100% - 8px), 242px 100%, 231px calc(100% - 8px), 220px 100%, 209px calc(100% - 8px), 198px 100%, 187px calc(100% - 8px), 176px 100%, 165px calc(100% - 8px), 154px 100%, 143px calc(100% - 8px), 132px 100%, 121px calc(100% - 8px), 110px 100%, 99px calc(100% - 8px), 88px 100%, 77px calc(100% - 8px), 66px 100%, 55px calc(100% - 8px), 44px 100%, 33px calc(100% - 8px), 22px 100%, 11px calc(100% - 8px), 0 100%);background:radial-gradient(circle at 76% 58%, transparent 26px, rgba(110,70,30,.2) 27px 31px, transparent 33px), linear-gradient(var(--paper-a), var(--paper-b))')}>
            <div style={css('position:absolute;left:50%;top:18px;width:18px;height:18px;margin-left:-9px;border-radius:9999px;background:var(--bg);border:2px solid #A79E86;box-sizing:border-box')} />
            <div style={css('position:absolute;left:50%;top:-2px;width:2px;height:28px;margin-left:-1px;background:var(--string)')} />
            <div className="px" style={css('font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#5B5040')}>Tag No. {tagNumber(result.projectName)}</div>
            <div style={css('height:1px;background:rgba(27,20,16,.35);margin:10px 0 14px')} />
            <div className="px" style={css('font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:#5B5040')}>Name</div>
            <div className="cg" style={css('font-size:34px;line-height:1.05;color:#1B1410;overflow-wrap:anywhere')}>{result.projectName || 'unnamed tome'}</div>
            <div style={{ position: 'relative', height: 74 }}>
              <div style={css("position:absolute;right:-6px;top:22px;transform:rotate(-9deg);border:3px solid #A1121F;color:#A1121F;padding:4px 12px 6px;font-family:'IM Fell English',serif;font-weight:700;font-size:26px;letter-spacing:.12em;text-transform:uppercase;line-height:1")}>{verdict(score)}</div>
            </div>
            <div style={css('height:0;margin:0 -28px 16px;border-top:2px dashed rgba(27,20,16,.4)')} />
            <div className="te">
              <div className="rrow"><span>Dependencies</span><span className="lead" /><span>{result.totalDeps}</span></div>
              <div className="rrow"><span>Hauntings</span><span className="lead" /><span>{bound}</span></div>
              <div className="rrow"><span>Analysis time</span><span className="lead" /><span>{(result.analysisTimeMs / 1000).toFixed(1)}s</span></div>
              <div className="rrow"><span>Model</span><span className="lead" /><span style={{ color: result.modelSkipped ? '#A1121F' : undefined }}>{result.modelSkipped ? 'unavailable' : 'EmbeddingGemma'}</span></div>
              <div className="rrow"><span>Bundle impact</span><span className="lead" /><span style={{ color: bloat > 0 ? '#A1121F' : undefined }}>{bloat > 0 ? `+${Math.round(bloat / 1024)} kB` : '0 kB'}</span></div>
              <div className="rrow"><span>Alternatives</span><span className="lead" /><span style={{ color: saved > 0 ? '#1F6B4A' : undefined }}>{saved} found</span></div>
              <div style={css('height:0;border-top:3px double rgba(27,20,16,.55);margin:8px 0 8px')} />
              <div className="rrow" style={{ fontSize: 15, height: 28 }}><span>SOUL INTEGRITY</span><span className="lead" /><span>{shown}/100</span></div>
            </div>
            <div className="px" style={css('margin-top:12px;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#5B5040')}>Examined {date}</div>
            <div dangerouslySetInnerHTML={{ __html: BARCODE_HTML }} />
          </div>
          <button className="share" type="button" aria-label="Save toe tag as image" onClick={shareTag} disabled={sharing}>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><polyline points="7 11 12 16 17 11"/><line x1="12" y1="4" x2="12" y2="16"/></svg>
            <span>{sharing ? 'Saving…' : 'Save tag'}</span>
          </button>
        </div>
        <span className="fly fly1" aria-hidden="true" style={{ left: 262, top: 210 }} />
        <span className="fly fly2" aria-hidden="true" style={{ left: 96, top: 340 }} />
        <span className="fly fly1" aria-hidden="true" style={{ left: 330, top: 470, animationDelay: '-1.7s' }} />
        <span className="fly fly2" aria-hidden="true" style={{ left: 700, top: 150, animationDelay: '-0.9s' }} />

        {/* Top bar */}
        <header style={at('position:absolute;left:0;right:0;top:0;z-index:6;height:88px;padding:22px 40px 0;box-sizing:border-box;display:flex;align-items:center;justify-content:flex-end;gap:20px', 'position:relative;order:1;z-index:6;padding:6px 16px 0;display:flex;align-items:center;justify-content:center;gap:16px')}>
          <button className="sndtog" type="button" onClick={onToggleSound} aria-label={soundOn ? 'Turn sound off' : 'Turn sound on'}>{soundOn ? 'Sound on' : 'Sound off'}</button>
          <button className="link" type="button" onClick={onToggleLantern}>{lantern ? 'Lantern on' : 'Lantern off'}</button>
          <button className="link" type="button" onClick={onReset}>New scan</button>
          <button className="iconbtn" type="button" onClick={onToggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            <ThemeIcon theme={theme} />
          </button>
        </header>
        <div style={at('position:absolute;left:0;right:0;top:14px;z-index:6;display:flex;flex-direction:column;align-items:center;pointer-events:none', 'position:relative;order:0;margin-top:18px;z-index:6;display:flex;flex-direction:column;align-items:center;pointer-events:none')}>
          <h1 ref={heading} tabIndex={-1} style={css(`margin:0;font-family:'IM Fell English',serif;font-style:normal;font-size:${C ? 44 : 64}px;font-weight:400;line-height:1;display:flex;align-items:center;gap:14px;color:var(--text);letter-spacing:.01em;text-shadow:var(--wm-shadow);outline:none`)}>
            <svg aria-hidden="true" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--blood)" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 4V20" /><path d="M8 15H16" /></svg>
            Exorcist
          </h1>
          <div role="status" aria-live="polite" className="sr-only">{`${result.projectName ?? 'Project'} scored ${score} out of 100: ${verdict(score)}`}</div>
          <div className="px" style={css('margin-top:8px;font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:var(--text2)')}>Exorcism for your package.json</div>
        </div>

        {/* Summoning circle holding the score */}
        <div style={C ? { position: 'relative', order: 2, width: 300, height: 300, margin: '20px auto 0', flex: 'none' } : { display: 'contents' }}>
        <div style={at('position:absolute;left:400px;top:150px;width:440px;height:440px;z-index:2', 'position:absolute;left:0;top:0;width:440px;height:440px;z-index:2;transform:scale(.6818);transform-origin:0 0')}>
          <span className="ripple" aria-hidden="true" />
          <span className="ripple" aria-hidden="true" style={{ animationDelay: '-3.5s' }} />
          <svg className="spin" aria-hidden="true" width="440" height="440" viewBox="0 0 440 440" fill="none" stroke="var(--blood)" style={{ position: 'absolute', inset: 0, opacity: 0.55 }}>
            <circle cx="220" cy="220" r="196" strokeWidth="1" opacity="0.7" />
            <circle cx="220" cy="220" r="188" strokeWidth="3" strokeDasharray="1.5 10.2" opacity="0.8" />
            <path d="M220 406L110.6 69.6L396.9 277.4L43.1 277.4L329.4 69.6Z" strokeWidth="1" strokeLinejoin="round" opacity="0.8" />
          </svg>
          <svg aria-hidden="true" width="440" height="440" viewBox="0 0 440 440" fill="none" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
            <circle cx="220" cy="220" r="218" stroke="rgba(var(--rgb-blood),0.35)" strokeWidth="1" />
            <circle cx="220" cy="220" r="206" stroke="rgba(var(--rgb-text),0.07)" strokeWidth="6" />
            <circle className="arc" cx="220" cy="220" r="206" stroke="var(--blood)" strokeWidth="6" strokeLinecap="round" style={{ strokeDasharray: CIRC, strokeDashoffset: armed ? CIRC * (1 - score / 100) : CIRC }} />
          </svg>
          <div aria-hidden="true" style={css('position:absolute;left:50%;top:50%;width:320px;height:320px;margin:-160px 0 0 -160px;background:radial-gradient(circle, rgba(var(--rgb-bg),0.8) 0%, rgba(var(--rgb-bg),0.55) 45%, transparent 70%)')} />
          <div role="img" aria-label={`Health score ${score} out of 100`} style={css('position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px')}>
            <div className="cg" style={css('font-size:196px;line-height:0.8;font-weight:700;color:var(--text);letter-spacing:-0.02em')}>{shown}</div>
            <div style={css('display:flex;align-items:baseline;gap:12px')}>
              <span className="px" style={css('font-size:14px;color:var(--text2)')}>/100</span>
              <span className="px" style={css('font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:var(--text2)')}>Soul integrity</span>
            </div>
          </div>
        </div>
        </div>

        <p className="cg" style={at('position:absolute;left:880px;top:200px;width:290px;margin:0;z-index:2;font-size:34px;line-height:1.12;font-weight:500;color:var(--text)', 'position:relative;order:3;width:100%;max-width:340px;margin:24px 0 0;padding:0 8px;box-sizing:border-box;text-align:center;z-index:2;font-size:27px;line-height:1.15;font-weight:500;color:var(--text)')}>{heroLine}</p>

        {/* Inverted cross */}
        <div aria-hidden="true" style={at('position:absolute;left:0;right:0;top:638px;display:flex;justify-content:center', 'position:relative;order:5;margin-top:22px;display:flex;justify-content:center')}>
          <svg width="140" height="22" viewBox="0 0 140 22" fill="none" stroke="rgba(var(--rgb-blood),0.55)" strokeWidth="1" strokeLinecap="round"><path d="M0 11H60" /><path d="M70 2V20" /><path d="M64 14H76" /><path d="M80 11H140" /></svg>
        </div>
      </div>

      {/* Ledger of the dead */}
      <section ref={section} aria-label="Findings" style={{ position: 'relative', zIndex: 2 }}>
        {BAND_ORDER.map((cat, i) => {
          const meta = BANDS[cat];
          const list = by(cat);
          return (
            <div
              key={cat}
              ref={(el) => {
                bands.current[cat] = el;
              }}
              className="band rise"
              style={{ animationDelay: `${(0.7 + i * 0.12).toFixed(2)}s` }}
            >
              <div className="id">
                <Sigil kind={cat} index={i} color={meta.color} />
                <div>
                  <h2 className="ttl" style={{ color: meta.titleColor }}>{meta.title}</h2>
                  <div className="sub">{meta.sub}</div>
                </div>
              </div>
              <div className="rows">
                {list.length === 0 ? <div className="dt" style={{ fontStyle: 'italic' }}>The spirits rest easy.</div> : rows(cat, list)}
              </div>
              <div className="num" style={{ color: meta.titleColor, opacity: list.length === 0 ? 0.45 : 1 }}>{list.length}</div>
            </div>
          );
        })}

        {/* Case note: the list never moves, so the note is pinned beside it */}
        <aside
          className="slip"
          role="region"
          aria-label="Case note"
          style={{ top: last?.top ?? 0, opacity: open ? 1 : 0, visibility: open ? 'visible' : 'hidden', transform: `translateX(${open ? 0 : 24}px) rotate(-1deg)` }}
        >
          <div className="px" style={css('font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:#5B5040')}>Case note · {last?.kind}</div>
          <button className="slipx" type="button" aria-label="Close case note" onClick={() => setOpen(null)}>×</button>
          <div className="cg" style={css('margin-top:6px;font-size:26px;line-height:1.05;color:#1B1410;overflow-wrap:anywhere')}>{last?.note.title}</div>
          <p className="px" style={css('margin:8px 0 0;font-size:12px;line-height:1.5;color:#3A2F25')}>{last?.note.body}</p>
          {last?.note.cmd && (
            <div className="cmd">
              <code>{last.note.cmd}</code>
              <button className="cpy" type="button" onClick={async () => { const c = last.note.cmd; if (c && (await copyText(c))) flash('one'); }}>{copied === 'one' ? 'Copied' : 'Copy'}</button>
            </div>
          )}
        </aside>
      </section>
      {layer && !C &&
        createPortal(
          BAND_ORDER.map((cat) => {
            const g = geo[cat];
            if (!g) return null;
            const col = cat === 'resurrection' ? 'var(--ecto)' : 'var(--bloodtext)';
            return (
              <div key={cat} style={{ position: 'absolute', left: g.left, top: g.top, width: g.width, height: g.height }}>
                {BAND_SCRAWLS[cat].small.map((t, k) => (
                  <span key={t} className="scrawl" style={{ left: 448, ...(k === 0 ? { top: 4 } : { bottom: 2 }), fontSize: 13, transform: 'rotate(-1.5deg)', color: col }}>{t}</span>
                ))}
                <span className="scrawl" style={{ left: 40, bottom: 10, fontSize: 17, transform: 'rotate(-2deg)', color: col }}>{BAND_SCRAWLS[cat].big}</span>
              </div>
            );
          }),
          layer,
        )}

      {/* Coda */}
      <footer className="rise" style={css('position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;gap:14px;padding:40px 0 0;animation-delay:1.9s')}>
        {allCmds.length > 0 ? (
          <button className="rite" type="button" onClick={async () => { if (await copyText(allCmds.join('\n'))) flash('all'); }}>
            <span className="riteglow" aria-hidden="true" style={{ opacity: copied === 'all' ? 1 : 0 }} />
            <RiteSigil />
            <span className="ritetxt">
              <span className="cg ritet">{copied === 'all' ? 'It is done.' : 'Perform the rite'}</span>
              <span className="rites">{copied === 'all' ? 'Paste into your terminal' : `Copy all ${allCmds.length} fixes`}</span>
            </span>
            <RiteSigil reverse />
          </button>
        ) : (
          <div className="cg" style={css('font-size:30px;color:var(--ecto)')}>Nothing left to cast out.</div>
        )}
      </footer>
    </div>
  );
}

function RiteSigil({ reverse }: { reverse?: boolean }) {
  return (
    <svg className={`spin2${reverse ? ' rev' : ''}`} aria-hidden="true" width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="var(--bloodtext)" style={{ flex: 'none' }}>
      <circle cx="22" cy="22" r="20" strokeWidth="1" opacity=".8" />
      <circle cx="22" cy="22" r="16.5" strokeWidth="2" strokeDasharray="1 4.4" opacity=".7" />
      <path d="M22 35L14.35 11.5L34.37 26.01L9.63 26.01L29.65 11.5Z" strokeWidth="1" strokeLinejoin="round" opacity=".9" />
    </svg>
  );
}
