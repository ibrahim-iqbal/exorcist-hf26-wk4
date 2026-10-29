import type { CheckCategory, Finding, ScanResult } from './types';

export interface BandMeta {
  title: string;
  sub: string;
  color: string;
  titleColor: string;
}

/** Order, labels and colors exactly as in the approved design. */
export const BAND_ORDER: CheckCategory[] = ['dead', 'cursed', 'possession', 'ancient', 'bloated', 'dormant', 'resurrection'];

export const BANDS: Record<CheckCategory, BandMeta> = {
  dead: { title: 'Dead Spirits', sub: 'I · deprecated', color: 'var(--blood)', titleColor: 'var(--bloodtext)' },
  cursed: { title: 'Cursed Licenses', sub: 'II · copyleft risk', color: 'var(--bile)', titleColor: 'var(--bile)' },
  possession: { title: 'Possessions', sub: 'III · duplicate packages', color: 'var(--bruise)', titleColor: 'var(--bruise)' },
  ancient: { title: 'Ancient Spirits', sub: 'IV · outdated majors', color: 'var(--rust)', titleColor: 'var(--rust)' },
  bloated: { title: 'Bloated Spirits', sub: 'V · oversized', color: 'var(--tallow)', titleColor: 'var(--tallow)' },
  dormant: { title: 'Dormant Spirits', sub: 'VI · unmaintained', color: 'var(--dormant)', titleColor: 'var(--text2)' },
  resurrection: { title: 'Resurrection', sub: 'VII · better alternatives', color: 'var(--ecto)', titleColor: 'var(--ecto)' },
};

/** Package names go into shell commands the user will paste, so only valid npm names are allowed. */
const NAME_OK = /^(@[a-z0-9~-][a-z0-9._~-]*\/)?[a-z0-9~-][a-z0-9._~-]*$/;
export function safeName(n?: string): string | null {
  return n && n.length <= 214 && NAME_OK.test(n) ? n : null;
}

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty'];
export const word = (n: number) => WORDS[n] ?? String(n);

export function verdict(score: number): string {
  if (score >= 90) return 'Blessed';
  if (score >= 75) return 'Haunted';
  if (score >= 45) return 'Possessed';
  return 'Damned';
}

export function plain(score: number): string {
  if (score >= 90) return 'Healthy';
  if (score >= 75) return 'Needs attention';
  if (score >= 45) return 'Risky';
  return 'Critical';
}

export function kb(bytes: number): string {
  const k = bytes / 1024;
  return `${k >= 10 ? Math.round(k) : k.toFixed(1)} kB`;
}

export function quiet(since?: string): string {
  const m = since?.match(/(\d+)\s*year/);
  return m ? `quiet ${m[1]} ${m[1] === '1' ? 'year' : 'years'}` : (since ?? 'quiet');
}

export interface Note {
  title: string;
  body: string;
  cmd: string | null;
  /** true when the command changes the project and belongs in "copy all" */
  fix: boolean;
}

const sentence = (s: string) => (/[.!?]$/.test(s) ? s : s + '.');

export function noteFor(cat: CheckCategory, f: Finding): Note {
  const pkg = safeName(f.package);
  const alt = safeName(f.alternative);
  const twin = safeName(f.pairedWith);
  switch (cat) {
    case 'dead':
      return { title: f.package, body: sentence(f.detail || 'Deprecated. No patches, no fixes.'), cmd: pkg && `npm rm ${pkg}`, fix: true };
    case 'cursed':
      return { title: f.package, body: `${sentence(f.detail)} Copyleft terms can oblige you to open your own source.`, cmd: pkg && `npm rm ${pkg}`, fix: true };
    case 'possession':
      return {
        title: `${f.package} ≈ ${f.pairedWith ?? ''}`,
        body: `${f.similarity ?? ''}% the same soul. Keep ${f.package}, cast out ${f.pairedWith ?? 'the twin'}. Check your imports first.`,
        cmd: twin && `npm rm ${twin}`,
        fix: true,
      };
    case 'ancient':
      return { title: f.package, body: `${sentence(f.detail)} The supported line is ${f.latestVersion ?? 'the latest'}. Upgrade, then run your tests.`, cmd: pkg && `npm i ${pkg}@latest`, fix: true };
    case 'bloated':
      return { title: f.package, body: `${sentence(f.detail)} Every visitor pays for it on first load.`, cmd: pkg && `npm explain ${pkg}`, fix: false };
    case 'dormant':
      return { title: f.package, body: `${sentence(f.since ?? f.detail)} Check whether it still receives fixes.`, cmd: pkg && `npm view ${pkg} time.modified`, fix: false };
    case 'resurrection':
      return {
        title: `${f.package} → ${f.alternative ?? ''}`,
        body: sentence(f.alternativeReason ?? f.detail),
        cmd: pkg && alt ? `npm i ${alt} && npm rm ${pkg}` : null,
        fix: true,
      };
  }
}

export function findings(result: ScanResult, cat: CheckCategory): Finding[] {
  return result.checks.find((c) => c.category === cat)?.findings ?? [];
}

/** Handwritten notes live inside their band, so they follow it instead of sitting at fixed page heights. */
export const BAND_SCRAWLS: Record<CheckCategory, { small: string[]; big: string }> = {
  dead: { small: ['buried since 2020', 'it was warned.'], big: 'they never left.' },
  cursed: { small: ['the license bites back'], big: 'you signed it.' },
  possession: { small: ["it wears the other's face"], big: 'two voices. one throat.' },
  ancient: { small: ['two majors behind'], big: 'older than the walls.' },
  bloated: { small: ['fed, never full'], big: 'it keeps eating.' },
  dormant: { small: ['last breath, 2022'], big: 'it only sleeps.' },
  resurrection: { small: ['come back lighter'], big: 'say their names, then go.' },
};
