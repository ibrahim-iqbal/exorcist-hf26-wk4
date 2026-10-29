import { motion } from 'framer-motion';
import type { Finding, CheckCategory } from '../lib/types';

interface FindingCardProps {
  finding: Finding;
  category: CheckCategory;
  index: number;
}

const categoryColors: Record<CheckCategory, string> = {
  possession: 'var(--color-possession)',
  dead: 'var(--color-dead)',
  dormant: 'var(--color-dormant)',
  cursed: 'var(--color-cursed)',
  bloated: 'var(--color-bloated)',
  ancient: 'var(--color-ancient)',
  resurrection: 'var(--color-resurrection)',
};

const severityBadge: Record<string, { bg: string; text: string }> = {
  critical: { bg: 'bg-crimson/15', text: 'text-crimson' },
  warning: { bg: 'bg-bloated/15', text: 'text-bloated' },
  info: { bg: 'bg-text-secondary/10', text: 'text-text-secondary' },
};

export function FindingCard({ finding, category, index }: FindingCardProps) {
  const accent = categoryColors[category];
  const badge = severityBadge[finding.severity] ?? severityBadge.info;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        ease: [0.32, 0.72, 0, 1],
        delay: index * 0.05,
      }}
      className="group relative rounded-xl bg-surface border border-border-default
                 hover:border-border-strong transition-all duration-300
                 ease-[cubic-bezier(0.32,0.72,0,1)]"
    >
      {/* Accent bar */}
      <div
        className="absolute top-0 left-0 w-1 h-full rounded-l-xl"
        style={{ backgroundColor: accent }}
      />

      <div className="pl-5 pr-4 py-4">
        <div className="flex items-start justify-between gap-3">
          {/* Package name */}
          <div className="min-w-0">
            <code className="font-mono text-sm text-text-primary font-medium">
              {finding.package}
            </code>
            {finding.pairedWith && (
              <span className="text-text-muted text-sm">
                {' '}
                &amp;{' '}
                <code className="font-mono">{finding.pairedWith}</code>
              </span>
            )}
          </div>

          {/* Severity badge */}
          <span
            className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider ${badge.bg} ${badge.text}`}
          >
            {finding.severity}
          </span>
        </div>

        {/* Detail */}
        <p className="mt-2 text-sm text-text-secondary">{finding.detail}</p>

        {/* Extra info row */}
        {(finding.since || finding.licenseName || finding.alternative) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {finding.since && (
              <span className="text-xs text-text-muted font-mono">{finding.since}</span>
            )}
            {finding.licenseName && (
              <span className="text-xs text-cursed font-mono">{finding.licenseName}</span>
            )}
            {finding.alternative && (
              <span className="text-xs text-resurrection font-mono">
                try {finding.alternative}
              </span>
            )}
            {finding.similarity !== undefined && (
              <span className="text-xs text-text-muted">{finding.similarity}% match</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
