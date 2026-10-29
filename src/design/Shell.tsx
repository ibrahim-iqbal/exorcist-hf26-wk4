import { useEffect, useRef, useState, type ReactNode } from 'react';
import { css } from './css';
import { DECOR_HTML, POOL_HTML } from './static';
import { prefersReducedMotion } from '../hooks/motion';
import { LanternLayer } from './layer';
import { useCompact } from '../hooks/useCompact';

const FLAME = 'M14 2c1.6 6.5 7 8.5 7 15.5a7 7 0 0 1 -14 0c0 -3 1.5 -4.6 3 -6.2c0 3 1.5 4.6 3 4.6c0 -6.5 -1.6 -9.3 1 -13.9z';
const CORE = 'M14 12c1.6 2.4 3 4 3 6.2a3 3 0 0 1 -6 0c0 -2.2 1.4 -3.8 3 -6.2z';

/** Extra candles down the sides, so the room still feels lit as you scroll. */
function Candle({ side, top, delay }: { side: 'l' | 'r'; top: number; delay: number }) {
  const pos = side === 'l' ? { left: 76 } : { right: 76 };
  return (
    <>
      <div className="sidec" style={{ position: 'absolute', ...pos, top, width: 28, height: 64, zIndex: 2 }}>
        <div className="halo" aria-hidden="true" style={{ position: 'absolute', left: -56, top: -52, width: 140, height: 140, borderRadius: 9999, background: 'radial-gradient(circle, rgba(232,168,56,0.3), transparent 65%)', pointerEvents: 'none', animationDelay: `${delay}s` }} />
        <svg aria-hidden="true" width="28" height="64" viewBox="0 0 28 64" style={{ position: 'relative' }}>
          <path className="flame" style={{ animationDelay: `${delay}s` }} d={FLAME} fill="#E8A838" />
          <path className="flame" style={{ animationDelay: `${delay}s` }} d={CORE} fill="var(--blood)" />
          <rect x="13.4" y="25" width="1.2" height="6" fill="#2A2420" />
          <rect x="6" y="30" width="16" height="34" rx="2" fill="var(--candle)" opacity="0.8" />
          <path d="M6 32h16v3c-2 0 -2 5 -4 5s-2 -5 -4 -5s-2 7 -4 7s-2 -7 -4 -7z" fill="var(--candle-drip)" opacity="0.9" />
        </svg>
      </div>
      {[0, 1, 2, 3].map((k) => (
        <span
          key={k}
          className="ember"
          aria-hidden="true"
          style={{ ...(side === 'l' ? { left: 85 + k * 2 } : { right: 91 - k * 2 }), top, width: 2 + (k % 3), height: 2 + (k % 3), animationName: `em${side === 'l' ? 0 : 1}${k}`, animationDuration: `${8 + k * 1.7}s`, animationDelay: `${-delay * 2 - k * 2.3}s` }}
        />
      ))}
    </>
  );
}

function Eyes({ side, top, delay }: { side: 'l' | 'r'; top: number; delay: number }) {
  return (
    <svg width="64" height="24" viewBox="0 0 64 24" aria-hidden="true" style={{ position: 'absolute', ...(side === 'l' ? { left: 22 } : { right: 22 }), top, opacity: 0.85 }}>
      <g className="eyes" style={{ animationDelay: `${delay}s` }}>
        <path d="M2 12 Q14 0 26 12 Q14 22 2 12z" fill="var(--blood)" />
        <rect x="13" y="5" width="2.4" height="14" rx="1.2" fill="var(--bg)" />
        <path d="M38 12 Q50 0 62 12 Q50 22 38 12z" fill="var(--blood)" />
        <rect x="49" y="5" width="2.4" height="14" rx="1.2" fill="var(--bg)" />
      </g>
    </svg>
  );
}

interface ShellProps {
  children: ReactNode;
  scrawls: string;
  lantern: boolean;
  /** y of the point the lantern rests on for the first seconds */
  homeY: number;
  /** minimum height of the stage content (px at zoom 1) */
  contentMin?: number;
  /** extra space below the content for the blood pool (px at zoom 1) */
  bottomPad?: number;
}

function calcZoom() {
  return window.matchMedia('(max-width: 820px)').matches ? 1 : Math.min(1, window.innerWidth / 1440);
}

