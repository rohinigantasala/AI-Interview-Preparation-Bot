import { useState } from 'react';
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { loginAccount, registerAccount } from '../lib/api';
import type { AuthUser } from '../lib/types';

interface AuthPagesProps {
  mode: 'login' | 'register';
  onAuthSuccess: (user: AuthUser) => void;
  onNavigate: (path: string) => void;
}

export function AuthPages({ mode, onAuthSuccess, onNavigate }: AuthPagesProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRegister = mode === 'register';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isRegister) {
      if (fullName.trim().length < 2) {
        setError('Please enter your full name.');
        return;
      }
      if (!email.trim()) {
        setError('Please enter your email address.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    } else {
      if (!email.trim() || !password) {
        setError('Please enter both your email address and password.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = isRegister
        ? await registerAccount({ fullName, email, password, confirmPassword })
        : await loginAccount({ email, password });
      onAuthSuccess(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto grid min-h-[calc(100vh-65px)] max-w-6xl grid-cols-1 items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-12">
      {/* Left: Brand Coaching Panel */}
      <div className="hidden rounded-3xl bg-gradient-to-br from-[#0B1437] via-[#13266B] to-[#3B1E7A] p-10 text-white shadow-xl lg:col-span-6 lg:block">
        <div className="flex items-center gap-4">
          <img
            src="/src/assets/images/ai_interviewer_avatar_1794739756686.jpg"
            alt="Elena Vance AI interviewer"
            referrerPolicy="no-referrer"
            className="h-14 w-14 rounded-full object-cover ring-2 ring-blue-400/50"
          />
          <div>
            <p className="font-display text-base font-bold">Elena Vance</p>
            <p className="text-xs text-blue-200">AI Interview Coach</p>
          </div>
        </div>

        <h2 className="mt-8 font-display text-3xl font-bold leading-tight text-balance">
          Speak clearly, sharpen your structure, and track every improvement.
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-slate-200">
          Your interview sessions, voice transcripts, Gemini AI evaluations, and progress charts are saved securely to your personal account.
        </p>

        <div className="mt-8 space-y-3 border-t border-white/15 pt-6 text-sm text-blue-100">
          <p>1. Live spoken voice interviews &amp; text practice</p>
          <p>2. 10-point AI scoring with stronger answer examples</p>
          <p>3. Private history and weak-area targeting</p>
        </div>
      </div>

      {/* Right: Auth Form Card */}
      <div className="lg:col-span-6">
        <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-950">
            {isRegister ? 'Create your PrepBot account' : 'Welcome back'}
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            {isRegister
              ? 'Start practising one-on-one AI voice and technical interviews.'
              : 'Sign in to access your dashboard and interview history.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            {isRegister && (
              <div>
                <label htmlFor="auth-fullname" className="block text-sm font-medium text-slate-800">
                  Full Name
                </label>
                <div className="relative mt-1.5">
                  <User className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                  <input
                    id="auth-fullname"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Priya Nair"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-4 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-sm font-medium text-slate-800">
                Email Address
              </label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@university.edu"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-4 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-sm font-medium text-slate-800">
                Password
              </label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-11 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute top-2.5 right-3 rounded p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {isRegister && (
              <div>
                <label htmlFor="auth-confirm" className="block text-sm font-medium text-slate-800">
                  Confirm Password
                </label>
                <div className="relative mt-1.5">
                  <Lock className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                  <input
                    id="auth-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-11 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                    onClick={() => setShowConfirm((prev) => !prev)}
                    className="absolute top-2.5 right-3 rounded p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div
                role="alert"
                data-testid="auth-error"
                className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
            >
              {submitting
                ? isRegister
                  ? 'Creating Account...'
                  : 'Signing In...'
                : isRegister
                  ? 'Create Account'
                  : 'Sign In'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            {isRegister ? 'Already have an account?' : 'New to PrepBot?'}{' '}
            <button
              type="button"
              onClick={() => onNavigate(isRegister ? '/login' : '/register')}
              className="font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              {isRegister ? 'Sign In' : 'Create an Account'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
