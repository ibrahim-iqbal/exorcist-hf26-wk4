import { useCompact } from '../hooks/useCompact';
import { useCallback, useRef, useState } from 'react';
import { css } from '../design/css';
import { Sigil } from '../design/sigils';
import type { CheckCategory, ScanState } from '../lib/types';
import { DEMO_PACKAGE_JSON } from '../lib/demo';

interface LandingProps {
  /** null while waiting; a live scan state while working */
  scan: ScanState | null;
  error: string;
  onFile: (content: string) => void;
  lantern: boolean;
  onToggleLantern: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  soundOn: boolean;
  onToggleSound: () => void;
}

const HUNT: { kind: CheckCategory; title: string; color: string; line: string }[] = [
  { kind: 'dead', title: 'Dead spirits', color: 'var(--bloodtext)', line: 'deprecated, abandoned' },
  { kind: 'cursed', title: 'Cursed licenses', color: 'var(--bile)', line: 'terms that bite back' },
  { kind: 'possession', title: 'Possessions', color: 'var(--bruise)', line: 'two packages, one job' },
  { kind: 'ancient', title: 'Ancient spirits', color: 'var(--rust)', line: 'majors far behind' },
  { kind: 'bloated', title: 'Bloated spirits', color: 'var(--tallow)', line: 'too heavy for their work' },
  { kind: 'dormant', title: 'Dormant spirits', color: 'var(--text2)', line: 'silent for years' },
  { kind: 'resurrection', title: 'Resurrection', color: 'var(--ecto)', line: 'lighter bodies to take' },
];

const PHASE_MSG: Record<string, string> = {
  parsing: 'Reading the tome',
  'loading-model': 'Waking the model',
  'fetching-metadata': 'Consulting the registry',
  embedding: 'Reading the auras',
  analyzing: 'Weighing the souls',
  done: 'Judgement',
};

