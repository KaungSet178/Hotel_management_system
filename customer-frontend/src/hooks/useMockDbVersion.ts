import { useSyncExternalStore } from 'react';
import { subscribeMockDb } from '@/mock/store';

/**
 * Re-renders the caller whenever the mock store changes. Used by the in-stay
 * service monitor so fulfilled status changes appear live without polling.
 */
export function useMockDbVersion(): number {
  return useSyncExternalStore(
    subscribeMockDb,
    () => dbVersion,
    () => dbVersion,
  );
}

// The subscribe callback fires on every store write; a monotonically
// increasing counter is enough for `useSyncExternalStore` equality checks.
let dbVersion = 0;
subscribeMockDb(() => {
  dbVersion += 1;
});