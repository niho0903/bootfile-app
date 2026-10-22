'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** Mount browser-backed editors only after hydration, then initialize their state once. */
export function useStudioBrowserReady() {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}
