import { motion } from 'framer-motion';
import type { ScanState } from '../lib/types';

interface ScanProgressProps {
  state: ScanState;
}

const phaseLabels: Record<string, string> = {
  parsing: 'Reading the Tome',
  'loading-model': 'Summoning Spirit Detector',
  'fetching-metadata': 'Consulting the Registry',
  embedding: 'Reading Auras',
  analyzing: 'Performing the Exorcism',
};

export function ScanProgress({ state }: ScanProgressProps) {
  const label = phaseLabels[state.phase] ?? state.phase;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
      className="w-full max-w-2xl mx-auto text-center"
    >
      {/* Animated sigil */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        className="w-24 h-24 mx-auto mb-8 relative"
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-border-default"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={`${state.progress * 2.83} ${283 - state.progress * 2.83}`}
            strokeLinecap="round"
            className="text-crimson"
            transform="rotate(-90 50 50)"
          />
          {/* Inner pentagram hint */}
          <circle
            cx="50"
            cy="50"
            r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.3"
            className="text-crimson/30"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-lg text-crimson font-bold">
            {Math.round(state.progress)}%
          </span>
        </div>
      </motion.div>

      {/* Phase label */}
      <motion.h2
        key={state.phase}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-heading text-2xl text-text-primary tracking-wider mb-3"
      >
        {label}
      </motion.h2>

      {/* Detail message */}
      <motion.p
        key={state.message}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-sm text-text-secondary font-mono"
      >
        {state.message}
      </motion.p>

      {/* Progress bar */}
      <div className="mt-8 mx-auto max-w-md h-1 bg-surface-elevated rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-crimson rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${state.progress}%` }}
          transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
        />
      </div>
    </motion.div>
  );
}