export function Shell({ children, scrawls, lantern, homeY, contentMin = 0, bottomPad = 0 }: ShellProps) {
  const root = useRef<HTMLDivElement>(null);
  const compact = useCompact();
  const [zoom, setZoom] = useState(calcZoom);
  const [layer, setLayer] = useState<HTMLElement | null>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const on = () => setZoom(calcZoom());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight / zoom));
    ro.observe(el);
    return () => ro.disconnect();
  }, [zoom]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = prefersReducedMotion();
    const set = (x: number, y: number) => {
      el.style.setProperty('--mx', `${Math.round(x)}px`);
      el.style.setProperty('--my', `${Math.round(y)}px`);
    };
    const cx0 = () => el.clientWidth / 2;
    set(cx0(), homeY);

    let hover = false;
    let cx = cx0();
    let cy = homeY;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      cx = e.clientX - r.left;
      cy = e.clientY - r.top;
      hover = true;
      if (reduced) set(cx, cy);
    };
    const onLeave = () => {
      hover = false;
    };
    el.addEventListener('mousemove', onMove, { passive: true });
    el.addEventListener('mouseleave', onLeave);

    let raf = 0;
    if (!reduced && lantern) {
      const t0 = performance.now();
      let px = cx0();
      let py = homeY;
      const loop = (now: number) => {
        const t = (now - t0) / 1000;
        const H = el.offsetHeight;
        const home = cx0();
        const ox = home + 430 * Math.sin(t / 3.3);
        const oy = H * 0.5 - H * 0.44 * Math.cos(t / 11);
        const w0 = Math.max(0, Math.min(1, (t - 3.5) / 3));
        const w = w0 * w0 * (3 - 2 * w0);
        let tx = home + (ox - home) * w;
        let ty = homeY + (oy - homeY) * w;
        if (hover) {
          tx = cx;
          ty = cy;
        }
        px += (tx - px) * 0.12;
        py += (ty - py) * 0.12;
        set(px, py);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [lantern, homeY]);

  const op = lantern ? 1 : 0;
  const wide = !compact;
  const limit = height - bottomPad - 300;
  const candles: { side: 'l' | 'r'; top: number }[] = [];
  for (let y = 880, i = 0; y < limit; y += 440, i++) candles.push({ side: i % 2 === 0 ? 'r' : 'l', top: y });
  const eyes: { side: 'l' | 'r'; top: number }[] = [];
  for (let y = 700, i = 0; y < limit + 100; y += 420, i++) eyes.push({ side: i % 2 === 0 ? 'l' : 'r', top: y });
  return (
    <div
      ref={root}
      className="root"
      style={{ minHeight: compact ? '100vh' : `max(100vh, ${(contentMin + bottomPad) * zoom}px)`, paddingBottom: compact ? 270 : bottomPad * zoom }}
    >
      {/* Atmosphere: lamp light, fog, blood ceiling, cobwebs, candles, embers */}
      <div aria-hidden="true" style={css('position:absolute;inset:0;pointer-events:none')} dangerouslySetInnerHTML={{ __html: DECOR_HTML }} />
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zoom }}>
        {wide && candles.map((c, i) => (
          <Candle key={c.top} side={c.side} top={c.top} delay={-0.7 * (i + 1)} />
        ))}
      </div>
      <div className="tex tex-stain" aria-hidden="true" />

      <a href="#main-content" className="skip">Skip to content</a>
      <LanternLayer.Provider value={layer}>
        <main id="main-content" style={{ position: 'relative', zoom }}>{children}</main>
      </LanternLayer.Provider>

      {/* The dark rises: a thick pool, not water */}
      <div aria-hidden="true" style={css('position:absolute;inset:0;pointer-events:none')} dangerouslySetInnerHTML={{ __html: POOL_HTML }} />

      {/* Lantern: dims everything it is not touching */}
      <div
        aria-hidden="true"
        style={css(
          `position:absolute;inset:0;z-index:6;pointer-events:none;opacity:${op};transition:opacity .5s ease;background:radial-gradient(circle 440px at var(--mx,50%) var(--my,30%), rgba(var(--rgb-dim),0) 0%, rgba(var(--rgb-dim),0.05) 45%, rgba(var(--rgb-dim),0.17) 100%), radial-gradient(circle 360px at var(--mx,50%) var(--my,30%), rgba(var(--rgb-glow),0.1), transparent 70%)`,
        )}
      />
      {/* Scrawls and eyes only the lantern can see */}
      <div
        aria-hidden="true"
        style={css(
          `position:absolute;inset:0;z-index:6;pointer-events:none;opacity:${op};transition:opacity .5s ease;-webkit-mask-image:radial-gradient(circle 250px at var(--mx,50%) var(--my,30%), #000 25%, transparent 100%);mask-image:radial-gradient(circle 250px at var(--mx,50%) var(--my,30%), #000 25%, transparent 100%)`,
        )}
      >
        <div style={css('position:absolute;left:50%;top:0;width:1200px;height:100%;margin-left:-600px')} dangerouslySetInnerHTML={{ __html: scrawls }} />
        <div ref={setLayer} style={{ position: 'absolute', inset: 0, zoom }} />
        <div style={{ position: 'absolute', inset: 0, zoom }}>
          {wide && eyes.map((e, i) => (
            <Eyes key={e.top} side={e.side} top={e.top} delay={-2.5 * (i + 1)} />
          ))}
        </div>
      </div>

      <p className="credits">
        Built for Hacktoberfest 2026 · Ghost in the Machine
        <br />
        Model: <a href="https://huggingface.co/google/embeddinggemma-300m" target="_blank" rel="noreferrer">EmbeddingGemma</a> by Google, run with{' '}
        <a href="https://huggingface.co/docs/transformers.js" target="_blank" rel="noreferrer">Transformers.js</a> · Data: <a href="https://www.npmjs.com" target="_blank" rel="noreferrer">npm registry</a> and <a href="https://bundlephobia.com" target="_blank" rel="noreferrer">Bundlephobia</a>
        <br />
        Fonts: IM Fell English (Igino Marini), IBM Plex Mono (IBM), Homemade Apple (Font Diner), all under the SIL Open Font License or Apache 2.0
      </p>

      {/* Burnt edges */}
      <div aria-hidden="true" style={css('position:absolute;inset:0;z-index:6;pointer-events:none;background:radial-gradient(ellipse at 50% 30%, transparent 55%, var(--vig) 120%)')} />
      <div className="tex tex-dust" aria-hidden="true" />
      <div className="tex tex-grain" aria-hidden="true" />
    </div>
  );
}
