/**
 * Scan orchestrator — coordinates all phases of the dependency health scan.
 */

import type { PackageJson, ScanState, ScanResult, CheckResult, Finding } from './types';
import { loadModel, embedBatch } from './embeddings';
import { fetchAllPackageInfo, fetchAllBundleSizes } from './npm-registry';
import {
  checkPossessions,
  checkDead,
  checkDormant,
  checkCursed,
  checkBloated,
  checkAncient,
  checkResurrection,
  calculateHealthScore,
} from './analyzers';

export type ScanProgressCallback = (state: ScanState) => void;

export const MAX_DEPS = 400;
const MODEL_TIMEOUT_MS = 120_000;

const isPlainObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Parse raw package.json text and make sure it is shaped like one. */
export function parsePackageJson(raw: string): PackageJson {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('That is not valid JSON.');
  }
  if (!isPlainObject(data)) throw new Error('A package.json must be a JSON object.');
  for (const key of ['dependencies', 'devDependencies'] as const) {
    const v = data[key];
    if (v !== undefined && !isPlainObject(v)) throw new Error(`"${key}" must be an object of name: version pairs.`);
  }
  // Keep only string versions so odd values cannot reach the analyzers.
  const clean = (v: unknown): Record<string, string> =>
    isPlainObject(v) ? Object.fromEntries(Object.entries(v).filter(([, x]) => typeof x === 'string') as [string, string][]) : {};
  return {
    ...(data as object),
    name: typeof data.name === 'string' ? data.name : undefined,
    license: typeof data.license === 'string' ? data.license : undefined,
    dependencies: clean(data.dependencies),
    devDependencies: clean(data.devDependencies),
  } as PackageJson;
}

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });

/** Extract all dependency names from package.json */
function getAllDeps(pkg: PackageJson): {
  all: string[];
  prod: string[];
  dev: string[];
  versions: Map<string, string>;
} {
  const prod = Object.keys(pkg.dependencies ?? {});
  const dev = Object.keys(pkg.devDependencies ?? {});
  const all = [...new Set([...prod, ...dev])];
  const versions = new Map<string, string>();
  for (const [name, ver] of Object.entries(pkg.dependencies ?? {})) versions.set(name, ver);
  for (const [name, ver] of Object.entries(pkg.devDependencies ?? {})) versions.set(name, ver);
  return { all, prod, dev, versions };
}

