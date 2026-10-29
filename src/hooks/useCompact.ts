import { useSyncExternalStore } from 'react';

const QUERY = '(max-width: 820px)';

function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

/** True on phones and other narrow screens, where the pages switch from the poster layout to a single column. */
export function useCompact(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
