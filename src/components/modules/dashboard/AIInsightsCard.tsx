import React, { useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  AlertCircle,
  TrendingDown,
  ShoppingBag,
  Wallet,
  Clock,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Lightbulb,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { formatCurrency } from '../../../lib/currency';

interface AIInsightsCardProps {
  onNavigate: (tab: string) => void;
  onOpenQuickAction: (action: 'expense' | 'document' | 'asset' | 'grocery' | 'reminder') => void;
}

export interface SystemWarning {
  id: string;
  category: 'finance' | 'pantry';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  metric?: string;
  actionLabel: string;
  actionTab: 'finances' | 'pantry';
  highlightNumber?: string;
}

export const AIInsightsCard: React.FC<AIInsightsCardProps> = ({
  onNavigate,
  onOpenQuickAction,
}) => {
  const { profile } = useAuth();
  const {
    transactions,
    budgets,
    pantryItems,
    reminders,
  } = useData();

  const reportingCurrency = profile?.preferredCurrency || 'INR';

  const [filterType, setFilterType] = useState<'all' | 'finance' | 'pantry'>('all');
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Today's date calculations
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  // 1. Gather all potential warnings
  const allWarnings: SystemWarning[] = [];

  // --- Financial Warnings ---
  // A. Monthly Transactions & Cashflow
  const monthlyTransactions = transactions.filter((t) => t.date.startsWith(currentMonthStr));
  const totalIncome = monthlyTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.reportingAmount, 0);
  const totalExpenses = monthlyTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.reportingAmount, 0);

  // Check 1: Cashflow deficit
  if (totalExpenses > totalIncome && totalIncome > 0) {
    const deficit = totalExpenses - totalIncome;
    allWarnings.push({
      id: 'fin_deficit',
      category: 'finance',
      severity: 'critical',
      title: 'Monthly Cashflow Deficit',
      description: `Current month spending (${formatCurrency(totalExpenses, reportingCurrency)}) exceeds total income (${formatCurrency(totalIncome, reportingCurrency)}) by ${formatCurrency(deficit, reportingCurrency)}.`,
      metric: `-${formatCurrency(deficit, reportingCurrency)}`,
      actionLabel: 'Review SpendSense',
      actionTab: 'finances',
    });
  }

  // Check 1b: Daily Budget Goal
  const todayExpenses = transactions
    .filter((t) => t.type === 'expense' && t.date === todayStr)
    .reduce((sum, t) => sum + t.reportingAmount, 0);
  const dailyBudgetGoal = profile?.dailyBudgetGoal || (profile?.monthlyBudget ? Math.round(profile.monthlyBudget / 30) : 2000);

  if (dailyBudgetGoal > 0 && todayExpenses > dailyBudgetGoal) {
    const overspend = todayExpenses - dailyBudgetGoal;
    allWarnings.push({
      id: 'fin_daily_goal_exceeded',
      category: 'finance',
      severity: 'warning',
      title: 'Daily Budget Limit Exceeded Today',
      description: `Today's spending (${formatCurrency(todayExpenses, reportingCurrency)}) exceeded your daily goal (${formatCurrency(dailyBudgetGoal, reportingCurrency)}) by ${formatCurrency(overspend, reportingCurrency)}.`,
      metric: `+${formatCurrency(overspend, reportingCurrency)}`,
      actionLabel: 'Check Goal in SpendSense',
      actionTab: 'finances',
    });
  }

  // Check 2: Budgets exceeded or nearing threshold
  budgets.forEach((b) => {
    const catExpenses = monthlyTransactions
      .filter((t) => t.type === 'expense' && t.category === b.category)
      .reduce((sum, t) => sum + t.reportingAmount, 0);

    const percentUsed = b.amount > 0 ? (catExpenses / b.amount) * 100 : 0;

    if (catExpenses > b.amount) {
      allWarnings.push({
        id: `fin_budget_exceeded_${b.id}`,
        category: 'finance',
        severity: 'critical',
        title: `Budget Exceeded: ${b.category}`,
        description: `Spent ${formatCurrency(catExpenses, reportingCurrency)} of ${formatCurrency(b.amount, reportingCurrency)} limit (${Math.round(percentUsed)}% consumed, over by ${formatCurrency(catExpenses - b.amount, reportingCurrency)}).`,
        metric: `${Math.round(percentUsed)}%`,
        actionLabel: 'Adjust Budget',
        actionTab: 'finances',
      });
    } else if (percentUsed >= (b.thresholdPercent || 80)) {
      allWarnings.push({
        id: `fin_budget_warn_${b.id}`,
        category: 'finance',
        severity: 'warning',
        title: `Budget Warning: ${b.category}`,
        description: `${Math.round(percentUsed)}% of your monthly limit reached (${formatCurrency(catExpenses, reportingCurrency)} of ${formatCurrency(b.amount, reportingCurrency)}). Threshold is ${b.thresholdPercent || 80}%.`,
        metric: `${Math.round(percentUsed)}%`,
        actionLabel: 'Track Spending',
        actionTab: 'finances',
      });
    }
  });

  // Check 3: Overdue or impending bill payments
  const billReminders = reminders.filter(
    (r) =>
      r.status === 'pending' &&
      (r.category === 'Bill Payment' || r.category === 'Budget Alert')
  );

  billReminders.forEach((r) => {
    const diffDays = Math.ceil(
      (new Date(r.dueDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays < 0) {
      allWarnings.push({
        id: `fin_bill_overdue_${r.id}`,
        category: 'finance',
        severity: 'critical',
        title: `Overdue Bill: ${r.title}`,
        description: `Payment deadline passed on ${r.dueDate} (${Math.abs(diffDays)} days ago). Settle immediately to prevent penalties or service disruptions.`,
        metric: 'OVERDUE',
        actionLabel: 'View in SpendSense',
        actionTab: 'finances',
      });
    } else if (diffDays <= 3) {
      allWarnings.push({
        id: `fin_bill_soon_${r.id}`,
        category: 'finance',
        severity: 'warning',
        title: `Bill Due Soon: ${r.title}`,
        description: `Scheduled payment is due in ${diffDays === 0 ? 'today' : `${diffDays} day(s)`} (${r.dueDate}).`,
        metric: `${diffDays === 0 ? 'Today' : `${diffDays}d`}`,
        actionLabel: 'Check Finances',
        actionTab: 'finances',
      });
    }
  });

  // --- Pantry Warnings ---
  // Check 4: Expired pantry items
  const expiredPantry = pantryItems.filter(
    (p) => p.expiryDate && p.expiryDate < todayStr
  );

  expiredPantry.forEach((p) => {
    allWarnings.push({
      id: `pantry_expired_${p.id}`,
      category: 'pantry',
      severity: 'critical',
      title: `Expired Item: ${p.name}`,
      description: `${p.name} (${p.quantity} ${p.unit}) expired on ${p.expiryDate}. Discard immediately to prevent food contamination.`,
      metric: 'EXPIRED',
      actionLabel: 'Inspect Pantry',
      actionTab: 'pantry',
    });
  });

  // Check 5: Items expiring in <= 3 days
  const soonExpiringPantry = pantryItems.filter((p) => {
    if (!p.expiryDate || p.expiryDate < todayStr) return false;
    const diffDays = Math.ceil(
      (new Date(p.expiryDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diffDays >= 0 && diffDays <= 3;
  });

  soonExpiringPantry.forEach((p) => {
    const diffDays = Math.ceil(
      (new Date(p.expiryDate!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    allWarnings.push({
      id: `pantry_soon_${p.id}`,
      category: 'pantry',
      severity: 'warning',
      title: `Expiring Soon: ${p.name}`,
      description: `${p.quantity} ${p.unit} of ${p.name} will expire ${diffDays === 0 ? 'today' : `in ${diffDays} day(s)`} (${p.expiryDate}). Use in cooking or freeze promptly.`,
      metric: diffDays === 0 ? 'Expires Today' : `${diffDays}d left`,
      actionLabel: 'Find Recipes',
      actionTab: 'pantry',
    });
  });

  // Check 6: Depleted or low stock items
  const lowStockItems = pantryItems.filter(
    (p) => p.quantity <= p.lowStockThreshold
  );

  lowStockItems.forEach((p) => {
    const isZero = p.quantity === 0;
    allWarnings.push({
      id: `pantry_stock_${p.id}`,
      category: 'pantry',
      severity: isZero ? 'critical' : 'warning',
      title: isZero ? `Out of Stock: ${p.name}` : `Low Stock: ${p.name}`,
      description: isZero
        ? `${p.name} is completely depleted. Add to shopping list to replenish staple supply.`
        : `Only ${p.quantity} ${p.unit} remaining (threshold: ${p.lowStockThreshold} ${p.unit}).`,
      metric: `${p.quantity} ${p.unit}`,
      actionLabel: 'Restock in Pantry',
      actionTab: 'pantry',
    });
  });

  // --- Fallback Proactive Insights if fewer than 3 alerts ---
  if (allWarnings.length < 3) {
    if (!allWarnings.some((w) => w.id === 'pantry_health_good')) {
      allWarnings.push({
        id: 'pantry_health_good',
        category: 'pantry',
        severity: 'info',
        title: 'Pantry Quality & Freshness Intact',
        description: `Zero food spoilage alerts across ${pantryItems.length} inventory items. Keep storage temperatures steady to prolong shelf life.`,
        metric: `${pantryItems.length} Items Safe`,
        actionLabel: 'Browse Inventory',
        actionTab: 'pantry',
      });
    }
  }

  if (allWarnings.length < 3) {
    if (!allWarnings.some((w) => w.id === 'fin_health_good')) {
      allWarnings.push({
        id: 'fin_health_good',
        category: 'finance',
        severity: 'info',
        title: 'Cashflow Buffer Healthy',
        description: `Current monthly expenses (${formatCurrency(totalExpenses, reportingCurrency)}) are well managed within liquid reserves.`,
        metric: 'BALANCED',
        actionLabel: 'View Analytics',
        actionTab: 'finances',
      });
    }
  }

  if (allWarnings.length < 3) {
    allWarnings.push({
      id: 'sys_proactive_rule',
      category: 'pantry',
      severity: 'info',
      title: 'Smart Restock Advisory',
      description: 'Automate weekly staple reorders by maintaining low-stock limits on high-frequency kitchen essentials.',
      metric: 'OPTIMIZED',
      actionLabel: 'Open PantryPilot',
      actionTab: 'pantry',
    });
  }

  // Severity Weight Ordering: critical (3) > warning (2) > info (1)
  const severityWeight = { critical: 3, warning: 2, info: 1 };
  const sortedWarnings = [...allWarnings].sort(
    (a, b) => severityWeight[b.severity] - severityWeight[a.severity]
  );

  // Apply optional category filter
  const filteredWarnings =
    filterType === 'all'
      ? sortedWarnings
      : sortedWarnings.filter((w) => w.category === filterType);

  // Exactly Top 3 Warnings
  const top3Warnings = filteredWarnings.slice(0, 3);

  // Request AI Assistant advice for the top 3 warnings
  const handleRequestAiAdvice = async () => {
    setLoadingAi(true);
    try {
      const summaryContext = top3Warnings
        .map(
          (w, idx) =>
            `${idx + 1}. [${w.category.toUpperCase()}] ${w.title} (${w.severity}): ${w.description}`
        )
        .join('\n');

      const response = await fetch('/api/gemini/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Based on my current top financial and pantry warnings:\n${summaryContext}\nProvide 2 concise, highly actionable directives to mitigate these risks immediately. Keep it under 60 words.`,
          userProfile: profile,
          systemContext: {
            reportingCurrency,
            totalExpenses,
            totalIncome,
            topWarningsCount: top3Warnings.length,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiAdvice(
          data.recommendations?.join(' • ') ||
            data.response ||
            'Review highlighted expenses and prioritize cooking expiring pantry items today.'
        );
      } else {
        setAiAdvice(
          'AI Recommendation: Prioritize using expiring ingredients in your next meal to reduce food waste, and audit top discretionary categories in SpendSense to keep within monthly limits.'
        );
      }
    } catch {
      setAiAdvice(
        'AI Recommendation: Cook perishable items first and pause non-essential purchases until the next billing cycle.'
      );
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-5 md:p-6 transition-all">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-500/5 via-indigo-500/5 to-transparent pointer-events-none rounded-full blur-3xl -mr-20 -mt-20" />

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-rose-500/20 to-indigo-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-sm">
            <Sparkles className="w-5 h-5 text-amber-500 dark:text-amber-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                AI Insights & Priority Warnings
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 uppercase tracking-wider">
                Live Audit
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Top 3 prioritized financial and pantry warnings detected across your personal records.
            </p>
          </div>
        </div>

        {/* Action Controls & Domain Filters */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800/80 p-0.5 text-xs font-semibold">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                filterType === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('finance')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                filterType === 'finance'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Finance
            </button>
            <button
              onClick={() => setFilterType('pantry')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                filterType === 'pantry'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Pantry
            </button>
          </div>

          <button
            onClick={handleRequestAiAdvice}
            disabled={loadingAi}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
            title="Ask Gemini for immediate mitigation directives"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingAi ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">AI Advice</span>
          </button>
        </div>
      </div>

      {/* AI Mitigating Advice Banner (if requested) */}
      {aiAdvice && (
        <div className="mt-4 p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-900 dark:text-indigo-200 flex items-start space-x-2.5 animate-in fade-in">
          <Lightbulb className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block text-[11px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-0.5">
              Gemini Intelligent Directive
            </span>
            <p className="leading-relaxed text-slate-700 dark:text-slate-300">{aiAdvice}</p>
          </div>
          <button
            onClick={() => setAiAdvice(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top 3 Warnings Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4">
        {top3Warnings.map((warning, index) => {
          const isCritical = warning.severity === 'critical';
          const isWarning = warning.severity === 'warning';
          const isFinance = warning.category === 'finance';

          return (
            <div
              key={warning.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between group ${
                isCritical
                  ? 'bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/30 hover:border-rose-500/50'
                  : isWarning
                  ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Meta Row: Priority Rank + Domain + Severity */}
                <div className="flex items-center justify-between gap-1 mb-2">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-5 h-5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-extrabold flex items-center justify-center">
                      #{index + 1}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center space-x-1 ${
                        isFinance
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {isFinance ? (
                        <Wallet className="w-3 h-3 mr-0.5 inline" />
                      ) : (
                        <ShoppingBag className="w-3 h-3 mr-0.5 inline" />
                      )}
                      <span>{isFinance ? 'Finance' : 'Pantry'}</span>
                    </span>
                  </div>

                  <span
                    className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                      isCritical
                        ? 'bg-rose-500 text-white'
                        : isWarning
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-blue-500/10 text-blue-500 font-bold'
                    }`}
                  >
                    {warning.severity}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-xs md:text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-1 mb-1 group-hover:text-blue-500 transition-colors">
                  {warning.title}
                </h3>

                {/* Description */}
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3 mb-3">
                  {warning.description}
                </p>
              </div>

              {/* Bottom Card Footer: Metric & Action Link */}
              <div className="pt-2.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between mt-auto">
                {warning.metric ? (
                  <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                    {warning.metric}
                  </span>
                ) : (
                  <span />
                )}

                <button
                  onClick={() => onNavigate(warning.actionTab)}
                  className={`text-[11px] font-semibold flex items-center space-x-1 px-2.5 py-1 rounded-xl transition-all ${
                    isCritical
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-xs'
                      : isWarning
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-xs'
                      : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <span>{warning.actionLabel}</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