/** Run full scan pipeline */
export async function runScan(
  rawJson: string,
  onProgress: ScanProgressCallback,
): Promise<ScanResult> {
  const start = performance.now();

  // Phase 1: Parse
  onProgress({ phase: 'parsing', progress: 0, message: 'Reading the tome...', result: null, error: null });
  const pkg = parsePackageJson(rawJson);
  const { all, prod, dev, versions } = getAllDeps(pkg);

  if (all.length === 0) {
    throw new Error('This tome lists no dependencies. Nothing to exorcise.');
  }
  if (all.length > MAX_DEPS) {
    throw new Error(`That tome is too large (${all.length} dependencies, ${MAX_DEPS} max).`);
  }

  // Phase 2: Load model (graceful fallback if unavailable)
  let modelAvailable = false;
  onProgress({ phase: 'loading-model', progress: 5, message: 'Summoning the spirit detector...', result: null, error: null });
  try {
    await withTimeout(loadModel((p) => {
      if (p.progress !== undefined) {
        onProgress({
          phase: 'loading-model',
          progress: 5 + (p.progress / 100) * 25,
          message: p.file ? `Loading ${p.file.split('/').pop()}...` : 'Summoning the spirit detector...',
          result: null,
          error: null,
        });
      }
    }), MODEL_TIMEOUT_MS);
    modelAvailable = true;
  } catch {
    // Model unavailable — skip embedding-based checks (possessions, resurrection)
    onProgress({ phase: 'loading-model', progress: 30, message: 'Spirit detector unavailable — skipping embedding checks...', result: null, error: null });
  }

  // Phase 3: Fetch metadata
  onProgress({ phase: 'fetching-metadata', progress: 30, message: 'Consulting the registry...', result: null, error: null });
  const registry = await fetchAllPackageInfo(all, 6, (done, total) => {
    onProgress({
      phase: 'fetching-metadata',
      progress: 30 + (done / total) * 15,
      message: `Fetched ${done}/${total} packages...`,
      result: null,
      error: null,
    });
  });

  if (registry.size === 0) {
    throw new Error('Could not reach the npm registry. Check your connection and try again.');
  }

  // Fetch bundle sizes in parallel-ish
  onProgress({ phase: 'fetching-metadata', progress: 45, message: 'Measuring bloat...', result: null, error: null });
  const bundleSizes = await fetchAllBundleSizes(all, 4, (done, total) => {
    onProgress({
      phase: 'fetching-metadata',
      progress: 45 + (done / total) * 10,
      message: `Sized ${done}/${total} packages...`,
      result: null,
      error: null,
    });
  });

  // Phase 4: Embed descriptions (if model available)
  const descriptions = new Map<string, string>();
  const embeddings = new Map<string, Float32Array>();

  for (const [name, info] of registry) {
    descriptions.set(name, info.description ?? name);
  }

  if (modelAvailable) {
    onProgress({ phase: 'embedding', progress: 55, message: 'Reading auras...', result: null, error: null });
    const textsToEmbed: string[] = [];
    const namesWithDesc: string[] = [];

    for (const [name, desc] of descriptions) {
      textsToEmbed.push(desc);
      namesWithDesc.push(name);
    }

    if (textsToEmbed.length > 0) {
      const vectors = await embedBatch(textsToEmbed, '', (done, total) => {
        onProgress({
          phase: 'embedding',
          progress: 55 + (done / total) * 25,
          message: `Embedded ${done}/${total} descriptions...`,
          result: null,
          error: null,
        });
      });
      for (let i = 0; i < namesWithDesc.length; i++) {
        embeddings.set(namesWithDesc[i], vectors[i]);
      }
    }
  } else {
    onProgress({ phase: 'embedding', progress: 80, message: 'Skipping aura reading...', result: null, error: null });
  }

  // Phase 5: Analyze
  onProgress({ phase: 'analyzing', progress: 80, message: 'Performing the exorcism...', result: null, error: null });

  const projectLicense = pkg.license ?? 'UNKNOWN';

  const checks: CheckResult[] = [];

  // Run all 7 checks
  checks.push(checkPossessions(descriptions, embeddings));
  onProgress({ phase: 'analyzing', progress: 82, message: 'Detecting possessions...', result: null, error: null });

  checks.push(checkDead(registry));
  onProgress({ phase: 'analyzing', progress: 84, message: 'Finding dead spirits...', result: null, error: null });

  checks.push(checkDormant(registry));
  onProgress({ phase: 'analyzing', progress: 86, message: 'Sensing dormant spirits...', result: null, error: null });

  checks.push(checkCursed(registry, projectLicense));
  onProgress({ phase: 'analyzing', progress: 88, message: 'Checking for curses...', result: null, error: null });

  checks.push(checkBloated(bundleSizes));
  onProgress({ phase: 'analyzing', progress: 90, message: 'Weighing bloated spirits...', result: null, error: null });

  checks.push(checkAncient(versions, registry));
  onProgress({ phase: 'analyzing', progress: 92, message: 'Dating ancient spirits...', result: null, error: null });

  // Resurrection needs dead + dormant findings
  const deadAndDormant: Finding[] = [
    ...checks.find((c) => c.category === 'dead')!.findings,
    ...checks.find((c) => c.category === 'dormant')!.findings,
  ];
  checks.push(checkResurrection(deadAndDormant, descriptions, embeddings));
  onProgress({ phase: 'analyzing', progress: 95, message: 'Seeking resurrections...', result: null, error: null });

  // Calculate score
  const healthScore = calculateHealthScore(checks, all.length);
  const totalFindings = checks.reduce((sum, c) => sum + c.findings.length, 0);

  const result: ScanResult = {
    projectName: pkg.name ?? 'unknown',
    totalDeps: all.length,
    prodDeps: prod.length,
    devDeps: dev.length,
    healthScore,
    analysisTimeMs: performance.now() - start,
    checks,
    totalFindings,
    modelSkipped: !modelAvailable,
  };

  onProgress({ phase: 'done', progress: 100, message: 'Exorcism complete.', result, error: null });
  return result;
}
