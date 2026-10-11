import { useCallback, useEffect, useState } from 'react';
import { toUserMessage } from '@/services/errors';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Runs an async loader on mount (and when `deps` change), exposing a stable
 * loading/error/data shape plus a manual `reload`. All service calls are
 * wrapped so a thrown `AppError` becomes a friendly message.
 */
export function useAsync<T>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;

    const run = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const data = await loader();
        if (active) setState({ data, loading: false, error: null });
      } catch (error) {
        if (active) setState({ data: null, loading: false, error: toUserMessage(error) });
      }
    };

    void run();
    return () => {
      active = false;
    };
    // `loader` is intentionally excluded — callers pass `deps` to control when
    // the loader re-runs, and the loader closes over the latest render's values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return { ...state, reload };
}
