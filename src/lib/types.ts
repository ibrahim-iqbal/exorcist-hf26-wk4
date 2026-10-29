/** Core types for the Exorcist dependency scanner */

export interface PackageJson {
  name?: string;
  version?: string;
  license?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/** Raw npm registry response (subset we use) */
export interface NpmPackageInfo {
  name: string;
  description?: string;
  license?: string | { type: string };
  deprecated?: string;
  time?: Record<string, string>; // version -> ISO date, plus "created" and "modified"
  'dist-tags'?: { latest?: string };
  versions?: Record<string, { deprecated?: string; license?: string | { type: string } }>;
  maintainers?: Array<{ name: string; email?: string }>;
}

/** Bundlephobia API response (subset) */
export interface BundlephobiaInfo {
  name: string;
  version: string;
  gzip: number; // bytes
  size: number; // bytes
  dependencyCount: number;
}

/** A single finding from any check */
export interface Finding {
  package: string;
  severity: 'critical' | 'warning' | 'info';
  detail: string;
  /** For possession pairs */
  pairedWith?: string;
  similarity?: number;
  /** For resurrection alternatives */
  alternative?: string;
  alternativeReason?: string;
  /** For bloated — gzip bytes */
  gzipSize?: number;
  /** For ancient — current and latest major */
  currentVersion?: string;
  latestVersion?: string;
  /** For dead/dormant — date info */
  since?: string;
  /** For cursed — license name */
  licenseName?: string;
}

export type CheckCategory =
  | 'possession'
  | 'dead'
  | 'dormant'
  | 'cursed'
  | 'bloated'
  | 'ancient'
  | 'resurrection';

export interface CheckResult {
  category: CheckCategory;
  label: string;
  icon: string; // Tabler icon name without ti- prefix
  findings: Finding[];
}

export interface ScanResult {
  projectName: string;
  totalDeps: number;
  prodDeps: number;
  devDeps: number;
  healthScore: number;
  analysisTimeMs: number;
  checks: CheckResult[];
  /** Flat count of all findings */
  totalFindings: number;
}

export type ScanPhase =
  | 'idle'
  | 'parsing'
  | 'loading-model'
  | 'fetching-metadata'
  | 'embedding'
  | 'analyzing'
  | 'done'
  | 'error';

export interface ScanState {
  phase: ScanPhase;
  progress: number; // 0-100
  message: string;
  result: ScanResult | null;
  error: string | null;
}
