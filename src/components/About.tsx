import { css } from '../design/css';
import { ThemeIcon } from './Landing';

interface AboutProps {
  onBack: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

interface QA {
  q: string;
  a: string;
}

const FAQ: QA[] = [
  {
    q: 'Does my package.json ever leave my browser?',
    a: 'No. Parsing and the two ML-based checks (duplicate detection, alternative suggestions) run entirely client-side. The only network requests are public, anonymous lookups to the npm registry and Bundlephobia for package metadata and bundle sizes — never your file contents. Check the network tab yourself.',
  },
  {
    q: 'What does Exorcist actually check?',
    a: 'Seven things: deprecated packages (Dead Spirits), copyleft licenses hiding in a permissive project (Cursed Licenses), functional duplicates like lodash + underscore (Possessions), packages a major version or more behind (Ancient Spirits), bundles over 20kB gzipped (Bloated Spirits), packages with no publish in 2+ years (Dormant Spirits), and alternative suggestions for anything dead or dormant (Resurrection).',
  },
  {
    q: 'What happens if the embedding model fails to load?',
    a: "Exorcist falls back gracefully. Possessions and Resurrection (the two checks that need semantic similarity) are skipped, and the other five checks still run normally. No crash, no blank screen — you'll see a note that the model is unavailable.",
  },
  {
    q: 'Why is a package missing a bundle size?',
    a: "Bundlephobia sometimes has no data for niche or scoped packages. Exorcist just skips the bloat check for that package rather than guessing.",
  },
  {
    q: "Why did my scan stall or show rate-limit errors?",
    a: 'The npm registry rate-limits anonymous requests. Exorcist batches lookups with a concurrency cap to stay polite, but a very large package.json (100+ dependencies) can still hit the limit and slow down. Re-running the scan usually clears it.',
  },
  {
    q: 'Is this a replacement for npm audit?',
    a: "No — npm audit covers known CVEs, which Exorcist doesn't touch. Exorcist looks at slower rot: duplicates, deprecation, staleness, license conflicts, and bloat. Run both.",
  },
  {
    q: 'Can I run this on my own project without the website?',
    a: 'Yes. Clone the repo, npm install, npm run dev. See the README for the exact steps.',
  },
];

export function About({ onBack, theme, onToggleTheme }: AboutProps) {
  return (
    <div className="root" style={css('position:relative;min-height:100vh;background:var(--bg);color:var(--text)')}>
      <div aria-hidden="true" style={css('position:fixed;inset:0;z-index:0;pointer-events:none;background:radial-gradient(ellipse at 50% 0%, rgba(var(--rgb-blood),var(--lamp1)), transparent 60%)')} />
      <div className="tex tex-dust" aria-hidden="true" style={{ position: 'fixed' }} />
      <div className="tex tex-grain" aria-hidden="true" style={{ position: 'fixed' }} />

      <header style={css('position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 24px;background:var(--bg);border-top:3px solid var(--blood);border-bottom:1px solid rgba(var(--rgb-text),.14)')}>
        <button className="link" type="button" onClick={onBack}>
          ← Back
        </button>
        <h1 className="cg" style={css('margin:0;font-size:22px;display:flex;align-items:center;gap:8px;color:var(--text);text-shadow:var(--wm-shadow)')}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--blood)" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 4V20" />
            <path d="M8 15H16" />
          </svg>
          Exorcist
        </h1>
        <button className="iconbtn" type="button" onClick={onToggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          <ThemeIcon theme={theme} />
        </button>
      </header>

      <main style={css('position:relative;z-index:1;max-width:720px;margin:0 auto;padding:40px 24px 80px')}>
        <nav aria-label="Sections on this page" style={css('display:flex;flex-wrap:wrap;gap:10px 18px;margin-bottom:48px;font:500 11px \'IBM Plex Mono\',monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--text2)')}>
          <a href="#about" style={{ color: 'inherit' }}>About</a>
          <a href="#faq" style={{ color: 'inherit' }}>FAQ</a>
          <a href="#privacy" style={{ color: 'inherit' }}>Privacy</a>
          <a href="#limits" style={{ color: 'inherit' }}>Honest limits</a>
          <a href="#credits" style={{ color: 'inherit' }}>Credits</a>
        </nav>

        <section id="about" style={css('margin-bottom:48px')}>
          <h2 className="cg" style={css('font-size:26px;margin:0 0 16px;color:var(--bloodtext)')}>About</h2>
          <p style={css('margin:0 0 14px;line-height:1.7;color:var(--text2)')}>
            Exorcist scans a <code>package.json</code> for the dependency health problems <code>npm audit</code> doesn't catch: deprecated packages, functional duplicates, oversized bundles, stale majors, and copyleft licenses hiding in permissive projects. It runs entirely in your browser — the ML model downloads once and does its work via WebAssembly, with no backend and no telemetry.
          </p>
          <p style={css('margin:0;line-height:1.7;color:var(--text2)')}>
            Built for <a href="https://hacktoberfest.com" target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>Hacktoberfest 2026</a>, Week 4: Ghost in the Machine. Source on{' '}
            <a href="https://github.com/ibrahim-iqbal/exorcist-hf26-wk4" target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>GitHub</a>, released under the{' '}
            <a href="https://github.com/ibrahim-iqbal/exorcist-hf26-wk4/blob/main/LICENSE" target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>MIT License</a>.
          </p>
        </section>

        <section id="faq" style={css('margin-bottom:48px')}>
          <h2 className="cg" style={css('font-size:26px;margin:0 0 16px;color:var(--bloodtext)')}>FAQ</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {FAQ.map((item) => (
              <div key={item.q}>
                <div className="px" style={css('font-weight:600;font-size:13px;color:var(--text);margin-bottom:6px')}>{item.q}</div>
                <p style={css('margin:0;line-height:1.7;font-size:13px;color:var(--text2)')}>{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="privacy" style={css('margin-bottom:48px')}>
          <h2 className="cg" style={css('font-size:26px;margin:0 0 16px;color:var(--bloodtext)')}>Privacy policy</h2>
          <p style={css('margin:0 0 14px;line-height:1.7;color:var(--text2)')}>
            Exorcist collects nothing. There is no account, no analytics, no cookies, no server that sees your <code>package.json</code>. The file you drop or paste is parsed and analyzed locally in your browser tab.
          </p>
          <p style={css('margin:0 0 14px;line-height:1.7;color:var(--text2)')}>
            Three kinds of network requests happen during a scan, and all are public and anonymous:
          </p>
          <ul style={css('margin:0 0 14px;padding-left:20px;line-height:1.8;color:var(--text2)')}>
            <li>The EmbeddingGemma model weights (~26 MB), downloaded once from Hugging Face and cached by your browser.</li>
            <li>Package metadata lookups against the public npm registry, keyed only by package name and version — never by anything identifying you or your project.</li>
            <li>Bundle size lookups against the public Bundlephobia API, same basis.</li>
          </ul>
          <p style={css('margin:0;line-height:1.7;color:var(--text2)')}>
            When you paste a GitHub repo URL instead of uploading a file, Exorcist fetches that repo's public <code>package.json</code> directly from <code>raw.githubusercontent.com</code> — again, no server of ours sits in between.
          </p>
        </section>

        <section id="limits" style={css('margin-bottom:48px')}>
          <h2 className="cg" style={css('font-size:26px;margin:0 0 16px;color:var(--bloodtext)')}>Honest limits</h2>
          <ul style={css('margin:0;padding-left:20px;line-height:1.8;color:var(--text2)')}>
            <li>Embedding checks need a modern browser with WebAssembly SIMD support — falls back to 5/7 checks without it.</li>
            <li>npm registry rate limits can slow scans on very large <code>package.json</code> files (100+ deps).</li>
            <li>Bundlephobia sometimes has no data for niche or scoped packages; those are skipped for the bloat check.</li>
            <li>Duplicate detection uses description similarity, not API surface analysis — the 82% threshold minimizes false positives but can't eliminate them.</li>
            <li>No lockfile analysis — Exorcist reads <code>package.json</code>, not the resolved transitive tree.</li>
          </ul>
        </section>

        <section id="credits">
          <h2 className="cg" style={css('font-size:26px;margin:0 0 16px;color:var(--bloodtext)')}>Credits</h2>
          <ul style={css('margin:0;padding-left:20px;line-height:1.8;color:var(--text2)')}>
            <li><a href="https://huggingface.co/nickmuchi/EmbeddingGemma-300M-ONNX" target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>EmbeddingGemma</a> by Google, ONNX conversion by nickmuchi</li>
            <li><a href="https://huggingface.co/docs/transformers.js" target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>Hugging Face Transformers.js</a> for in-browser ML inference</li>
            <li><a href="https://bundlephobia.com" target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>Bundlephobia</a> for package size data</li>
            <li><a href="https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md" target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>npm Registry API</a> for package metadata</li>
            <li>Fonts: IM Fell English (Igino Marini), IBM Plex Mono (IBM), Homemade Apple (Font Diner) — SIL Open Font License / Apache 2.0</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
