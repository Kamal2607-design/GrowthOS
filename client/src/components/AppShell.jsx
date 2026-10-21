import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Archive,
  LayoutDashboard,
  LogOut,
  Moon,
  PenLine,
  Sparkles,
  Sprout,
  Sun,
  SunMedium,
  Target,
} from 'lucide-react';

import { useAuth } from '../auth/AuthContext.jsx';
import { AppDataProvider, useAppData } from '../lib/AppDataContext.jsx';
import { useTheme } from '../theme/ThemeContext.jsx';
import { IconButton, cn } from './ui.jsx';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard, end: true },
  { to: '/today', label: 'Today', icon: Sun },
  { to: '/planner', label: 'AI Planner', shortLabel: 'AI', icon: Sparkles, ai: true },
  { to: '/goals', label: 'Goals & vision', shortLabel: 'Goals', icon: Target },
  { to: '/reflect', label: 'Reflect', icon: PenLine },
  { to: '/library', label: 'Library', icon: Archive },
];

const MOBILE_TABS = ['/', '/today', '/planner', '/goals', '/reflect'];

export function Logo({ className }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span className="ai-gradient grid size-9 place-items-center rounded-xl text-white shadow-[0_6px_16px_-6px_rgb(124_58_237/0.7)]">
        <Sprout aria-hidden="true" className="size-5" strokeWidth={2} />
      </span>
      <span className="font-display text-xl font-semibold tracking-tight">GrowthOS</span>
    </span>
  );
}

function ThemeToggle({ className }) {
  const { resolved, toggle } = useTheme();
  const dark = resolved === 'dark';

  return (
    <IconButton
      label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={toggle}
      className={className}
    >
      {dark ? <SunMedium aria-hidden="true" className="size-5" /> : <Moon aria-hidden="true" className="size-5" />}
    </IconButton>
  );
}

function CountBadge({ count, className }) {
  if (!count) return null;

  return (
    <span
      className={cn(
        'ai-gradient inline-grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold leading-5 text-white',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

function Sidebar() {
  const { user, signOut } = useAuth();
  const { pendingSuggestions } = useAppData();

  return (
    <aside className="hidden md:sticky md:top-0 md:flex md:h-dvh md:w-64 md:flex-none md:flex-col md:gap-7 md:border-r md:border-line md:bg-surface/80 md:px-4 md:py-6 md:backdrop-blur">
      <Logo className="px-2" />
      <nav aria-label="Main" className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end, ai }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'group flex min-h-11 items-center gap-3 rounded-xl px-3 no-underline transition-colors',
                isActive
                  ? 'bg-brand-soft font-semibold text-brand-ink'
                  : 'text-ink-soft hover:bg-hover hover:text-ink',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'grid size-8 place-items-center rounded-lg transition-colors',
                    ai ? 'ai-gradient text-white' : isActive ? 'bg-surface text-brand-ink' : 'text-current',
                  )}
                >
                  <Icon aria-hidden="true" className="size-[18px]" strokeWidth={2} />
                </span>
                <span className="flex-1">{label}</span>
                {ai && (
                  <CountBadge
                    count={pendingSuggestions}
                    className="ml-auto"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-3 rounded-2xl border border-line bg-raised p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-col">
            <span className="text-xs text-muted">Signed in</span>
            <span className="truncate text-sm font-medium" title={user?.email}>
              {user?.name || user?.email}
            </span>
          </div>
          <ThemeToggle />
        </div>
        <button
          type="button"
          onClick={signOut}
          className="flex min-h-9 items-center gap-2 self-start rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink-soft hover:bg-hover"
        >
          <LogOut aria-hidden="true" className="size-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

function MobileHeader() {
  const { signOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line/60 bg-ground/85 px-4 pb-2 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur md:hidden">
      <Logo />
      <div className="flex items-center">
        <NavLink to="/library" aria-label="Library" className="grid size-11 place-items-center rounded-xl text-muted hover:bg-hover">
          <Archive aria-hidden="true" className="size-5" />
        </NavLink>
        <ThemeToggle />
        <IconButton label="Sign out" onClick={signOut}>
          <LogOut aria-hidden="true" className="size-5" />
        </IconButton>
      </div>
    </header>
  );
}

function MobileTabs() {
  const { pendingSuggestions } = useAppData();
  const items = NAV_ITEMS.filter((item) => MOBILE_TABS.includes(item.to));

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface/95 px-2 pb-[max(10px,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur md:hidden"
    >
      {items.map(({ to, label, shortLabel, icon: Icon, end, ai }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          aria-label={ai && pendingSuggestions ? `${label}, ${pendingSuggestions} pending suggestions` : label}
          className={({ isActive }) =>
            cn(
              'relative flex min-h-[54px] flex-col items-center justify-center gap-1 text-[11px] no-underline',
              isActive ? 'font-semibold text-brand-ink' : 'font-medium text-muted',
            )
          }
        >
          {ai ? (
            <span className="ai-gradient relative -mt-5 grid size-12 place-items-center rounded-2xl text-white shadow-[0_10px_22px_-8px_rgb(190_24_93/0.7)] ring-4 ring-surface">
              <Icon aria-hidden="true" className="size-[22px]" strokeWidth={2} />
              <CountBadge count={pendingSuggestions} className="absolute -right-2 -top-1.5 ring-2 ring-surface" />
            </span>
          ) : (
            <Icon aria-hidden="true" className="size-[22px]" strokeWidth={1.9} />
          )}
          {shortLabel ?? label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AppShell() {
  const location = useLocation();

  return (
    <AppDataProvider>
      <div className="min-h-dvh md:flex">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2"
        >
          Skip to content
        </a>

        <Sidebar />

        <div className="min-w-0 flex-1">
          <MobileHeader />
          <main
            id="main"
            key={location.pathname}
            className="mx-auto flex max-w-6xl animate-fade-up flex-col gap-6 px-4 pb-32 pt-5 md:px-10 md:pb-12 md:pt-8"
          >
            <Outlet />
          </main>
        </div>

        <MobileTabs />
      </div>
    </AppDataProvider>
  );
}
