import type { CSSProperties } from 'react';

/** Parse an inline CSS string (as written in the mockups) into a React style object. */
export function css(input: string): CSSProperties {
  const out: Record<string, string> = {};
  let depth = 0;
  let cur = '';
  const parts: string[] = [];
  for (const ch of input) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ';' && depth === 0) {
      parts.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  parts.push(cur);
  for (const p of parts) {
    const i = p.indexOf(':');
    if (i < 1) continue;
    const rawKey = p.slice(0, i).trim();
    const val = p.slice(i + 1).trim();
    if (!val) continue;
    const key = rawKey.startsWith('--')
      ? rawKey
      : rawKey.replace(/^-(\w)/, (_m, c: string) => c.toUpperCase()).replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
    out[key] = val;
  }
  return out as CSSProperties;
}
