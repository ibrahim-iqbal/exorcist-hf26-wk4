/**
 * The 7 dependency health checks.
 * Each returns findings for its category.
 */

import type {
  NpmPackageInfo,
  BundlephobiaInfo,
  Finding,
  CheckResult,
} from './types';
import { cosineSimilarity } from './embeddings';

// ─── Thresholds ──────────────────────────────────────────────
const DUPLICATE_SIMILARITY_THRESHOLD = 0.82;
const UNMAINTAINED_YEARS = 2;
const BLOAT_THRESHOLD_BYTES = 20_000; // 20kB gzip
const COPYLEFT_LICENSES = new Set([
  'GPL-2.0',
  'GPL-2.0-only',
  'GPL-2.0-or-later',
  'GPL-3.0',
  'GPL-3.0-only',
  'GPL-3.0-or-later',
  'AGPL-3.0',
  'AGPL-3.0-only',
  'AGPL-3.0-or-later',
  'LGPL-2.1',
  'LGPL-3.0',
  'SSPL-1.0',
  'EUPL-1.2',
]);

// ─── Helpers ─────────────────────────────────────────────────
function getLicense(info: NpmPackageInfo): string {
  if (!info.license) return 'UNKNOWN';
  return typeof info.license === 'string' ? info.license : info.license.type;
}

function getLatestVersion(info: NpmPackageInfo): string | null {
  return info['dist-tags']?.latest ?? null;
}

function getLastPublishDate(info: NpmPackageInfo): Date | null {
  if (!info.time?.modified) return null;
  return new Date(info.time.modified);
}

function parseMajor(version: string): number | null {
  const m = version.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function cleanVersionSpec(spec: string): string {
  return spec.replace(/^[\^~>=<\s]+/, '').split(' ')[0];
}

// ─── 1. Possessions (duplicate functionality via embeddings) ─
export function checkPossessions(
  _descriptions: Map<string, string>,
  embeddings: Map<string, Float32Array>,
): CheckResult {
  const findings: Finding[] = [];
  const names = [...embeddings.keys()];
  const seen = new Set<string>();

  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = names[i], b = names[j];
      const key = [a, b].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);

      const sim = cosineSimilarity(embeddings.get(a)!, embeddings.get(b)!);
      if (sim >= DUPLICATE_SIMILARITY_THRESHOLD) {
        findings.push({
          package: a,
          pairedWith: b,
          similarity: Math.round(sim * 100),
          severity: 'warning',
          detail: `${Math.round(sim * 100)}% semantic similarity`,
        });
      }
    }
  }

  // Sort by similarity descending
  findings.sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));

  return {
    category: 'possession',
    label: 'Possessions',
    icon: 'copy',
    findings,
  };
}

// ─── 2. Dead spirits (deprecated packages) ───────────────────
export function checkDead(
  registry: Map<string, NpmPackageInfo>,
): CheckResult {
  const findings: Finding[] = [];

  for (const [name, info] of registry) {
    // Check if latest version is deprecated
    const latest = getLatestVersion(info);
    if (!latest || !info.versions) continue;
    const latestMeta = info.versions[latest];
    if (latestMeta?.deprecated || info.deprecated) {
      const deprecatedMsg = latestMeta?.deprecated || info.deprecated || '';
      // Try to extract year from deprecated message or time
      let since = '';
      if (info.time?.[latest]) {
        since = new Date(info.time[latest]).getFullYear().toString();
      }
      findings.push({
        package: name,
        severity: 'critical',
        detail: deprecatedMsg.slice(0, 120),
        since: since ? `deprecated ${since}` : 'deprecated',
      });
    }
  }

  return {
    category: 'dead',
    label: 'Dead spirits',
    icon: 'skull',
    findings,
  };
}

// ─── 3. Dormant spirits (unmaintained > 2 years) ─────────────
export function checkDormant(
  registry: Map<string, NpmPackageInfo>,
): CheckResult {
  const findings: Finding[] = [];
  const now = Date.now();
  const threshold = UNMAINTAINED_YEARS * 365.25 * 24 * 60 * 60 * 1000;

  for (const [name, info] of registry) {
    const lastPublish = getLastPublishDate(info);
    if (!lastPublish) continue;
    const age = now - lastPublish.getTime();
    if (age > threshold) {
      const years = Math.floor(age / (365.25 * 24 * 60 * 60 * 1000));
      findings.push({
        package: name,
        severity: 'info',
        detail: `last publish ${years}y ago`,
        since: `${years} years inactive`,
      });
    }
  }

  // Sort by staleness descending
  findings.sort((a, b) => {
    const aY = parseInt(a.since?.match(/\d+/)?.[0] ?? '0');
    const bY = parseInt(b.since?.match(/\d+/)?.[0] ?? '0');
    return bY - aY;
  });

  return {
    category: 'dormant',
    label: 'Dormant spirits',
    icon: 'zzz',
    findings,
  };
}

