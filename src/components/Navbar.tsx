import { useState } from 'react';
import { LogOut, Menu, X } from 'lucide-react';
import type { AuthUser } from '../lib/types';

interface NavbarProps {
  currentPath: string;
  user: AuthUser | null;
  onNavigate: (path: string) => void;
  onLogout: () => Promise<void>;
}

export function Navbar({ currentPath, user, onNavigate, onLogout }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: { label: string; path: string }[] = user
    ? [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Configure', path: '/configure' },
        { label: 'History', path: '/history' },
      ]
    : [
        { label: 'Features', path: '/#features' },
        { label: 'How It Works', path: '/#how-it-works' },
        { label: 'Sign In', path: '/login' },
      ];

  const handleLink = (e: React.MouseEvent, target: string) => {
    e.preventDefault();
    setMobileOpen(false);
    if (target.startsWith('/#')) {
      const id = target.slice(2);
      if (currentPath !== '/') {
        onNavigate('/');
        setTimeout(() => {
          document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        }, 80);
      } else {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }
    onNavigate(target);
  };

  const isLanding = currentPath === '/';

  return (
    <header
      className={`sticky top-0 z-30 border-b backdrop-blur-md transition-colors ${
        isLanding && !user
          ? 'border-slate-800/80 bg-[#0B1437]/95 text-white'
          : 'border-slate-200 bg-white/95 text-slate-900'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="/"
          onClick={(e) => handleLink(e, '/')}
          className="font-display text-lg font-bold tracking-tight whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          PrepBot<span className="text-blue-500">.</span>
        </a>

        {/* Zone 2: Concise single-line navigation links */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-7">
          {navItems.map((item) => {
            const active = currentPath === item.path;
            return (
              <a
                key={item.path}
                href={item.path}
                onClick={(e) => handleLink(e, item.path)}
                className={`border-b-2 py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isLanding && !user
                    ? active
                      ? 'border-blue-400 text-white'
                      : 'border-transparent text-slate-300 hover:text-white'
                    : active
                      ? 'border-blue-600 text-slate-950'
                      : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-950'
                }`}
              >
                {item.label}
              </a>
            );
          })}
          {user && (
            <button
              type="button"
              onClick={onLogout}
              className={`inline-flex items-center gap-1.5 border-b-2 border-transparent py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isLanding
                  ? 'text-slate-300 hover:text-white'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Log Out
            </button>
          )}
        </nav>

        {/* Zone 3: Primary CTA + mobile menu toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onNavigate(user ? '/configure' : '/register');
            }}
            className="hidden sm:inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {user ? 'New Interview' : 'Start Practising'}
          </button>

          <button
            type="button"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((prev) => !prev)}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border md:hidden cursor-pointer ${
              isLanding && !user
                ? 'border-slate-700 text-slate-200 hover:bg-slate-800'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <nav
          aria-label="Mobile navigation"
          className={`border-t px-4 py-3 md:hidden ${
            isLanding && !user
              ? 'border-slate-800 bg-[#0B1437] text-slate-100'
              : 'border-slate-200 bg-white text-slate-800'
          }`}
        >
          <div className="flex flex-col gap-1">
            {navItems.map((item) => (
              <a
                key={item.path}
                href={item.path}
                onClick={(e) => handleLink(e, item.path)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-blue-600/10"
              >
                {item.label}
              </a>
            ))}
            {user && (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  void onLogout();
                }}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 cursor-pointer"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Log Out
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onNavigate(user ? '/configure' : '/register');
              }}
              className="mt-2 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 cursor-pointer"
            >
              {user ? 'New Interview' : 'Start Practising'}
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
