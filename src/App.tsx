import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DropZone } from './components/DropZone';
import { ScanProgress } from './components/ScanProgress';
import { ResultsView } from './components/ResultsView';
import { runScan } from './lib/scanner';
import type { ScanState, ScanResult } from './lib/types';

type AppPhase = 'idle' | 'scanning' | 'results' | 'error';

export default function App() {
  const [phase, setPhase] = useState<AppPhase>('idle');
  const [scanState, setScanState] = useState<ScanState>({
    phase: 'idle',
    progress: 0,
    message: '',
    result: null,
    error: null,
  });
  const [result, setResult] = useState<ScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileAccepted = useCallback(async (content: string) => {
    setPhase('scanning');
    setErrorMsg('');
    try {
      const scanResult = await runScan(content, (state) => {
        setScanState(state);
      });
      setResult(scanResult);
      setPhase('results');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error during scan';
      setErrorMsg(msg);
      setPhase('error');
    }
  }, []);

  const handleReset = useCallback(() => {
    setPhase('idle');
    setResult(null);
    setScanState({ phase: 'idle', progress: 0, message: '', result: null, error: null });
    setErrorMsg('');
  }, []);

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <header className="pt-12 pb-6 text-center">
        <motion.h1
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
          className="font-heading text-4xl md:text-5xl tracking-wider text-text-primary"
        >
          <span className="text-crimson">E</span>xorcist
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mt-2 text-sm text-text-muted tracking-[0.15em] uppercase"
        >
          Dependency Health Scanner
        </motion.p>
      </header>

      {/* Main content area */}
      <main className="flex-1 flex items-start justify-center px-4 pb-16 pt-8">
        <AnimatePresence mode="wait">
          {phase === 'idle' && (
            <motion.div
              key="idle"
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <DropZone onFileAccepted={handleFileAccepted} />
            </motion.div>
          )}

          {phase === 'scanning' && (
            <motion.div
              key="scanning"
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="w-full flex items-center justify-center pt-12"
            >
              <ScanProgress state={scanState} />
            </motion.div>
          )}

          {phase === 'results' && result && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              <ResultsView result={result} onReset={handleReset} />
            </motion.div>
          )}

          {phase === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-lg mx-auto text-center pt-12"
            >
              <div className="rounded-2xl bg-surface border border-crimson/20 p-8">
                <p className="font-heading text-2xl text-crimson mb-4">The ritual failed</p>
                <p className="text-sm text-text-secondary mb-6">{errorMsg}</p>
                <button
                  type="button"
                  onClick={handleReset}
                  className="
                    px-5 py-2 rounded-full text-sm font-medium
                    border border-border-strong text-text-secondary
                    hover:border-crimson hover:text-crimson
                    transition-all duration-300
                    active:scale-95
                  "
                >
                  Try again
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center border-t border-border-default">
        <p className="text-xs text-text-muted">
          Built for{' '}
          <span className="text-text-secondary">Hacktoberfest 2026</span>
          {' '}— Ghost in the Machine
        </p>
      </footer>
    </div>
  );
}