// ─── 4. Cursed licenses (copyleft in permissive project) ─────
export function checkCursed(
  registry: Map<string, NpmPackageInfo>,
  projectLicense: string,
): CheckResult {
  const findings: Finding[] = [];
  // Only flag if project itself is permissive
  const permissive = ['MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', 'Unlicense'];
  const projectIsPermissive = permissive.some(
    (l) => projectLicense.toUpperCase().includes(l.toUpperCase()),
  );

  if (!projectIsPermissive) {
    return { category: 'cursed', label: 'Cursed licenses', icon: 'license-off', findings };
  }

  for (const [name, info] of registry) {
    const license = getLicense(info);
    if (COPYLEFT_LICENSES.has(license)) {
      findings.push({
        package: name,
        severity: 'warning',
        detail: `${license} in ${projectLicense} project`,
        licenseName: license,
      });
    }
  }

  return {
    category: 'cursed',
    label: 'Cursed licenses',
    icon: 'license-off',
    findings,
  };
}

// ─── 5. Bloated spirits (oversized bundles) ──────────────────
export function checkBloated(
  bundleSizes: Map<string, BundlephobiaInfo>,
): CheckResult {
  const findings: Finding[] = [];

  for (const [name, info] of bundleSizes) {
    if (info.gzip > BLOAT_THRESHOLD_BYTES) {
      findings.push({
        package: name,
        severity: 'warning',
        detail: `${(info.gzip / 1024).toFixed(1)} kB gzipped`,
        gzipSize: info.gzip,
      });
    }
  }

  // Sort by size descending
  findings.sort((a, b) => (b.gzipSize ?? 0) - (a.gzipSize ?? 0));

  return {
    category: 'bloated',
    label: 'Bloated spirits',
    icon: 'package',
    findings,
  };
}

// ─── 6. Ancient spirits (major version behind) ───────────────
export function checkAncient(
  depVersions: Map<string, string>, // name -> version spec from package.json
  registry: Map<string, NpmPackageInfo>,
): CheckResult {
  const findings: Finding[] = [];

  for (const [name, spec] of depVersions) {
    const info = registry.get(name);
    if (!info) continue;
    const latest = getLatestVersion(info);
    if (!latest) continue;

    const currentClean = cleanVersionSpec(spec);
    const currentMajor = parseMajor(currentClean);
    const latestMajor = parseMajor(latest);

    if (currentMajor !== null && latestMajor !== null && latestMajor > currentMajor) {
      const behind = latestMajor - currentMajor;
      findings.push({
        package: name,
        severity: behind >= 2 ? 'critical' : 'info',
        detail: `v${currentMajor} → v${latestMajor}`,
        currentVersion: `v${currentMajor}`,
        latestVersion: `v${latestMajor}`,
      });
    }
  }

  // Sort by how far behind
  findings.sort((a, b) => {
    const aBehind = parseInt(b.latestVersion?.slice(1) ?? '0') - parseInt(b.currentVersion?.slice(1) ?? '0');
    const bBehind = parseInt(a.latestVersion?.slice(1) ?? '0') - parseInt(a.currentVersion?.slice(1) ?? '0');
    return bBehind - aBehind;
  });

  return {
    category: 'ancient',
    label: 'Ancient spirits',
    icon: 'hourglass',
    findings,
  };
}

// ─── 7. Resurrection (alternatives via embeddings) ───────────
export function checkResurrection(
  deadAndDormant: Finding[],
  allDescriptions: Map<string, string>,
  allEmbeddings: Map<string, Float32Array>,
): CheckResult {
  const findings: Finding[] = [];
  const problemPackages = new Set(deadAndDormant.map((f) => f.package));

  for (const finding of deadAndDormant) {
    const pkgEmbed = allEmbeddings.get(finding.package);
    if (!pkgEmbed) continue;

    let bestMatch = '';
    let bestSim = 0;

    for (const [name, embed] of allEmbeddings) {
      if (name === finding.package) continue;
      if (problemPackages.has(name)) continue; // Don't suggest another problem package

      const sim = cosineSimilarity(pkgEmbed, embed);
      if (sim > bestSim && sim > 0.65) {
        bestSim = sim;
        bestMatch = name;
      }
    }

    if (bestMatch) {
      findings.push({
        package: finding.package,
        severity: 'info',
        detail: `replace with ${bestMatch}`,
        alternative: bestMatch,
        alternativeReason: allDescriptions.get(bestMatch)?.slice(0, 80) ?? 'semantic match',
        similarity: Math.round(bestSim * 100),
      });
    }
  }

  return {
    category: 'resurrection',
    label: 'Resurrection',
    icon: 'refresh',
    findings,
  };
}

// ─── Health score ────────────────────────────────────────────
export function calculateHealthScore(checks: CheckResult[]): number {
  let penalty = 0;

  for (const check of checks) {
    for (const f of check.findings) {
      switch (f.severity) {
        case 'critical':
          penalty += 10;
          break;
        case 'warning':
          penalty += 5;
          break;
        case 'info':
          penalty += 2;
          break;
      }
    }
  }

  return Math.max(0, Math.min(100, 100 - penalty));
}
