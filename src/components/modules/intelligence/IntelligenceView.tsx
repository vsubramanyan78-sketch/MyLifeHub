import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  Shield,
  Layers,
  RefreshCw,
  Lightbulb,
  Cpu,
  Bot,
  User,
  HelpCircle,
  Search,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { formatCurrency } from '../../../lib/currency';

const QUICK_PROMPTS = [
  'How much did I spend this month and what are my biggest categories?',
  'Which documents or insurance policies are expiring soon?',
  'Which household appliances or vehicles need maintenance?',
  'What groceries are running low in the pantry?',
  'Which warranties expire in the next 60 days?',
  'Summarize my personal financial activity and savings balance.',
];

export const IntelligenceView: React.FC = () => {
  const { profile } = useAuth();
  const {
    documents,
    transactions,
    accounts,
    budgets,
    assets,
    maintenanceRecords,
    pantryItems,
    reminders,
    automationEvents,
    reconcileAlerts,
  } = useData();

  const reportingCurrency = profile?.preferredCurrency || 'INR';

  const [activeTab, setActiveTab] = useState<'assistant' | 'automation' | 'insights' | 'search'>('assistant');
  const [messages, setMessages] = useState<
    Array<{
      sender: 'user' | 'ai';
      text: string;
      confirmedData?: string[];
      inferredData?: string[];
      recommendations?: string[];
    }>
  >([
    {
      sender: 'ai',
      text: `Hello ${profile?.fullName || 'there'}! I am MyLifeHub Intelligence, your central AI assistant. I have secure real-time visibility into your documents, transactions, household assets, and pantry inventory. Ask me anything about your finances, upcoming deadlines, or maintenance plans!`,
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);

  // Search Grounding State
  const [searchGroundQuery, setSearchGroundQuery] = useState('');
  const [searchGroundResult, setSearchGroundResult] = useState<{
    answer: string;
    sources: Array<{ title: string; uri: string }>;
    searchQueries: string[];
  } | null>(null);
  const [isSearchingGround, setIsSearchingGround] = useState(false);

  const handleSearchGrounded = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchGroundQuery.trim() || isSearchingGround) return;

    setIsSearchingGround(true);
    setSearchGroundResult(null);

    try {
      const resp = await fetch('/api/gemini/search-grounded', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchGroundQuery }),
      });

      if (resp.ok) {
        const data = await resp.json();
        setSearchGroundResult(data);
      }
    } catch (err) {
      console.error('Search grounding error:', err);
    } finally {
      setIsSearchingGround(false);
    }
  };

  // Send query to server-side Gemini assistant
  const handleSend = async (queryText?: string) => {
    const q = (queryText || inputQuery).trim();
    if (!q || isProcessing) return;

    // Add user message
    setMessages((prev) => [...prev, { sender: 'user', text: q }]);
    setInputQuery('');
    setIsProcessing(true);

    // Prepare authorized context snapshot
    const context = {
      user: {
        name: profile?.fullName,
        currency: reportingCurrency,
        monthlyBudget: profile?.monthlyBudget,
      },
      documents: documents.map((d) => ({
        title: d.title,
        category: d.category,
        issuingOrg: d.issuingOrg,
        expiryDate: d.expiryDate,
        amount: d.amount,
        isVerified: d.isVerified,
      })),
      transactions: transactions.slice(0, 30).map((t) => ({
        description: t.description,
        amount: t.amount,
        currency: t.currency,
        reportingAmount: t.reportingAmount,
        type: t.type,
        category: t.category,
        date: t.date,
      })),
      assets: assets.map((a) => ({
        name: a.name,
        category: a.category,
        brand: a.brand,
        warrantyEndDate: a.warrantyEndDate,
        condition: a.condition,
      })),
      pantry: pantryItems.map((p) => ({
        name: p.name,
        category: p.category,
        quantity: p.quantity,
        unit: p.unit,
        lowStock: p.quantity <= p.lowStockThreshold,
        expiryDate: p.expiryDate,
      })),
      reminders: reminders.filter((r) => r.status === 'pending').map((r) => ({
        title: r.title,
        dueDate: r.dueDate,
        priority: r.priority,
      })),
    };

    try {
      const resp = await fetch('/api/gemini/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, context }),
      });

      if (resp.ok) {
        const data = await resp.json();
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: data.answer || 'I have analyzed your request based on your hub data.',
            confirmedData: data.confirmedData,
            inferredData: data.inferredData,
            recommendations: data.recommendations,
          },
        ]);
      } else {
        throw new Error('Assistant API returned an error');
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `I encountered a communication issue connecting to the AI engine. However, your local documents, finances, and assets remain secure and accessible.`,
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunReconciliation = async () => {
    setIsReconciling(true);
    await reconcileAlerts();
    setTimeout(() => setIsReconciling(false), 600);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              MyLifeHub Intelligence & Automation
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Server-side Gemini AI assistant, cross-module workflow logs, and continuous life monitoring.
          </p>
        </div>

        <button
          onClick={handleRunReconciliation}
          disabled={isReconciling}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isReconciling ? 'animate-spin' : ''}`} />
          <span>Reconcile Alerts & Rules</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('assistant')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeTab === 'assistant'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>AI Assistant</span>
        </button>
        <button
          onClick={() => setActiveTab('automation')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeTab === 'automation'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Automation Centre ({automationEvents.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('insights')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeTab === 'insights'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Lightbulb className="w-3.5 h-3.5" />
          <span>Automated Insights</span>
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeTab === 'search'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-blue-400" />
          <span>Google Search Grounding</span>
        </button>
      </div>

      {/* TAB 1: NATURAL LANGUAGE AI ASSISTANT */}
      {activeTab === 'assistant' && (
        <div className="flex flex-col h-[650px] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Chat Messages Log */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex space-x-3 max-w-2xl ${
                  msg.sender === 'user' ? 'ml-auto flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white font-bold text-xs'
                      : 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md'
                  }`}
                >
                  {msg.sender === 'user' ? (
                    profile?.fullName?.charAt(0) || 'U'
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                </div>

                <div
                  className={`p-4 rounded-2xl text-xs space-y-2.5 ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800 rounded-tl-none shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>

                  {/* Confirmed Data Breakdown */}
                  {msg.confirmedData && msg.confirmedData.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                      <span className="block font-bold text-[10px] uppercase tracking-wider mb-1">
                        Confirmed Information (Database Verified)
                      </span>
                      <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                        {msg.confirmedData.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Inferred Data Breakdown */}
                  {msg.inferredData && msg.inferredData.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
                      <span className="block font-bold text-[10px] uppercase tracking-wider mb-1">
                        Inferred / Deduced Patterns
                      </span>
                      <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                        {msg.inferredData.map((inf, i) => (
                          <li key={i}>{inf}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Actionable Recommendations */}
                  {msg.recommendations && msg.recommendations.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
                      <span className="block font-bold text-[10px] uppercase tracking-wider mb-1">
                        Recommendations
                      </span>
                      <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                        {msg.recommendations.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="flex space-x-3 max-w-xl">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 animate-spin" />
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-400 flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                  <span>Synthesizing your documents, expenses & assets...</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Suggestion Pills */}
          <div className="px-5 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center space-x-2 overflow-x-auto scrollbar-none">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
              Suggested:
            </span>
            {QUICK_PROMPTS.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q)}
                disabled={isProcessing}
                className="px-3 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] whitespace-nowrap hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center space-x-2"
            >
              <input
                type="text"
                placeholder="Ask about your finances, documents, appliances, or groceries..."
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                disabled={isProcessing}
                className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs px-4 py-2.5 rounded-xl border border-transparent focus:border-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || isProcessing}
                className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-transform active:scale-95 shadow-md shadow-blue-500/20"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: AUTOMATION CENTRE */}
      {activeTab === 'automation' && (
        <div className="space-y-6">
          {/* Active Workflows Architecture */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">
                Workflow A
              </span>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                Invoice to Asset & Expense
              </h4>
              <p className="text-[11px] text-slate-400">
                DocuMind extracts purchase invoices, prompting automatic expense recording, asset warranty registration, and calendar alerts.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                Workflow B
              </span>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                Grocery Purchase to SpendSense
              </h4>
              <p className="text-[11px] text-slate-400">
                Purchasing items on your shopping list updates pantry inventory stock and logs the expense with idempotent duplicate checks.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-violet-500 uppercase tracking-wider">
                Workflow C
              </span>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                Maintenance to Household Expense
              </h4>
              <p className="text-[11px] text-slate-400">
                Completing a scheduled appliance or vehicle repair creates a linked transaction under Household Maintenance.
              </p>
            </div>
          </div>

          {/* Audit Event Stream */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">
              Idempotent Event Engine Audit Stream
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              All cross-module events are processed with unique composite event keys to guarantee duplicate prevention.
            </p>

            {automationEvents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No automation events recorded yet. Confirm a document or complete a shopping item to trigger events.
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {automationEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-start justify-between text-xs"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {evt.eventType}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-500">
                            {evt.sourceModule}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 mt-1">{evt.message}</p>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                          Event Key: {evt.id}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap ml-4">
                      {new Date(evt.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: AUTOMATED INSIGHTS */}
      {activeTab === 'insights' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center space-x-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Cashflow & Budget Adherence
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {profile?.monthlyBudget
                ? `Your target spending budget is ${formatCurrency(profile.monthlyBudget, reportingCurrency)} per month.`
                : 'Set a monthly spending budget in Settings to enable proactive threshold alerts.'}
            </p>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-500 space-y-1">
              <span className="font-semibold block text-slate-700 dark:text-slate-300">
                Rule Check:
              </span>
              <span>
                • Alerts trigger automatically when utilization reaches 80% and 100%.
              </span>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-emerald-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Asset & Warranty Protection
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {assets.filter((a) => a.warrantyEndDate).length} of your {assets.length} assets have
              registered warranty periods.
            </p>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-500 space-y-1">
              <span className="font-semibold block text-slate-700 dark:text-slate-300">
                Automation Policy:
              </span>
              <span>
                • Reminders are dispatched 30 days before expiration to allow timely warranty extensions.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GOOGLE SEARCH GROUNDED RESEARCH */}
      {activeTab === 'search' && (
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-blue-600/10 border border-blue-500/20 space-y-3">
            <div className="flex items-center space-x-2">
              <Globe className="w-5 h-5 text-blue-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Live Google Search Grounding for Household Intelligence
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              Research real-time manufacturer warranty policies, appliance user manuals, vehicle recall bulletins, or consumer protection guidelines grounded with live web citations.
            </p>

            <form onSubmit={handleSearchGrounded} className="flex gap-2 max-w-xl">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. LG French Door Refrigerator compressor warranty policy India"
                  value={searchGroundQuery}
                  onChange={(e) => setSearchGroundQuery(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={isSearchingGround || !searchGroundQuery.trim()}
                className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md transition-all shrink-0"
              >
                {isSearchingGround ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>Search Web</span>
              </button>
            </form>
          </div>

          {searchGroundResult && (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 text-xs">
              <div>
                <span className="block text-[10px] uppercase font-bold text-blue-500 tracking-wider mb-1.5">
                  Grounded Synthesis Result
                </span>
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line text-xs">
                  {searchGroundResult.answer}
                </p>
              </div>

              {searchGroundResult.sources?.length > 0 && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
                    Verified Google Search Web Sources:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {searchGroundResult.sources.map((src, i) => (
                      <a
                        key={i}
                        href={src.uri}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] hover:border-blue-500 transition-colors"
                      >
                        <Globe className="w-3 h-3 text-blue-500" />
                        <span className="truncate max-w-xs">{src.title}</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
