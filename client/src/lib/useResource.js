import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Loads data with loading and error state. `reload` refetches while keeping
 * the previous data visible; results from superseded requests are ignored.
 */
export function useResource(loader, deps = []) {
  const [state, setState] = useState({
    data: undefined,
    error: null,
    loading: true,
  });

  const requestId = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(loader, deps);

  const reload = useCallback(async () => {
    const id = ++requestId.current;

    setState((previous) => ({ ...previous, loading: true, error: null }));

    try {
      const data = await load();

      if (id === requestId.current) {
        setState({ data, error: null, loading: false });
      }

      return data;
    } catch (error) {
      if (id === requestId.current) {
        setState((previous) => ({ ...previous, error, loading: false }));
      }

      return undefined;
    }
  }, [load]);

  useEffect(() => {
    reload();

    return () => {
      // Invalidate in-flight requests when deps change or on unmount.
      requestId.current += 1;
    };
  }, [reload]);

  return { ...state, reload };
}
