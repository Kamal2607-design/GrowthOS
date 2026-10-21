import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import * as api from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setUser(await api.fetchCurrentUser());
    } catch (cause) {
      setError(cause);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signIn = useCallback(async (email, password) => {
    setUser(await api.login(email, password));
  }, []);

  const signUp = useCallback(async ({ email, password, name }) => {
    await api.register({ email, password, name });
    setUser(await api.login(email, password));
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading: user === undefined,
      error,
      refresh,
      signIn,
      signUp,
      signOut,
    }),
    [user, error, refresh, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
