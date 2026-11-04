import React from 'react';
import {
  FileText,
  Wallet,
  Wrench,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Sparkles,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import {
  AreaChart,
  Area,
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
import { formatCurrency } from '../../../lib/currency';

interface DashboardProps {
  onNavigate: (tab: string) => void;
  onOpenQuickAction: (action: 'expense' | 'document' | 'asset' | 'grocery' | 'reminder') => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#3b82f6',
  Groceries: '#10b981',
  Housing: '#6366f1',
  Transportation: '#f59e0b',
  Healthcare: '#ec4899',
  'Household Maintenance': '#8b5cf6',
  Shopping: '#06b6d4',
  Subscriptions: '#14b8a6',
  Other: '#64748b',
};

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onOpenQuickAction }) => {
  const { profile } = useAuth();
  const {
    documents,
    transactions,
    assets,
    pantryItems,
    reminders,
    automationEvents,
  } = useData();

  const reportingCurrency = profile?.preferredCurrency || 'INR';

  // Current month bounds
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const formattedToday = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(now);

  // Financial calculations
  const monthlyTransactions = transactions.filter((t) => t.date.startsWith(currentMonthStr));
  const totalIncome = monthlyTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.reportingAmount, 0);
  const totalExpenses = monthlyTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.reportingAmount, 0);
  const netBalance = totalIncome - totalExpenses;

  // Documents & Expiring
  const expiringDocs = documents.filter((d) => {
    if (!d.expiryDate) return false;
    const exp = new Date(d.expiryDate);
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 45;
  });

  // Low stock pantry
  const lowStockItems = pantryItems.filter((p) => p.quantity <= p.lowStockThreshold);

  // Pending reminders
  const pendingReminders = reminders.filter((r) => r.status === 'pending');

  // Chart data: Monthly transactions grouped by category
  const categoryExpenses: Record<string, number> = {};
  monthlyTransactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + t.reportingAmount;
    });

  const pieData = Object.entries(categoryExpenses).map(([name, value]) => ({
    name,
    value: Math.round(value),
  }));

  // Trend data for last 7 days
  const trendMap: Record<string, { date: string; expense: number; income: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().split('T')[0];
    const displayKey = `${d.getDate()}/${d.getMonth() + 1}`;
    trendMap[dateKey] = { date: displayKey, expense: 0, income: 0 };
  }

  transactions.forEach((t) => {
    if (trendMap[t.date]) {
      if (t.type === 'expense') trendMap[t.date].expense += t.reportingAmount;
      if (t.type === 'income') trendMap[t.date].income += t.reportingAmount;
    }
  });

  const chartTrendData = Object.values(trendMap);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner / Greeting */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-blue-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">
            {formattedToday}
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Welcome back, {profile?.fullName || 'Hub Member'}
          </h1>
          <p className="text-xs md:text-sm text-slate-300 max-w-xl">
            MyLifeHub is monitoring your documents, personal finances, household assets, and pantry inventory in real-time.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap relative z-10">
          <button
            onClick={() => onOpenQuickAction('expense')}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-transform active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Expense</span>
          </button>
          <button
            onClick={() => onOpenQuickAction('document')}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-transform active:scale-95"
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>Upload Doc</span>
          </button>
          <button
            onClick={() => onOpenQuickAction('asset')}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-transform active:scale-95"
          >
            <Wrench className="w-3.5 h-3.5 text-violet-400" />
            <span>New Asset</span>
          </button>
          <button
            onClick={() => onOpenQuickAction('grocery')}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-transform active:scale-95"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
            <span>Grocery</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Monthly Financial Balance */}
        <div
          onClick={() => onNavigate('finances')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Net Balance
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {formatCurrency(netBalance, reportingCurrency)}
          </div>
          <div className="flex items-center space-x-3 mt-2 text-[11px]">
            <span className="text-emerald-500 flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" />
              {formatCurrency(totalIncome, reportingCurrency)}
            </span>
            <span className="text-rose-500 flex items-center">
              <TrendingDown className="w-3 h-3 mr-0.5" />
              {formatCurrency(totalExpenses, reportingCurrency)}
            </span>
          </div>
        </div>

        {/* Card 2: DocuMind Documents */}
        <div
          onClick={() => onNavigate('documents')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              DocuMind
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {documents.length} <span className="text-xs font-normal text-slate-400">Total</span>
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px]">
            <span className={expiringDocs.length > 0 ? 'text-amber-500 font-medium' : 'text-slate-400'}>
              {expiringDocs.length > 0 ? `${expiringDocs.length} expiring soon` : 'All policies valid'}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 3: FixFlow Assets */}
        <div
          onClick={() => onNavigate('assets')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              FixFlow Assets
            </span>
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {assets.length} <span className="text-xs font-normal text-slate-400">Registered</span>
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
            <span>Household & Tech</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 4: PantryPilot Inventory */}
        <div
          onClick={() => onNavigate('pantry')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              PantryPilot
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {pantryItems.length} <span className="text-xs font-normal text-slate-400">Items</span>
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px]">
            <span className={lowStockItems.length > 0 ? 'text-rose-500 font-semibold' : 'text-slate-400'}>
              {lowStockItems.length > 0 ? `${lowStockItems.length} low in stock` : 'Pantry well stocked'}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Main Analytics Row: Spending Trend & Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Spending & Income Chart */}
        <div className="lg:col-span-2 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm md:text-base text-slate-900 dark:text-white">
                Cashflow Activity (Last 7 Days)
              </h3>
              <p className="text-xs text-slate-400">
                Income versus expenses normalized to {reportingCurrency}
              </p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <div className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-slate-500 dark:text-slate-400">Expense</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-500 dark:text-slate-400">Income</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: '#fff',
                  }}
                />
                <Area type="monotone" dataKey="expense" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#expenseGrad)" />
                <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#incomeGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Category Breakdown */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm md:text-base text-slate-900 dark:text-white">
              Category Distribution
            </h3>
            <p className="text-xs text-slate-400 mb-2">Current month spending</p>

            {pieData.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-xs text-slate-400">
                <span>No expense records yet this month</span>
              </div>
            ) : (
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CATEGORY_COLORS[entry.name] || '#64748b'}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #1e293b',
                        borderRadius: '12px',
                        fontSize: '11px',
                        color: '#fff',
                      }}
                      formatter={(val: any) => formatCurrency(Number(val), reportingCurrency)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 max-h-36 overflow-y-auto">
            {pieData.slice(0, 4).map((p) => (
              <div key={p.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[p.name] || '#64748b' }}
                  />
                  <span className="text-slate-600 dark:text-slate-300 font-medium">{p.name}</span>
                </div>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatCurrency(p.value, reportingCurrency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cross-Module Activity & Alert Center */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Reminders & Actions */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              <h3 className="font-bold text-sm md:text-base text-slate-900 dark:text-white">
                Upcoming Deadlines & Actions
              </h3>
            </div>
            <button
              onClick={() => onNavigate('reminders')}
              className="text-xs font-semibold text-blue-500 hover:underline flex items-center space-x-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {pendingReminders.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2 opacity-80" />
              <span>You're completely up to date! No pending reminders.</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {pendingReminders.slice(0, 4).map((r) => (
                <div
                  key={r.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-start space-x-3 min-w-0">
                    <div
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        r.priority === 'high'
                          ? 'bg-rose-500 ring-2 ring-rose-500/20'
                          : 'bg-blue-500'
                      }`}
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {r.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">
                        Due: {r.dueDate} • {r.category}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      r.priority === 'high'
                        ? 'bg-rose-500/10 text-rose-500'
                        : 'bg-blue-500/10 text-blue-500'
                    }`}
                  >
                    {r.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cross-Module Automation Engine Logs */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <h3 className="font-bold text-sm md:text-base text-slate-900 dark:text-white">
                Integration Activity Stream
              </h3>
            </div>
            <button
              onClick={() => onNavigate('intelligence')}
              className="text-xs font-semibold text-indigo-500 hover:underline flex items-center space-x-1"
            >
              <span>Automation Centre</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {automationEvents.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No cross-module events logged yet. When documents are confirmed or groceries purchased, automated audit records appear here.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto">
              {automationEvents.slice(0, 4).map((evt) => (
                <div
                  key={evt.id}
                  className="p-3 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-start space-x-3 text-xs"
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {evt.eventType.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(evt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {evt.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
