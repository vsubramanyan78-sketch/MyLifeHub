import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { AuthModal } from './components/auth/AuthModal';

// Module Components
import { Dashboard } from './components/modules/dashboard/Dashboard';
import { DocuMind } from './components/modules/documents/DocuMind';
import { SpendSense } from './components/modules/finance/SpendSense';
import { FixFlow } from './components/modules/assets/FixFlow';
import { PantryPilot } from './components/modules/pantry/PantryPilot';
import { IntelligenceView } from './components/modules/intelligence/IntelligenceView';
import { RemindersView } from './components/modules/reminders/RemindersView';
import { SettingsView } from './components/modules/settings/SettingsView';
import { Home3DViewer } from './components/modules/home3d/Home3DViewer';
import { LocalServiceLocator } from './components/modules/maps/LocalServiceLocator';
import { VoiceInputModal } from './components/voice/VoiceInputModal';

// Quick Modals
import {
  FileText,
  DollarSign,
  Package,
  Layers,
  Calendar,
  X,
  Plus,
  Loader2,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import {
  SUPPORTED_CURRENCIES,
  formatCurrency,
} from './lib/currency';
import {
  TransactionCategory,
  TransactionType,
  AssetCategory,
  PantryCategory,
  PantryUnit,
  ReminderCategory,
  ReminderPriority,
} from './types';

const MainAppContent: React.FC = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const {
    addTransaction,
    addAsset,
    addPantryItem,
    addReminder,
    accounts,
  } = useData();

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // Quick Action Modal State
  const [quickAction, setQuickAction] = useState<
    'expense' | 'document' | 'asset' | 'grocery' | 'reminder' | null
  >(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);

  // Quick Expense fields & AI categorization state
  const [qExpenseDesc, setQExpenseDesc] = useState('');
  const [qExpenseAmount, setQExpenseAmount] = useState('');
  const [qExpenseCat, setQExpenseCat] = useState<TransactionCategory>('Food');
  const [qExpenseAcc, setQExpenseAcc] = useState(accounts[0]?.id || '');
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [aiRationale, setAiRationale] = useState<string | null>(null);

  // Quick Asset fields
  const [qAssetName, setQAssetName] = useState('');
  const [qAssetCat, setQAssetCat] = useState<AssetCategory>('Home Appliances');
  const [qAssetBrand, setQAssetBrand] = useState('');
  const [qAssetPrice, setQAssetPrice] = useState('');

  // Quick Grocery fields
  const [qGroceryName, setQGroceryName] = useState('');
  const [qGroceryCat, setQGroceryCat] = useState<PantryCategory>('Vegetables');
  const [qGroceryQty, setQGroceryQty] = useState('1');
  const [qGroceryUnit, setQGroceryUnit] = useState<PantryUnit>('kg');

  // Quick Reminder fields
  const [qRemTitle, setQRemTitle] = useState('');
  const [qRemDate, setQRemDate] = useState(new Date().toISOString().split('T')[0]);
  const [qRemCat, setQRemCat] = useState<ReminderCategory>('General');
  const [qRemIsRecurring, setQRemIsRecurring] = useState<boolean>(false);
  const [qRemFrequency, setQRemFrequency] = useState<'Daily' | 'Weekly' | 'Monthly'>('Weekly');

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-xl animate-pulse mb-3">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <span className="text-sm font-semibold text-slate-300">Launching MyLifeHub...</span>
      </div>
    );
  }

  // If user is not authenticated or hasn't finished onboarding, show Auth modal
  const showAuthModal = !user || !profile?.isOnboarded;

  const handleSelectSearchItem = (type: string, id: string) => {
    setCurrentTab(type);
    if (type === 'documents') {
      setSelectedDocId(id);
    }
  };

  // Helper to categorize description using Gemini AI API
  const categorizeWithGemini = async (desc: string): Promise<TransactionCategory | null> => {
    if (!desc.trim()) return null;
    try {
      setIsCategorizing(true);
      const res = await fetch('/api/gemini/categorize-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: desc }),
      });
      const data = await res.json();
      if (data.success && data.category) {
        setQExpenseCat(data.category);
        setAiRationale(data.rationale || `Categorized as ${data.category}`);
        return data.category;
      }
    } catch (err) {
      console.warn('Gemini categorization fetch failed:', err);
    } finally {
      setIsCategorizing(false);
    }
    return null;
  };

  const handleQuickAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qExpenseDesc || !qExpenseAmount) return;

    // Enhance: Call Gemini AI API to analyze description and determine appropriate category automatically
    let finalCategory = qExpenseCat;
    try {
      setIsCategorizing(true);
      const aiSuggested = await categorizeWithGemini(qExpenseDesc);
      if (aiSuggested) {
        finalCategory = aiSuggested;
      }
    } catch (err) {
      console.warn('Gemini auto-categorize failed in handleQuickAddExpense:', err);
    } finally {
      setIsCategorizing(false);
    }

    await addTransaction({
      description: qExpenseDesc,
      amount: Number(qExpenseAmount),
      currency: profile?.preferredCurrency || 'INR',
      type: 'expense',
      category: finalCategory,
      date: new Date().toISOString().split('T')[0],
      accountId: qExpenseAcc || accounts[0]?.id || 'default_acc',
      accountName: accounts.find((a) => a.id === qExpenseAcc)?.name || 'Primary Wallet',
      sourceModule: 'SpendSense',
    });
    setQuickAction(null);
    setQExpenseDesc('');
    setQExpenseAmount('');
    setAiRationale(null);
  };

  const handleQuickAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qAssetName) return;
    await addAsset({
      name: qAssetName,
      category: qAssetCat,
      brand: qAssetBrand,
      purchasePrice: qAssetPrice ? Number(qAssetPrice) : undefined,
      currency: profile?.preferredCurrency || 'INR',
      condition: 'Good',
    });
    setQuickAction(null);
    setQAssetName('');
    setQAssetBrand('');
    setQAssetPrice('');
  };

  const handleQuickAddGrocery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qGroceryName) return;
    await addPantryItem({
      name: qGroceryName,
      category: qGroceryCat,
      quantity: Number(qGroceryQty) || 1,
      unit: qGroceryUnit,
      lowStockThreshold: 1,
      purchaseDate: new Date().toISOString().split('T')[0],
    });
    setQuickAction(null);
    setQGroceryName('');
    setQGroceryQty('1');
  };

  const handleQuickAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qRemTitle) return;
    await addReminder({
      title: qRemTitle,
      dueDate: qRemDate,
      category: qRemCat,
      priority: 'medium',
      status: 'pending',
      isRecurring: qRemIsRecurring,
      frequency: qRemIsRecurring ? qRemFrequency : undefined,
    });
    setQuickAction(null);
    setQRemTitle('');
    setQRemIsRecurring(false);
    setQRemFrequency('Weekly');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-blue-500 selection:text-white">
      {/* Auth & Onboarding Modal */}
      <AuthModal isOpen={showAuthModal} />

      {/* Main Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          onOpenQuickAction={(action) => {
            if (action === 'document') {
              setCurrentTab('documents');
            } else {
              setQuickAction(action);
            }
          }}
          onOpenAI={() => setCurrentTab('intelligence')}
          onOpenVoice={() => setIsVoiceModalOpen(true)}
          onSelectSearchItem={handleSelectSearchItem}
        />

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {currentTab === 'dashboard' && (
            <Dashboard
              onNavigate={(tab) => setCurrentTab(tab)}
              onOpenQuickAction={(action) => {
                if (action === 'document') setCurrentTab('documents');
                else setQuickAction(action);
              }}
            />
          )}

          {currentTab === 'documents' && <DocuMind initialSelectedId={selectedDocId} />}

          {currentTab === 'finances' && <SpendSense />}

          {currentTab === 'assets' && <FixFlow />}

          {currentTab === 'home3d' && (
            <Home3DViewer onServiceAsset={() => setCurrentTab('assets')} />
          )}

          {currentTab === 'maps' && <LocalServiceLocator />}

          {currentTab === 'pantry' && <PantryPilot />}

          {currentTab === 'intelligence' && <IntelligenceView />}

          {currentTab === 'reminders' && <RemindersView />}

          {currentTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Voice Input Modal */}
      <VoiceInputModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onTranscriptReady={(transcript, action) => {
          if (action === 'expense') {
            setQExpenseDesc(transcript);
            setQuickAction('expense');
          } else {
            setCurrentTab('intelligence');
          }
        }}
      />

      {/* Quick Action Dialogs */}
      {quickAction === 'expense' && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-1.5">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <span>Quick Record Expense</span>
              </h3>
              <button
                onClick={() => setQuickAction(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddExpense} className="space-y-3 mt-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Description *
                  </label>
                  <button
                    type="button"
                    onClick={() => categorizeWithGemini(qExpenseDesc)}
                    disabled={isCategorizing || !qExpenseDesc.trim()}
                    className="text-[11px] font-medium text-indigo-500 hover:text-indigo-400 flex items-center space-x-1 disabled:opacity-40"
                    title="Auto-categorize with Gemini AI"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{isCategorizing ? 'Analyzing...' : 'AI Categorize'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={qExpenseDesc}
                  onChange={(e) => setQExpenseDesc(e.target.value)}
                  onBlur={() => {
                    if (qExpenseDesc.trim().length > 2) {
                      categorizeWithGemini(qExpenseDesc);
                    }
                  }}
                  placeholder="e.g. Starbucks Latte, Uber to Airport, Supermarket Grocery"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                />
                {aiRationale && (
                  <div className="mt-1.5 p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[10px] text-indigo-400 flex items-center space-x-1">
                    <Sparkles className="w-3 h-3 shrink-0" />
                    <span className="truncate">{aiRationale}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount ({profile?.preferredCurrency || 'INR'}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={qExpenseAmount}
                    onChange={(e) => setQExpenseAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category {isCategorizing && '(AI Suggesting...)'}
                  </label>
                  <select
                    value={qExpenseCat}
                    onChange={(e) => setQExpenseCat(e.target.value as TransactionCategory)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-2 text-xs"
                  >
                    <option value="Food">Food</option>
                    <option value="Groceries">Groceries</option>
                    <option value="Transportation">Transportation</option>
                    <option value="Housing">Housing</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Education">Education</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Travel">Travel</option>
                    <option value="Household Maintenance">Household</option>
                    <option value="Subscriptions">Subscriptions</option>
                    <option value="Salary">Salary</option>
                    <option value="Investments">Investments</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Account
                </label>
                <select
                  value={qExpenseAcc}
                  onChange={(e) => setQExpenseAcc(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-2 text-xs"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickAction(null)}
                  className="px-3 py-1.5 text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-blue-600 text-white font-semibold text-xs shadow-md"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {quickAction === 'asset' && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-1.5">
                <Package className="w-4 h-4 text-violet-500" />
                <span>Quick Register Asset</span>
              </h3>
              <button
                onClick={() => setQuickAction(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddAsset} className="space-y-3 mt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Asset Name *
                </label>
                <input
                  type="text"
                  required
                  value={qAssetName}
                  onChange={(e) => setQAssetName(e.target.value)}
                  placeholder="e.g. Dyson Vacuum, Dell Monitor"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={qAssetCat}
                    onChange={(e) => setQAssetCat(e.target.value as AssetCategory)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-2 text-xs"
                  >
                    <option value="Home Appliances">Appliances</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Vehicles">Vehicles</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={qAssetBrand}
                    onChange={(e) => setQAssetBrand(e.target.value)}
                    placeholder="e.g. Sony"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Purchase Price
                </label>
                <input
                  type="number"
                  value={qAssetPrice}
                  onChange={(e) => setQAssetPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickAction(null)}
                  className="px-3 py-1.5 text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-blue-600 text-white font-semibold text-xs shadow-md"
                >
                  Save Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {quickAction === 'grocery' && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-amber-500" />
                <span>Quick Add Grocery Stock</span>
              </h3>
              <button
                onClick={() => setQuickAction(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddGrocery} className="space-y-3 mt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={qGroceryName}
                  onChange={(e) => setQGroceryName(e.target.value)}
                  placeholder="e.g. Greek Yogurt, Oats"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={qGroceryCat}
                    onChange={(e) => setQGroceryCat(e.target.value as PantryCategory)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-2 text-xs"
                  >
                    <option value="Dairy">Dairy</option>
                    <option value="Vegetables">Vegetables</option>
                    <option value="Fruits">Fruits</option>
                    <option value="Grains">Grains</option>
                    <option value="Meat and Eggs">Meat & Eggs</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Quantity & Unit
                  </label>
                  <div className="flex space-x-1">
                    <input
                      type="number"
                      step="0.1"
                      value={qGroceryQty}
                      onChange={(e) => setQGroceryQty(e.target.value)}
                      className="w-16 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-2 text-xs"
                    />
                    <select
                      value={qGroceryUnit}
                      onChange={(e) => setQGroceryUnit(e.target.value as PantryUnit)}
                      className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-1 text-xs"
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="litre">litre</option>
                      <option value="pieces">pcs</option>
                      <option value="packets">pkts</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickAction(null)}
                  className="px-3 py-1.5 text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-blue-600 text-white font-semibold text-xs shadow-md"
                >
                  Save Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {quickAction === 'reminder' && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-1.5">
                <Calendar className="w-4 h-4 text-rose-500" />
                <span>Quick Create Reminder</span>
              </h3>
              <button
                onClick={() => setQuickAction(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddReminder} className="space-y-3 mt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reminder Title *
                </label>
                <input
                  type="text"
                  required
                  value={qRemTitle}
                  onChange={(e) => setQRemTitle(e.target.value)}
                  placeholder="e.g. Pay Electricity Bill, Renew Passport"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={qRemDate}
                    onChange={(e) => setQRemDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={qRemCat}
                    onChange={(e) => setQRemCat(e.target.value as ReminderCategory)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-2 text-xs"
                  >
                    <option value="Bill Payment">Bill Payment</option>
                    <option value="Document Expiry">Document</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              {/* Recurring Setting */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <RotateCcw className="w-3.5 h-3.5 text-indigo-500" />
                    <div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block leading-tight">
                        Is Recurring
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Automatically repeat this reminder
                      </span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={qRemIsRecurring}
                      onChange={(e) => setQRemIsRecurring(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {qRemIsRecurring && (
                  <div className="mt-2.5 pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 animate-in fade-in">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Frequency
                    </label>
                    <select
                      value={qRemFrequency}
                      onChange={(e) => setQRemFrequency(e.target.value as 'Daily' | 'Weekly' | 'Monthly')}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
                    >
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setQuickAction(null);
                    setQRemIsRecurring(false);
                  }}
                  className="px-3 py-1.5 text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-blue-600 text-white font-semibold text-xs shadow-md"
                >
                  Save Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <MainAppContent />
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
