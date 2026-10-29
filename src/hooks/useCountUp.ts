import { useEffect, useState } from 'react';
import { prefersReducedMotion } from './motion';

export function useCountUp(target: number, durationMs = 1900, delayMs = 300) {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let raf = 0;
    let start = 0;
    const timer = window.setTimeout(() => {
      const tick = (now: number) => {
        if (!start) start = now;
        const p = Math.min(1, (now - start) / durationMs);
        const eased = 1 - Math.pow(1 - p, 3);
        setValue(Math.round(target * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delayMs);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [target, durationMs, delayMs]);

  return prefersReducedMotion() ? target : value;
}
