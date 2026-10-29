import type { NpmPackageInfo, BundlephobiaInfo } from './types';

const NPM_BASE = 'https://registry.npmjs.org';
const BUNDLEPHOBIA_BASE = 'https://bundlephobia.com/api/size';
const FETCH_TIMEOUT_MS = 12_000;

/** Fetch package metadata from npm registry. Returns null on 404/error. */
export async function fetchPackageInfo(name: string): Promise<NpmPackageInfo | null> {
  try {
    // Use abbreviated metadata endpoint for speed, fall back to full for time/versions
    const res = await fetch(`${NPM_BASE}/${encodeURIComponent(name)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Fetch gzip size from bundlephobia. Returns null on error. */
export async function fetchBundleSize(
  name: string,
  version?: string,
): Promise<BundlephobiaInfo | null> {
  try {
    const pkg = version ? `${name}@${version}` : name;
    const res = await fetch(
      `${BUNDLEPHOBIA_BASE}?package=${encodeURIComponent(pkg)}`,
      { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Batch-fetch package info with concurrency limit */
export async function fetchAllPackageInfo(
  names: string[],
  concurrency = 6,
  onProgress?: (done: number, total: number) => void,
): Promise<Map<string, NpmPackageInfo>> {
  const results = new Map<string, NpmPackageInfo>();
  let done = 0;

  const queue = [...names];
  async function worker() {
    while (queue.length > 0) {
      const name = queue.shift()!;
      const info = await fetchPackageInfo(name);
      if (info) results.set(name, info);
      done++;
      onProgress?.(done, names.length);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, names.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/** Batch-fetch bundle sizes with concurrency limit */
export async function fetchAllBundleSizes(
  names: string[],
  concurrency = 4,
  onProgress?: (done: number, total: number) => void,
): Promise<Map<string, BundlephobiaInfo>> {
  const results = new Map<string, BundlephobiaInfo>();
  let done = 0;

  const queue = [...names];
  async function worker() {
    while (queue.length > 0) {
      const name = queue.shift()!;
      const info = await fetchBundleSize(name);
      if (info) results.set(name, info);
      done++;
      onProgress?.(done, names.length);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, names.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
