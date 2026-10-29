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

/** Parse raw package.json text */
export function parsePackageJson(raw: string): PackageJson {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Invalid package.json — could not parse JSON');
  }
}

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
    throw new Error('No dependencies found in package.json');
  }

  // Phase 2: Load model (graceful fallback if unavailable)
  let modelAvailable = false;
  onProgress({ phase: 'loading-model', progress: 5, message: 'Summoning the spirit detector...', result: null, error: null });
  try {
    await loadModel((p) => {
      if (p.progress !== undefined) {
        onProgress({
          phase: 'loading-model',
          progress: 5 + (p.progress / 100) * 25,
          message: p.file ? `Loading ${p.file.split('/').pop()}...` : 'Summoning the spirit detector...',
          result: null,
          error: null,
        });
      }
    });
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
  const healthScore = calculateHealthScore(checks);
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
  };

  onProgress({ phase: 'done', progress: 100, message: 'Exorcism complete.', result, error: null });
  return result;
}
