import React, { useState } from 'react';
import {
  Sparkles,
  Mail,
  Lock,
  User,
  ArrowRight,
  Globe,
  Clock,
  DollarSign,
  CheckCircle,
  Shield,
  FileText,
  Wallet,
  Wrench,
  ShoppingBag,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SUPPORTED_CURRENCIES } from '../../lib/currency';

interface AuthModalProps {
  isOpen: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen }) => {
  const {
    user,
    profile,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    loginAsGuest,
    resetPassword,
    completeOnboarding,
  } = useAuth();

  const [mode, setMode] = useState<'welcome' | 'signin' | 'register' | 'forgot' | 'onboarding'>(
    user && !profile?.isOnboarded ? 'onboarding' : 'welcome'
  );

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Onboarding state
  const [onboardName, setOnboardName] = useState(profile?.fullName || '');
  const [currency, setCurrency] = useState('INR');
  const [country, setCountry] = useState('India');
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
  );
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');
  const [monthlyBudget, setMonthlyBudget] = useState('50000');

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginWithEmail(email, password);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await registerWithEmail(email, password, name);
      setMode('onboarding');
    } catch (err: any) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      await resetPassword(email);
      setSuccessMsg('Password reset link sent to your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await completeOnboarding({
        fullName: onboardName || name || 'Member',
        preferredCurrency: currency,
        country,
        timezone,
        dateFormat,
        monthlyBudget: Number(monthlyBudget) || 50000,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save preferences.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-blue-500/25 ring-2 ring-white/10 mb-3">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            MyLifeHub
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Your Personal Life. One Intelligent Hub.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 font-medium">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-500 font-medium">
            {successMsg}
          </div>
        )}

        {/* 1. WELCOME SCREEN */}
        {mode === 'welcome' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2.5 my-4">
              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex flex-col items-center text-center">
                <FileText className="w-5 h-5 text-blue-500 mb-1" />
                <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                  DocuMind
                </span>
                <span className="text-[10px] text-slate-400">Intelligent Docs & OCR</span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center text-center">
                <Wallet className="w-5 h-5 text-emerald-500 mb-1" />
                <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                  SpendSense
                </span>
                <span className="text-[10px] text-slate-400">Multi-Currency Finances</span>
              </div>
              <div className="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex flex-col items-center text-center">
                <Wrench className="w-5 h-5 text-violet-500 mb-1" />
                <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                  FixFlow
                </span>
                <span className="text-[10px] text-slate-400">Assets & Maintenance</span>
              </div>
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col items-center text-center">
                <ShoppingBag className="w-5 h-5 text-amber-500 mb-1" />
                <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                  PantryPilot
                </span>
                <span className="text-[10px] text-slate-400">Groceries & AI Chef</span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setMode('signin')}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 transition-all"
              >
                Sign In to Your Hub
              </button>
              <button
                onClick={() => setMode('register')}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium text-sm transition-all"
              >
                Create New Account
              </button>
              <button
                onClick={async () => {
                  setLoading(true);
                  try {
                    await loginAsGuest();
                  } catch (err: any) {
                    setError(err.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full py-2 px-4 rounded-xl text-xs text-slate-400 hover:text-blue-400 hover:underline transition-all flex items-center justify-center space-x-1"
              >
                <span>Instant Evaluation (Guest Demo Access)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* 2. SIGN IN */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-[11px] text-blue-500 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md transition-all"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>

            <div className="flex items-center my-2">
              <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
              <span className="px-2 text-[10px] text-slate-400 uppercase">or</span>
              <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
            </div>

            <button
              type="button"
              onClick={loginWithGoogle}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center justify-center space-x-2 transition-colors"
            >
              <span>Continue with Google</span>
            </button>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setMode('welcome')}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className="text-xs text-blue-500 font-medium hover:underline"
              >
                Create account
              </button>
            </div>
          </form>
        )}

        {/* 3. REGISTER */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="V. Subramanyan"
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md transition-all"
            >
              {loading ? 'Creating Account...' : 'Continue to Preferences'}
            </button>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setMode('welcome')}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="text-xs text-blue-500 font-medium hover:underline"
              >
                Already have an account? Sign in
              </button>
            </div>
          </form>
        )}

        {/* 4. FORGOT PASSWORD */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-4">
            <p className="text-xs text-slate-400">
              Enter your email address and we'll send a secure password reset link.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md transition-all"
            >
              {loading ? 'Sending Link...' : 'Send Reset Link'}
            </button>

            <button
              type="button"
              onClick={() => setMode('signin')}
              className="w-full text-center text-xs text-slate-400 hover:underline"
            >
              Return to Sign In
            </button>
          </form>
        )}

        {/* 5. ONBOARDING WIZARD */}
        {mode === 'onboarding' && (
          <form onSubmit={handleOnboardingSubmit} className="space-y-3.5">
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>Let's configure your currency, country & life hub preferences.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Your Full Name
              </label>
              <input
                type="text"
                required
                value={onboardName}
                onChange={(e) => setOnboardName(e.target.value)}
                placeholder="e.g. V. Subramanyan"
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Default Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol.trim()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Timezone
                </label>
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Monthly Budget
                </label>
                <input
                  type="number"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(e.target.value)}
                  placeholder="50000"
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-indigo-500/25 transition-all mt-2"
            >
              {loading ? 'Saving Setup...' : 'Complete Setup & Launch MyLifeHub'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
