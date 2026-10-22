import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { AuthProvider, useAuth } from './auth/AuthContext.jsx';
import { ThemeProvider } from './theme/ThemeContext.jsx';
import AppShell from './components/AppShell.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { LoadingBlock } from './components/ui.jsx';
import SignIn from './pages/SignIn.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Today from './pages/Today.jsx';
import Planner from './pages/Planner.jsx';
import Goals from './pages/Goals.jsx';
import Reflect from './pages/Reflect.jsx';
import Library from './pages/Library.jsx';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <LoadingBlock label="Checking your session" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignIn />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="today" element={<Today />} />
        <Route path="planner" element={<Planner />} />
        <Route path="goals" element={<Goals />} />
        <Route path="reflect" element={<Reflect />} />
        <Route path="library" element={<Library />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
