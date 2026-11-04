import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Plus,
  Bell,
  Sun,
  Moon,
  Sparkles,
  FileText,
  DollarSign,
  Package,
  Calendar,
  Layers,
  CheckCircle,
  AlertTriangle,
  X,
  ExternalLink,
  Mic,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { SUPPORTED_CURRENCIES } from '../../lib/currency';

interface NavbarProps {
  onOpenQuickAction: (action: 'expense' | 'document' | 'asset' | 'grocery' | 'reminder') => void;
  onOpenAI: () => void;
  onSelectSearchItem: (type: string, id: string) => void;
  onOpenVoice?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenQuickAction,
  onOpenAI,
  onSelectSearchItem,
  onOpenVoice,
}) => {
  const { profile, updateProfileData } = useAuth();
  const { documents, transactions, assets, pantryItems, reminders } = useData();
  const { theme, toggleTheme } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const addMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setIsAddMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter search across all modules
  const searchResults = searchQuery.trim()
    ? {
        documents: documents.filter((d) =>
          d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (d.issuingOrg && d.issuingOrg.toLowerCase().includes(searchQuery.toLowerCase()))
        ).slice(0, 3),
        transactions: transactions.filter((t) =>
          t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.category.toLowerCase().includes(searchQuery.toLowerCase())
        ).slice(0, 3),
        assets: assets.filter((a) =>
          a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (a.brand && a.brand.toLowerCase().includes(searchQuery.toLowerCase()))
        ).slice(0, 3),
        pantry: pantryItems.filter((p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase())
        ).slice(0, 3),
      }
    : null;

  const totalResults = searchResults
    ? searchResults.documents.length +
      searchResults.transactions.length +
      searchResults.assets.length +
      searchResults.pantry.length
    : 0;

  // Active alerts
  const pendingReminders = reminders.filter((r) => r.status === 'pending');
  const lowStockPantry = pantryItems.filter((p) => p.quantity <= p.lowStockThreshold);
  const totalNotifications = pendingReminders.length + lowStockPantry.length;

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 md:px-6 flex items-center justify-between z-20 sticky top-0 transition-colors">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md" ref={searchRef}>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search documents, expenses, assets, pantry..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            className="w-full bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 text-xs md:text-sm pl-10 pr-8 py-2 rounded-xl border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setIsSearchOpen(false);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {isSearchOpen && searchQuery.trim() && (
          <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 max-h-96 overflow-y-auto z-50">
            {totalResults === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No matching records found for "{searchQuery}"
              </div>
            ) : (
              <div className="space-y-3">
                {searchResults?.documents.length ? (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                      Documents ({searchResults.documents.length})
                    </span>
                    {searchResults.documents.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => {
                          onSelectSearchItem('documents', d.id);
                          setIsSearchOpen(false);
                          setSearchQuery('');
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 flex items-center justify-between text-xs transition-colors"
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {d.title}
                        </span>
                        <span className="text-[10px] text-blue-500 ml-2">{d.category}</span>
                      </button>
                    ))}
                  </div>
                ) : null}

                {searchResults?.transactions.length ? (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                      Finances ({searchResults.transactions.length})
                    </span>
                    {searchResults.transactions.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          onSelectSearchItem('finances', t.id);
                          setIsSearchOpen(false);
                          setSearchQuery('');
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 flex items-center justify-between text-xs transition-colors"
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {t.description}
                        </span>
                        <span className="text-[10px] text-slate-500 ml-2">
                          {t.currency} {t.amount}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}

                {searchResults?.assets.length ? (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                      Assets ({searchResults.assets.length})
                    </span>
                    {searchResults.assets.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => {
                          onSelectSearchItem('assets', a.id);
                          setIsSearchOpen(false);
                          setSearchQuery('');
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 flex items-center justify-between text-xs transition-colors"
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {a.name}
                        </span>
                        <span className="text-[10px] text-amber-500 ml-2">{a.category}</span>
                      </button>
                    ))}
                  </div>
                ) : null}

                {searchResults?.pantry.length ? (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                      Pantry ({searchResults.pantry.length})
                    </span>
                    {searchResults.pantry.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          onSelectSearchItem('pantry', p.id);
                          setIsSearchOpen(false);
                          setSearchQuery('');
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 flex items-center justify-between text-xs transition-colors"
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {p.name}
                        </span>
                        <span className="text-[10px] text-emerald-500 ml-2">
                          {p.quantity} {p.unit}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Action Icons & Controls */}
      <div className="flex items-center space-x-2 md:space-x-3 ml-4">
        {/* Preferred Currency Switcher */}
        <select
          value={profile?.preferredCurrency || 'INR'}
          onChange={(e) => updateProfileData({ preferredCurrency: e.target.value })}
          className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none cursor-pointer"
          title="Reporting Currency"
        >
          {SUPPORTED_CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} ({c.symbol.trim()})
            </option>
          ))}
        </select>

        {/* Quick Add Dropdown */}
        <div className="relative" ref={addMenuRef}>
          <button
            onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add</span>
          </button>

          {isAddMenuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <button
                onClick={() => {
                  setIsAddMenuOpen(false);
                  onOpenQuickAction('expense');
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <span>Record Expense</span>
              </button>
              <button
                onClick={() => {
                  setIsAddMenuOpen(false);
                  onOpenQuickAction('document');
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <FileText className="w-4 h-4 text-blue-500" />
                <span>Upload Document</span>
              </button>
              <button
                onClick={() => {
                  setIsAddMenuOpen(false);
                  onOpenQuickAction('asset');
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Package className="w-4 h-4 text-violet-500" />
                <span>Register Asset</span>
              </button>
              <button
                onClick={() => {
                  setIsAddMenuOpen(false);
                  onOpenQuickAction('grocery');
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Layers className="w-4 h-4 text-amber-500" />
                <span>Add Grocery Stock</span>
              </button>
              <button
                onClick={() => {
                  setIsAddMenuOpen(false);
                  onOpenQuickAction('reminder');
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Calendar className="w-4 h-4 text-rose-500" />
                <span>Create Reminder</span>
              </button>
            </div>
          )}
        </div>

        {/* Voice Command Button */}
        {onOpenVoice && (
          <button
            onClick={onOpenVoice}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-medium text-xs transition-all"
            title="Voice Command & Expense Recording"
          >
            <Mic className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden sm:inline">Voice</span>
          </button>
        )}

        {/* AI Assistant Button */}
        <button
          onClick={onOpenAI}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 hover:from-indigo-500/20 hover:to-pink-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 font-medium text-xs transition-all"
          title="Open MyLifeHub AI Assistant"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
          <span className="hidden sm:inline">Ask AI</span>
        </button>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Notifications & Alerts"
          >
            <Bell className="w-4 h-4" />
            {totalNotifications > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                  Notification Centre
                </span>
                <span className="text-[10px] text-slate-400">
                  {totalNotifications} active alert(s)
                </span>
              </div>

              <div className="py-2 space-y-2 max-h-72 overflow-y-auto">
                {totalNotifications === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400 flex flex-col items-center">
                    <CheckCircle className="w-5 h-5 text-emerald-500 mb-1" />
                    All clear! No pending alerts or overdue reminders.
                  </div>
                ) : (
                  <>
                    {pendingReminders.slice(0, 4).map((rem) => (
                      <div
                        key={rem.id}
                        className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-start space-x-2"
                      >
                        <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                            {rem.title}
                          </p>
                          <p className="text-[10px] text-slate-400">Due: {rem.dueDate}</p>
                        </div>
                      </div>
                    ))}

                    {lowStockPantry.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start space-x-2"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                            Low Stock: {item.name}
                          </p>
                          <p className="text-[10px] text-amber-500">
                            {item.quantity} {item.unit} remaining
                          </p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>
      </div>
    </header>
  );
};