export function Landing({ scan, error, onFile, lantern, onToggleLantern, theme, onToggleTheme, soundOn, onToggleSound }: LandingProps) {
  const C = useCompact();
  const at = (desk: string, phone: string) => css(C ? phone : desk);
  const input = useRef<HTMLInputElement>(null);
  const drag = useRef(0);
  const [hover, setHover] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState('');
  const [ghUrl, setGhUrl] = useState('');
  const [ghLoading, setGhLoading] = useState(false);

  const idle = scan === null;
  const hot = (hover || dragging) && idle;
  const pct = scan ? Math.max(0, Math.min(100, Math.round(scan.progress))) : 0;
  const arcOff = !idle ? (1294.3 * (1 - pct / 100)).toFixed(1) : hot ? '1100' : '1294.3';

  const handleFile = useCallback(
    (file: File) => {
      setLocalError('');
      if (file.name !== 'package.json') return setLocalError('Only a package.json will do.');
      if (file.size > 1_000_000) return setLocalError('That tome is too heavy (1 MB max).');
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text !== 'string') return;
        try {
          JSON.parse(text);
        } catch {
          return setLocalError('That is not valid JSON.');
        }
        onFile(text);
      };
      reader.onerror = () => setLocalError('The tome could not be read.');
      reader.readAsText(file);
    },
    [onFile],
  );

  const start = () => {
    if (idle) input.current?.click();
  };

  const fetchGh = useCallback(async () => {
    if (!idle || ghLoading) return;
    setLocalError('');
    // Accept github.com/user/repo or just user/repo — owner and repo must be valid GitHub names
    const m = ghUrl.trim().match(/^(?:https?:\/\/)?(?:github\.com\/)?([a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?)\/([a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?)(?:\.git)?\/?$/);
    if (!m) return setLocalError('Paste a GitHub URL like github.com/user/repo');
    const slug = `${m[1]}/${m[2]}`;
    setGhLoading(true);
    try {
      // Try main, then master
      let res = await fetch(`https://raw.githubusercontent.com/${slug}/HEAD/package.json`);
      if (!res.ok) res = await fetch(`https://raw.githubusercontent.com/${slug}/main/package.json`);
      if (!res.ok) res = await fetch(`https://raw.githubusercontent.com/${slug}/master/package.json`);
      if (!res.ok) throw new Error('Could not find package.json in that repo.');
      const text = await res.text();
      if (text.length > 1_000_000) throw new Error('That package.json is too large (1 MB max).');
      JSON.parse(text); // validate
      onFile(text);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to fetch.');
    }
    setGhLoading(false);
  }, [ghUrl, idle, ghLoading, onFile]);

  return (
    <div
      style={C ? { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 0 } : { position: 'relative', width: 1200, height: 1240, margin: '0 auto' }}
      onDragEnter={(e) => {
        e.preventDefault();
        drag.current++;
        setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        drag.current = Math.max(0, drag.current - 1);
        if (drag.current === 0) setDragging(false);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        drag.current = 0;
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && idle) handleFile(file);
      }}
    >
      <header style={at('position:absolute;left:0;right:0;top:0;z-index:7;height:88px;padding:22px 40px 0;box-sizing:border-box;display:flex;align-items:center;justify-content:flex-end;gap:20px', 'position:relative;order:1;z-index:7;padding:6px 16px 0;display:flex;align-items:center;justify-content:center;gap:16px')}>
        <button className="sndtog" type="button" onClick={onToggleSound} aria-label={soundOn ? 'Turn sound off' : 'Turn sound on'}>
          {soundOn ? 'Sound on' : 'Sound off'}
        </button>
        <button className="link" type="button" onClick={onToggleLantern}>
          {lantern ? 'Lantern on' : 'Lantern off'}
        </button>
        <button className="iconbtn" type="button" onClick={onToggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          <ThemeIcon theme={theme} />
        </button>
      </header>

      {/* Wordmark */}
      <div style={at('position:absolute;left:0;right:0;top:44px;z-index:6;display:flex;flex-direction:column;align-items:center;pointer-events:none', 'position:relative;order:0;margin-top:24px;z-index:6;display:flex;flex-direction:column;align-items:center;pointer-events:none;text-align:center')}>
        <h1
          className="rise"
          style={css(`margin:0;font-family:'IM Fell English',serif;font-size:${C ? 48 : 88}px;font-weight:400;line-height:1;display:flex;align-items:center;gap:${C ? 10 : 18}px;color:var(--text);letter-spacing:.01em;text-shadow:var(--wm-shadow)`)}
        >
          <svg aria-hidden="true" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--blood)" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 4V20" />
            <path d="M8 15H16" />
          </svg>
          Exorcist
        </h1>
        <div className="px rise" style={css('margin-top:12px;font-size:12px;letter-spacing:.32em;text-transform:uppercase;color:var(--text2);animation-delay:.15s')}>
          Exorcism for your package.json
        </div>
      </div>

      {/* The summoning circle is the drop zone */}
      <div style={C ? { position: 'relative', order: 2, width: 300, height: 300, margin: '22px 0 0', flex: 'none' } : { display: 'contents' }}>
      <div style={C ? { position: 'absolute', left: 0, top: 0, width: 440, height: 440, transform: 'scale(.6818)', transformOrigin: '0 0' } : { display: 'contents' }}>
      <button
        className="circlebtn rise"
        type="button"
        aria-label="Choose your package.json to begin the exorcism"
        onClick={start}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={C ? { animationDelay: '.3s', left: 0, top: 0 } : { animationDelay: '.3s' }}
      >
        <span className="ripple" aria-hidden="true" style={{ opacity: hot ? 0.9 : 0.55 }} />
        <span className="ripple" aria-hidden="true" style={{ animationDelay: '-3.5s', opacity: hot ? 0.9 : 0.55 }} />
        <span aria-hidden="true" style={css(`position:absolute;left:50%;top:50%;width:420px;height:420px;margin:-210px 0 0 -210px;border-radius:9999px;background:radial-gradient(circle,rgba(var(--rgb-blood),.3),transparent 66%);opacity:${hot || !idle ? 1 : 0};transition:opacity .5s ease`)} />
        <svg className="spin" aria-hidden="true" width="440" height="440" viewBox="0 0 440 440" fill="none" stroke="var(--blood)" style={{ position: 'absolute', inset: 0, opacity: hot || !idle ? 1 : 0.55, transition: 'opacity .5s ease' }}>
          <circle cx="220" cy="220" r="196" strokeWidth="1" opacity="0.7" />
          <circle cx="220" cy="220" r="188" strokeWidth="3" strokeDasharray="1.5 10.2" opacity="0.8" />
          <path d="M220 406L110.6 69.6L396.9 277.4L43.1 277.4L329.4 69.6Z" strokeWidth="1" strokeLinejoin="round" opacity="0.8" />
        </svg>
        <svg aria-hidden="true" width="440" height="440" viewBox="0 0 440 440" fill="none" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
          <circle cx="220" cy="220" r="218" stroke="rgba(var(--rgb-blood),0.35)" strokeWidth="1" />
          <circle cx="220" cy="220" r="206" stroke="rgba(var(--rgb-text),0.07)" strokeWidth="6" />
          <circle cx="220" cy="220" r="206" stroke="var(--blood)" strokeWidth="6" strokeLinecap="round" strokeDasharray="1294.3" style={{ strokeDashoffset: arcOff, transition: 'stroke-dashoffset .6s cubic-bezier(.32,.72,0,1)' }} />
        </svg>
        <span aria-hidden="true" style={css('position:absolute;left:50%;top:50%;width:330px;height:330px;margin:-165px 0 0 -165px;background:radial-gradient(circle,rgba(var(--rgb-bg),.8) 0%,rgba(var(--rgb-bg),.55) 45%,transparent 70%)')} />

        {/* Waiting */}
        <span style={css(`position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;opacity:${idle ? 1 : 0};transition:opacity .35s ease`)}>
          <span className="tome" style={{ display: 'block' }}>
            <span style={css(`display:flex;flex-direction:column;align-items:center;justify-content:center;width:128px;height:88px;background:linear-gradient(var(--paper-a),var(--paper-b));color:#1B1410;clip-path:polygon(0 0,calc(100% - 20px) 0,100% 20px,100% 100%,0 100%);transform:translateY(${hot ? -10 : 0}px);transition:transform .45s cubic-bezier(.32,.72,0,1);box-shadow:0 0 0 1px rgba(0,0,0,.2)`)}>
              <span className="px" style={css('font-size:36px;line-height:1;font-weight:500')}>{'{ }'}</span>
              <span className="px" style={css('margin-top:6px;font-size:10px;letter-spacing:.12em')}>package.json</span>
            </span>
          </span>
          <span className="cg" style={css('margin-top:26px;font-size:32px;line-height:1.1;color:var(--text)')}>{hot ? 'Release it.' : 'Lay your tome here'}</span>
          <span className="px" style={css('margin-top:10px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--text2)')}>{hot ? 'Let the rite begin' : 'or click to choose a file'}</span>
        </span>

        {/* Working */}
        <span role="status" style={css(`position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:${idle ? 0 : 1};transition:opacity .35s ease`)}>
          <span className="cg" style={css('font-size:132px;line-height:.85;font-weight:700;color:var(--text);letter-spacing:-.02em')}>{pct}</span>
          <span className="px" style={css('margin-top:18px;font-size:11px;letter-spacing:.26em;text-transform:uppercase;color:var(--text2)')}>{scan ? (PHASE_MSG[scan.phase] ?? scan.message) : ''}</span>
          <span className="px" style={css('margin-top:12px;max-width:260px;min-height:30px;font-size:10px;line-height:1.5;letter-spacing:.06em;color:var(--text2);opacity:.8;text-align:center')}>
            {scan?.phase === 'loading-model' ? 'First visit only: the model is downloaded once, then kept in your browser.' : scan?.message ?? ''}
          </span>
        </span>
      </button>
      </div>
      </div>
      <input ref={input} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) handleFile(f);
        e.target.value = '';
      }} />

      {/* Demo */}
      <div className="rise" style={at('position:absolute;left:0;right:0;top:676px;display:flex;flex-direction:column;align-items:center;animation-delay:.6s;z-index:6', 'position:relative;order:3;margin-top:26px;display:flex;flex-direction:column;align-items:center;animation-delay:.6s;z-index:6;padding:0 16px;text-align:center')}>
        <button className="demo" type="button" disabled={!idle} onClick={() => onFile(DEMO_PACKAGE_JSON)}>
          <svg className="spin2" aria-hidden="true" width="20" height="20" viewBox="0 0 44 44" fill="none" stroke="currentColor" style={{ flex: 'none' }}>
            <circle cx="22" cy="22" r="20" strokeWidth="2" opacity=".8" />
            <path d="M22 35L14.35 11.5L34.37 26.01L9.63 26.01L29.65 11.5Z" strokeWidth="2" strokeLinejoin="round" />
          </svg>
          <span>Try a demo tome</span>
        </button>
        {(localError || error) && <p role="alert" className="errline">{localError || error}</p>}
      </div>

      {/* GitHub URL */}
      <div className="rise" style={at('position:absolute;left:0;right:0;top:734px;display:flex;flex-direction:column;align-items:center;gap:12px;animation-delay:.7s;z-index:6', 'position:relative;order:4;margin-top:28px;display:flex;flex-direction:column;align-items:center;gap:12px;animation-delay:.7s;z-index:6;padding:0 16px;width:100%;box-sizing:border-box')}>
        <div className="ghdiv">or scan a public repo</div>
        <div className="ghrow">
          <input
            className="ghurl"
            type="text"
            placeholder="github.com/user/repo"
            value={ghUrl}
            onChange={(e) => setGhUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') fetchGh(); }}
            disabled={!idle || ghLoading}
            aria-label="GitHub repository URL"
          />
          <button className="ghgo" type="button" disabled={!idle || ghLoading || !ghUrl.trim()} onClick={fetchGh}>
            {ghLoading ? 'Fetching…' : 'Scan'}
          </button>
        </div>
      </div>

      {/* What we hunt */}
      <div className="rise" style={at('position:absolute;left:40px;right:40px;top:850px;display:flex;align-items:center;gap:20px;animation-delay:.8s;z-index:6', 'position:relative;order:5;width:100%;box-sizing:border-box;padding:0 16px;margin-top:38px;display:flex;align-items:center;gap:12px;animation-delay:.8s;z-index:6')}>
        <span style={css('flex:1;height:1px;background:rgba(var(--rgb-text),.14)')} />
        <span className="px" style={css('font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:var(--text2)')}>Seven things we hunt</span>
        <span style={css('flex:1;height:1px;background:rgba(var(--rgb-text),.14)')} />
      </div>
      <div style={at('position:absolute;left:40px;right:40px;top:888px;display:flex;justify-content:space-between;z-index:6', 'position:relative;order:6;width:100%;box-sizing:border-box;padding:0 16px;margin-top:22px;display:grid;grid-template-columns:1fr 1fr;gap:26px 12px;justify-items:center;z-index:6')}>
        {HUNT.map((h, i) => (
          <div key={h.kind} className="rise" style={css(`animation-delay:${(0.9 + i * 0.1).toFixed(2)}s;width:${C ? '100%' : '160px'};display:flex;flex-direction:column;align-items:center;text-align:center`)}>
            <Sigil kind={h.kind} index={i} size={46} color={h.color} variant="landing" />
            <div className="cg" style={css(`margin-top:12px;font-size:20px;line-height:1.1;color:${h.color}`)}>{h.title}</div>
            <div className="dt" style={css('margin-top:6px;font-size:11px;line-height:1.4;color:var(--text2)')}>{h.line}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ThemeIcon({ theme }: { theme: 'dark' | 'light' }) {
  return theme === 'dark' ? (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
      <path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7" />
    </svg>
  ) : (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z" />
    </svg>
  );
}
