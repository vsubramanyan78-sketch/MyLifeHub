import React, { useState } from 'react';
import {
  Settings,
  User,
  Globe,
  Clock,
  DollarSign,
  Download,
  Database,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Sun,
  Moon,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { useTheme } from '../../../context/ThemeContext';
import { SUPPORTED_CURRENCIES } from '../../../lib/currency';

export const SettingsView: React.FC = () => {
  const { profile, updateProfileData, logout, user } = useAuth();
  const { exportAllData, seedDemoData } = useData();
  const { theme, toggleTheme } = useTheme();

  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [preferredCurrency, setPreferredCurrency] = useState(
    profile?.preferredCurrency || 'INR'
  );
  const [country, setCountry] = useState(profile?.country || 'India');
  const [timezone, setTimezone] = useState(profile?.timezone || 'Asia/Kolkata');
  const [monthlyBudget, setMonthlyBudget] = useState(
    profile?.monthlyBudget ? String(profile.monthlyBudget) : '50000'
  );

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [demoSuccess, setDemoSuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfileData({
      fullName,
      preferredCurrency,
      country,
      timezone,
      monthlyBudget: Number(monthlyBudget) || 50000,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    const jsonStr = await exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MyLifeHub_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setIsExporting(false);
  };

  const handleSeedDemo = async () => {
    if (
      window.confirm(
        'Generate sample documents, multi-currency transactions, assets, and groceries for testing?'
      )
    ) {
      await seedDemoData();
      setDemoSuccess(true);
      setTimeout(() => setDemoSuccess(false), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <span className="p-2 rounded-xl bg-slate-500/10 text-slate-500">
          <Settings className="w-5 h-5" />
        </span>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
            Hub Settings & Preferences
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure multi-currency rules, profile identity, data backup, and system appearance.
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-500 font-semibold flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>Preferences updated successfully!</span>
        </div>
      )}

      {demoSuccess && (
        <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-500 font-semibold flex items-center space-x-2">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>Demo dataset populated across DocuMind, SpendSense, FixFlow, and PantryPilot!</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form
        onSubmit={handleSavePreferences}
        className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
      >
        <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
          Profile & Regional Rules
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Account Email
            </label>
            <input
              type="email"
              disabled
              value={user?.email || 'guest@mylifehub.local'}
              className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Default Reporting Currency
            </label>
            <select
              value={preferredCurrency}
              onChange={(e) => setPreferredCurrency(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-2 text-xs"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} - {c.name} ({c.symbol.trim()})
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400 mt-1 block">
              All financial reports and charts will normalize transactions to this currency.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Monthly Spending Target
            </label>
            <input
              type="number"
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Used by the Automation Centre to monitor monthly cashflow thresholds.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Country
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Timezone
            </label>
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end pt-3">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02]"
          >
            Save Settings
          </button>
        </div>
      </form>

      {/* Theme & Display Mode */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Theme & UI Mode</h3>
          <p className="text-xs text-slate-400">
            Currently using <strong>{theme === 'dark' ? 'Dark Modern' : 'Light Clean'}</strong>{' '}
            mode.
          </p>
        </div>
        <button
          onClick={toggleTheme}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          <span>Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
        </button>
      </div>

      {/* Backup & Demo Seeder */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Export Data */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center space-x-2">
            <Download className="w-4 h-4 text-blue-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Data Portability & Export
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Export a full JSON archive containing all your stored documents, financial transactions, assets, pantry items, and reminders.
          </p>
          <button
            onClick={handleExportBackup}
            disabled={isExporting}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Packaging Archive...' : 'Download JSON Backup'}</span>
          </button>
        </div>

        {/* Demo Data Seeder */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Evaluation & Demo Mode
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Populate your account with realistic sample data (refrigerator invoice, laptop asset, grocery inventory, and utility transactions) to evaluate all cross-module workflows.
          </p>
          <button
            onClick={handleSeedDemo}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold text-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Demo Records</span>
          </button>
        </div>
      </div>

      {/* Account Session */}
      <div className="p-6 rounded-3xl bg-rose-500/5 border border-rose-500/20 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Account Session</h3>
          <p className="text-xs text-slate-400">Sign out or clear current session credentials.</p>
        </div>
        <button
          onClick={() => logout()}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-md transition-colors"
        >
          Sign Out of Hub
        </button>
      </div>
    </div>
  );
};
