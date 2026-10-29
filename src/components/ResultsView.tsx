import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ScanResult, CheckCategory } from '../lib/types';
import { ScoreRing } from './ScoreRing';
import { FindingCard } from './FindingCard';

interface ResultsViewProps {
  result: ScanResult;
  onReset: () => void;
}

const categoryOrder: CheckCategory[] = [
  'dead',
  'ancient',
  'bloated',
  'possession',
  'cursed',
  'dormant',
  'resurrection',
];

const categoryMeta: Record<CheckCategory, { icon: string; color: string }> = {
  possession: { icon: '👻', color: 'text-possession' },
  dead: { icon: '💀', color: 'text-dead' },
  dormant: { icon: '💤', color: 'text-dormant' },
  cursed: { icon: '🔮', color: 'text-cursed' },
  bloated: { icon: '🫧', color: 'text-bloated' },
  ancient: { icon: '⏳', color: 'text-ancient' },
  resurrection: { icon: '✨', color: 'text-resurrection' },
};

export function ResultsView({ result, onReset }: ResultsViewProps) {
  const [activeCategory, setActiveCategory] = useState<CheckCategory | 'all'>('all');

  const checksWithFindings = result.checks.filter((c) => c.findings.length > 0);
  const sortedChecks =
    activeCategory === 'all'
      ? [...checksWithFindings].sort(
          (a, b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category),
        )
      : checksWithFindings.filter((c) => c.category === activeCategory);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-4xl mx-auto"
    >
      {/* Header section */}
      <div className="text-center mb-12">
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-heading text-sm tracking-[0.3em] text-text-muted uppercase mb-6"
        >
          Exorcism Report
        </motion.p>

        <ScoreRing score={result.healthScore} />

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center justify-center gap-6 mt-8 text-sm text-text-secondary"
        >
          <span>
            <strong className="text-text-primary font-mono">{result.totalDeps}</strong> dependencies
          </span>
          <span className="text-border-strong">|</span>
          <span>
            <strong className="text-text-primary font-mono">{result.totalFindings}</strong> findings
          </span>
          <span className="text-border-strong">|</span>
          <span>
            <strong className="text-text-primary font-mono">
              {(result.analysisTimeMs / 1000).toFixed(1)}s
            </strong>{' '}
            analysis
          </span>
        </motion.div>

        {/* Project name */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-3 font-mono text-xs text-text-muted"
        >
          {result.projectName} — {result.prodDeps} prod / {result.devDeps} dev
        </motion.p>
      </div>

      {/* Ornamental divider */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex-1 h-px bg-border-default" />
        <span className="font-heading text-xs tracking-[0.3em] text-text-muted uppercase">
          Findings
        </span>
        <div className="flex-1 h-px bg-border-default" />
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2 mb-8 justify-center">
        <FilterPill
          label="All"
          count={result.totalFindings}
          active={activeCategory === 'all'}
          onClick={() => setActiveCategory('all')}
        />
        {result.checks.map((check) => (
          <FilterPill
            key={check.category}
            label={`${categoryMeta[check.category].icon} ${check.label}`}
            count={check.findings.length}
            active={activeCategory === check.category}
            onClick={() => setActiveCategory(check.category)}
            colorClass={categoryMeta[check.category].color}
          />
        ))}
      </div>

      {/* Findings grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="space-y-8"
        >
          {sortedChecks.map((check) => (
            <div key={check.category}>
              <h3 className={`font-heading text-lg tracking-wider mb-4 ${categoryMeta[check.category].color}`}>
                {categoryMeta[check.category].icon} {check.label}
              </h3>
              <div className="space-y-3">
                {check.findings.map((finding, i) => (
                  <FindingCard
                    key={`${finding.package}-${i}`}
                    finding={finding}
                    category={check.category}
                    index={i}
                  />
                ))}
              </div>
            </div>
          ))}

          {sortedChecks.length === 0 && (
            <p className="text-center text-text-muted py-12">
              No findings in this category. The spirits rest easy.
            </p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Reset button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-center mt-16 mb-8"
      >
        <button
          type="button"
          onClick={onReset}
          className="
            px-6 py-3 rounded-full font-heading text-sm tracking-wider
            border border-border-strong text-text-secondary
            hover:border-crimson hover:text-crimson
            transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
            active:scale-95
          "
        >
          Scan another tome
        </button>
      </motion.div>
    </motion.div>
  );
}

function FilterPill({
  label,
  count,
  active,
  onClick,
  colorClass,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  colorClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        px-3 py-1.5 rounded-full text-xs font-medium
        transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]
        ${
          active
            ? 'bg-crimson/15 text-crimson border border-crimson/30'
            : `bg-surface border border-border-default ${colorClass ?? 'text-text-secondary'} hover:border-border-strong`
        }
      `}
    >
      {label}
      <span className="ml-1.5 opacity-60">{count}</span>
    </button>
  );
}
