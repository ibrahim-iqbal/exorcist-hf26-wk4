import { useCallback, useState } from 'react';
import { Shell } from './design/Shell';
import { SCRAWLS_LANDING, SCRAWLS_RESULTS } from './design/static';
import { Landing } from './components/Landing';
import { Results } from './components/Results';
import { useTheme } from './hooks/useTheme';
import { useSound } from './hooks/useSound';
import { prefersReducedMotion } from './hooks/motion';
import { runScan } from './lib/scanner';
import type { ScanResult, ScanState } from './lib/types';

type AppPhase = 'idle' | 'scanning' | 'judging' | 'leaving' | 'results' | 'error';

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default function App() {
  const [phase, setPhase] = useState<AppPhase>('idle');
  const [scanState, setScanState] = useState<ScanState | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [lantern, setLantern] = useState(() => !prefersReducedMotion());
  const { theme, toggle } = useTheme();
  const { soundOn, toggleSound, bell } = useSound();

  const handleFile = useCallback(async (content: string) => {
    setPhase('scanning');
    setErrorMsg('');
    setScanState({ phase: 'parsing', progress: 0, message: '', result: null, error: null });
    try {
      const r = await runScan(content, (s) => setScanState(s));
      setResult(r);
      // Let the circle fill and the verdict land, then fade the landing out before the results appear.
      const quick = prefersReducedMotion();
      setScanState({ phase: 'done', progress: 100, message: '', result: r, error: null });
      setPhase('judging');
      bell();
      await wait(quick ? 200 : 1300);
      setPhase('leaving');
      await wait(quick ? 0 : 500);
      setPhase('results');
      window.scrollTo({ top: 0 });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'The ritual failed.');
      setPhase('error');
    }
  }, [bell]);

  const reset = useCallback(() => {
    setPhase('idle');
    setResult(null);
    setScanState(null);
    setErrorMsg('');
    window.scrollTo({ top: 0 });
  }, []);

  const toggleLantern = () => setLantern((v) => !v);

  if (phase === 'results' && result) {
    return (
      <div className="enter">
      <Shell scrawls={SCRAWLS_RESULTS} lantern={lantern} homeY={380} bottomPad={306}>
        <Results result={result} onReset={reset} lantern={lantern} onToggleLantern={toggleLantern} theme={theme} onToggleTheme={toggle} soundOn={soundOn} onToggleSound={toggleSound} />
      </Shell>
      </div>
    );
  }
  return (
    <div className={phase === 'leaving' ? 'leave' : undefined}>
    <Shell scrawls={SCRAWLS_LANDING} lantern={lantern} homeY={420} contentMin={1240}>
      <Landing
        scan={phase === 'scanning' || phase === 'judging' || phase === 'leaving' ? scanState : null}
        error={errorMsg}
        onFile={handleFile}
        lantern={lantern}
        onToggleLantern={toggleLantern}
        theme={theme}
        onToggleTheme={toggle}
        soundOn={soundOn}
        onToggleSound={toggleSound}
      />
    </Shell>
    </div>
  );
}