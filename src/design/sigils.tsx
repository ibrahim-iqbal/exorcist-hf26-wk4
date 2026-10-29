import type { CheckCategory } from '../lib/types';

const P = (d: string) => `<path class="sg" pathLength="1" d="${d}"/>`;
const C = (cx: number, cy: number, r: number) => `<circle class="sg" pathLength="1" cx="${cx}" cy="${cy}" r="${r}"/>`;

const BAND: Record<CheckCategory, string> = {
  dead: C(32, 32, 26) + P('M32 10V54') + P('M22 40H42'),
  cursed: P('M32 6L58 54H6Z') + P('M20 40Q32 28 44 40Q32 52 20 40Z') + C(32, 40, 3.5),
  possession: C(24, 32, 17) + C(40, 32, 17) + P('M32 17V47'),
  ancient: P('M16 8H48L32 32Z') + P('M16 56H48L32 32Z'),
  bloated:
    C(32, 32, 12) + C(32, 32, 21) + P('M32 3V8') + P('M32 56V61') + P('M3 32H8') + P('M56 32H61') + P('M11 11L15 15') + P('M49 49L53 53') + P('M53 11L49 15') + P('M15 49L11 53'),
  dormant: P('M42 8C28 10 18 20 18 34C18 48 28 56 42 56C34 50 30 44 30 34C30 24 34 14 42 8Z'),
  resurrection: `<ellipse class="sg" pathLength="1" cx="32" cy="17" rx="10" ry="12"/>` + P('M32 29V60') + P('M17 40H47'),
};

const LANDING: Partial<Record<CheckCategory, string>> = {
  possession: C(24, 32, 17) + C(40, 32, 17) + P('M32 10V54'),
  resurrection: `<ellipse class="sg" pathLength="1" cx="32" cy="18" rx="10" ry="12"/>` + P('M32 30V58') + P('M20 42H44'),
  bloated:
    C(32, 32, 12) + C(32, 32, 21) +
    Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4;
      return P(`M${(32 + Math.cos(a) * 24).toFixed(1)} ${(32 + Math.sin(a) * 24).toFixed(1)}L${(32 + Math.cos(a) * 30).toFixed(1)} ${(32 + Math.sin(a) * 30).toFixed(1)}`);
    }).join(''),
};

interface SigilProps {
  kind: CheckCategory;
  index: number;
  size?: number;
  color: string;
  variant?: 'band' | 'landing';
}

export function Sigil({ kind, index, size = 64, color, variant = 'band' }: SigilProps) {
  const html = (variant === 'landing' && LANDING[kind]) || BAND[kind];
  return (
    <svg
      className={`sgbox b${index}${variant === 'band' ? ` m-${kind}` : ''}`}
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      style={{ color, flex: 'none' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
