'use client';

import { useSyncExternalStore } from 'react';

function subscribe(listener: () => void) {
  window.addEventListener('storage', listener);
  return () => window.removeEventListener('storage', listener);
}

/** Undefined during SSR; null means storage was checked and is absent or unavailable. */
export function useBrowserStorage(key: string): string | null | undefined {
  return useSyncExternalStore(subscribe, () => {
    try { return window.localStorage.getItem(key); }
    catch { return null; }
  }, () => undefined);
}
