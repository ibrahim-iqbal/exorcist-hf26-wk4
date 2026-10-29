import { motion } from 'framer-motion';

interface ScoreRingProps {
  score: number;
  size?: number;
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#2EA87A'; // resurrection green
  if (score >= 60) return '#E8A838'; // bloated amber
  if (score >= 40) return '#D85A30'; // ancient orange
  return '#E23636'; // crimson
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Blessed';
  if (score >= 60) return 'Haunted';
  if (score >= 40) return 'Cursed';
  return 'Damned';
}

export function ScoreRing({ score, size = 200 }: ScoreRingProps) {
  const color = getScoreColor(score);
  const label = getScoreLabel(score);
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="absolute inset-0">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-surface-elevated"
        />
        {/* Score arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.5, ease: [0.32, 0.72, 0, 1], delay: 0.3 }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        {/* Glow filter */}
        <defs>
          <filter id="score-glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* Center text */}
      <div className="text-center z-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <span className="font-heading text-5xl font-bold" style={{ color }}>
            {score}
          </span>
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-sm font-heading tracking-widest text-text-secondary uppercase mt-1"
        >
          {label}
        </motion.p>
      </div>
    </motion.div>
  );
}
