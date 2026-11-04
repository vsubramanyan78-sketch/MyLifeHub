import React, { useState, useRef } from 'react';
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  Upload,
  Calendar,
  CreditCard,
  Building,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  X,
  PieChart as PieIcon,
  Layers,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import {
  TransactionItem,
  TransactionType,
  TransactionCategory,
  AccountItem,
} from '../../../types';
import { formatCurrency, SUPPORTED_CURRENCIES, convertAmount } from '../../../lib/currency';

const CATEGORIES: TransactionCategory[] = [
  'Food',
  'Groceries',
  'Transportation',
  'Housing',
  'Utilities',
  'Healthcare',
  'Education',
  'Shopping',
  'Entertainment',
  'Travel',
  'Household Maintenance',
  'Subscriptions',
  'Salary',
  'Investments',
  'Other',
];

export const SpendSense: React.FC = () => {
  const { profile } = useAuth();
  const {
    transactions,
    accounts,
    budgets,
    addTransaction,
    deleteTransaction,
    addAccount,
    addBudget,
    deleteBudget,
  } = useData();

  const reportingCurrency = profile?.preferredCurrency || 'INR';

  // Sub-navigation tab
  const [activeTab, setActiveTab] = useState<'transactions' | 'accounts' | 'budgets' | 'analytics'>(
    'transactions'
  );

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');

  // Add Transaction Modal State
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [txDesc, setTxDesc] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txCurrency, setTxCurrency] = useState(reportingCurrency);
  const [txType, setTxType] = useState<TransactionType>('expense');
  const [txCategory, setTxCategory] = useState<TransactionCategory>('Food');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txAccountId, setTxAccountId] = useState(accounts[0]?.id || '');
  const [txNotes, setTxNotes] = useState('');

  // Add Account Modal
  const [isAddAccOpen, setIsAddAccOpen] = useState(false);
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<'bank' | 'card' | 'wallet' | 'cash'>('bank');
  const [accBalance, setAccBalance] = useState('');
  const [accCurrency, setAccCurrency] = useState(reportingCurrency);

  // Add Budget Modal
  const [isAddBudgetOpen, setIsAddBudgetOpen] = useState(false);
  const [budgetCategory, setBudgetCategory] = useState<TransactionCategory>('Groceries');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetThreshold, setBudgetThreshold] = useState('80');

  // CSV Import State
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvPreviewRows, setCsvPreviewRows] = useState<any[]>([]);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Handle Save Transaction
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txDesc || !txAmount) return;

    const targetAccount = accounts.find((a) => a.id === txAccountId) || accounts[0];

    await addTransaction({
      description: txDesc,
      amount: Number(txAmount),
      currency: txCurrency,
      type: txType,
      category: txCategory,
      date: txDate,
      accountId: targetAccount?.id || 'default_acc',
      accountName: targetAccount?.name || 'Primary Wallet',
      notes: txNotes,
      sourceModule: 'SpendSense',
    });

    setIsAddTxOpen(false);
    setTxDesc('');
    setTxAmount('');
    setTxNotes('');
  };

  // Handle Save Account
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName || !accBalance) return;
    await addAccount({
      name: accName,
      type: accType,
      currency: accCurrency,
      balance: Number(accBalance),
    });
    setIsAddAccOpen(false);
    setAccName('');
    setAccBalance('');
  };

  // Handle Save Budget
  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetAmount) return;
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    await addBudget({
      category: budgetCategory,
      amount: Number(budgetAmount),
      currency: reportingCurrency,
      month,
      thresholdPercent: Number(budgetThreshold) || 80,
    });
    setIsAddBudgetOpen(false);
    setBudgetAmount('');
  };

  // Parse CSV File for transactions
  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter((l) => l.trim().length > 0);
      if (lines.length <= 1) return;

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const parsed: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        if (cols.length >= 2) {
          const date = cols[0] || new Date().toISOString().split('T')[0];
          const desc = cols[1] || 'Imported Transaction';
          const amt = Math.abs(parseFloat(cols[2]) || 0);
          const type: TransactionType = (cols[3]?.toLowerCase() === 'income' ? 'income' : 'expense');
          const cat = (CATEGORIES.find((c) => c.toLowerCase() === cols[4]?.toLowerCase()) || 'Other') as TransactionCategory;

          parsed.push({ date, description: desc, amount: amt, type, category: cat });
        }
      }

      setCsvPreviewRows(parsed);
      setIsCsvModalOpen(true);
    };
    reader.readAsText(file);
    if (csvInputRef.current) csvInputRef.current.value = '';
  };

  // Commit CSV Import
  const handleConfirmCsvImport = async () => {
    for (const row of csvPreviewRows) {
      await addTransaction({
        description: row.description,
        amount: row.amount,
        currency: reportingCurrency,
        type: row.type,
        category: row.category,
        date: row.date,
        accountId: accounts[0]?.id || 'default_acc',
        accountName: accounts[0]?.name || 'Primary Wallet',
        sourceModule: 'SpendSense',
        notes: 'Imported via CSV file.',
      });
    }
    setCsvPreviewRows([]);
    setIsCsvModalOpen(false);
  };

  // Filter transactions
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesCat = filterCategory === 'all' || t.category === filterCategory;
    const matchesAcc = filterAccount === 'all' || t.accountId === filterAccount;
    return matchesSearch && matchesType && matchesCat && matchesAcc;
  });

  // Calculate totals
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.reportingAmount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.reportingAmount, 0);

  const netBalance = totalIncome - totalExpense;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Wallet className="w-5 h-5" />
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              SpendSense Finances
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Personal cashflow, multi-currency wallets, budget enforcement, and CSV statement imports.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <input
            type="file"
            ref={csvInputRef}
            onChange={handleCsvFile}
            accept=".csv"
            className="hidden"
          />
          <button
            onClick={() => csvInputRef.current?.click()}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={() => setIsAddTxOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Record Transaction</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
            Total Income
          </span>
          <div className="text-xl font-extrabold text-emerald-500">
            {formatCurrency(totalIncome, reportingCurrency)}
          </div>
          <span className="text-[10px] text-slate-400">All registered inflows</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
            Total Expenses
          </span>
          <div className="text-xl font-extrabold text-rose-500">
            {formatCurrency(totalExpense, reportingCurrency)}
          </div>
          <span className="text-[10px] text-slate-400">Outflows & maintenance costs</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
            Net Savings
          </span>
          <div
            className={`text-xl font-extrabold ${
              netBalance >= 0 ? 'text-blue-500' : 'text-rose-500'
            }`}
          >
            {formatCurrency(netBalance, reportingCurrency)}
          </div>
          <span className="text-[10px] text-slate-400">
            Reporting in {reportingCurrency}
          </span>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'transactions'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Transactions ({transactions.length})
        </button>
        <button
          onClick={() => setActiveTab('accounts')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'accounts'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Accounts & Wallets ({accounts.length})
        </button>
        <button
          onClick={() => setActiveTab('budgets')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'budgets'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Budgets & Alerts ({budgets.length})
        </button>
      </div>

      {/* TAB 1: TRANSACTIONS LIST & FILTERS */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div className="relative sm:col-span-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-white dark:bg-slate-800 text-xs px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="refund">Refund</option>
              <option value="transfer">Transfer</option>
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-white dark:bg-slate-800 text-xs px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Transactions Table */}
          {filteredTransactions.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
              No transactions found matching your criteria.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Description</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Account</th>
                    <th className="px-5 py-3">Source</th>
                    <th className="px-5 py-3 text-right">Original Amount</th>
                    <th className="px-5 py-3 text-right">Reporting ({reportingCurrency})</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredTransactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-3.5 text-slate-500 font-medium whitespace-nowrap">
                        {tx.date}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-slate-100 max-w-xs truncate">
                        {tx.description}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {tx.category}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                        {tx.accountName || 'Primary Wallet'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 text-[10px] whitespace-nowrap">
                        {tx.sourceModule || 'Manual'}
                      </td>
                      <td
                        className={`px-5 py-3.5 text-right font-bold whitespace-nowrap ${
                          tx.type === 'income' ? 'text-emerald-500' : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}
                        {tx.currency} {tx.amount.toFixed(2)}
                      </td>
                      <td
                        className={`px-5 py-3.5 text-right font-bold whitespace-nowrap ${
                          tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'
                        }`}
                      >
                        {formatCurrency(tx.reportingAmount, reportingCurrency)}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => deleteTransaction(tx.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors"
                          title="Delete Transaction"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ACCOUNTS & WALLETS */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setIsAddAccOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Add Account / Wallet</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      {acc.type}
                    </span>
                    <CreditCard className="w-4 h-4 text-slate-400" />
                  </div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">
                    {acc.name}
                  </h3>
                  <div className="text-xl font-extrabold text-blue-500">
                    {acc.currency} {acc.balance.toLocaleString()}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex justify-between">
                  <span>Currency: {acc.currency}</span>
                  <span>Active</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: BUDGETS & THRESHOLD ALERTS */}
      {activeTab === 'budgets' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              SpendSense monitors your monthly expenses and issues proactive alerts when budget utilization reaches thresholds.
            </p>
            <button
              onClick={() => setIsAddBudgetOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>New Category Budget</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgets.map((b) => {
              // Calculate current month spending for this category
              const spent = transactions
                .filter((t) => t.type === 'expense' && t.category === b.category)
                .reduce((sum, t) => sum + t.reportingAmount, 0);

              const percent = Math.min(100, Math.round((spent / b.amount) * 100));
              const isThresholdReached = percent >= b.thresholdPercent;

              return (
                <div
                  key={b.id}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {b.category}
                      </h4>
                      <span className="text-[10px] text-slate-400">
                        Alert at {b.thresholdPercent}% threshold
                      </span>
                    </div>
                    <button
                      onClick={() => deleteBudget(b.id)}
                      className="text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">
                        Spent: {formatCurrency(spent, reportingCurrency)}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Budget: {formatCurrency(b.amount, b.currency)}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          percent >= 90
                            ? 'bg-rose-500'
                            : percent >= 75
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {isThresholdReached && (
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-500 font-medium flex items-center space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Threshold warning: {percent}% utilized this month!</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Record Transaction Modal */}
      {isAddTxOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Record Financial Transaction
              </h3>
              <button
                onClick={() => setIsAddTxOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-3 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  required
                  value={txDesc}
                  onChange={(e) => setTxDesc(e.target.value)}
                  placeholder="e.g. Supermarket Grocery, Car Service"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Currency
                  </label>
                  <select
                    value={txCurrency}
                    onChange={(e) => setTxCurrency(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.symbol.trim()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Type
                  </label>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value as TransactionType)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                    <option value="refund">Refund</option>
                    <option value="transfer">Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value as TransactionCategory)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Account
                  </label>
                  <select
                    value={txAccountId}
                    onChange={(e) => setTxAccountId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  placeholder="Optional notes or tag"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddTxOpen(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md"
                >
                  Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {isAddAccOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3">
              Add Account / Wallet
            </h3>
            <form onSubmit={handleSaveAccount} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  required
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  placeholder="e.g. Axis Bank, Apple Pay"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Type
                  </label>
                  <select
                    value={accType}
                    onChange={(e) => setAccType(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-2 text-xs"
                  >
                    <option value="bank">Bank</option>
                    <option value="card">Credit Card</option>
                    <option value="wallet">Digital Wallet</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Currency
                  </label>
                  <select
                    value={accCurrency}
                    onChange={(e) => setAccCurrency(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-2 text-xs"
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Current Balance
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={accBalance}
                  onChange={(e) => setAccBalance(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddAccOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Budget Modal */}
      {isAddBudgetOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3">
              Set Category Budget
            </h3>
            <form onSubmit={handleSaveBudget} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={budgetCategory}
                  onChange={(e) => setBudgetCategory(e.target.value as TransactionCategory)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-2 text-xs"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Monthly Limit ({reportingCurrency})
                </label>
                <input
                  type="number"
                  required
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  placeholder="25000"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alert Threshold (%)
                </label>
                <input
                  type="number"
                  value={budgetThreshold}
                  onChange={(e) => setBudgetThreshold(e.target.value)}
                  placeholder="80"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddBudgetOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold"
                >
                  Save Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Preview & Confirm Modal */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 max-h-[80vh] flex flex-col">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">
              Preview CSV Import ({csvPreviewRows.length} transactions)
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Please review parsed rows before committing them to your database.
            </p>

            <div className="flex-1 overflow-auto border border-slate-200 dark:border-slate-800 rounded-2xl p-2">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="p-2">Date</th>
                    <th className="p-2">Description</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Category</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {csvPreviewRows.map((r, i) => (
                    <tr key={i} className="border-b border-slate-800/40">
                      <td className="p-2 text-slate-400">{r.date}</td>
                      <td className="p-2 font-medium text-slate-200">{r.description}</td>
                      <td className="p-2 text-slate-300">{r.type}</td>
                      <td className="p-2 text-slate-400">{r.category}</td>
                      <td className="p-2 text-right font-bold text-slate-100">
                        {r.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <button
                onClick={() => setIsCsvModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCsvImport}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs shadow-md"
              >
                Confirm & Import Records
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
