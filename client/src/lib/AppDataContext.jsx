import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import * as api from './api.js';

const AppDataContext = createContext(null);

/**
 * App-wide counters shown in navigation (pending AI suggestions).
 * Refreshes on every route change; pages call `refreshCounts()` after
 * accepting, dismissing or generating suggestions.
 */
export function AppDataProvider({ children }) {
  const location = useLocation();
  const [pendingSuggestions, setPendingSuggestions] = useState(null);

  const refreshCounts = useCallback(async () => {
    try {
      const suggestions = await api.fetchSuggestions('pending');
      setPendingSuggestions(suggestions.length);
    } catch {
      // Navigation badges are best-effort.
    }
  }, []);

  useEffect(() => {
    refreshCounts();
  }, [location.pathname, refreshCounts]);

  const value = useMemo(
    () => ({ pendingSuggestions, refreshCounts }),
    [pendingSuggestions, refreshCounts],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  return useContext(AppDataContext) ?? { pendingSuggestions: null, refreshCounts: () => {} };
}
