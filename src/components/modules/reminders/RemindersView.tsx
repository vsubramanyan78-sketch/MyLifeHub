import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trash2,
  Filter,
  Check,
  RotateCcw,
  X,
  FileText,
  Wrench,
  ShoppingBag,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { ReminderItem, ReminderCategory, ReminderPriority } from '../../../types';

const REMINDER_CATEGORIES: ReminderCategory[] = [
  'Document Expiry',
  'Warranty Expiry',
  'Maintenance',
  'Grocery Expiry',
  'Low Stock',
  'Budget Alert',
  'Bill Payment',
  'General',
];

export const RemindersView: React.FC = () => {
  const { reminders, addReminder, updateReminder, deleteReminder } = useData();

  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<ReminderCategory>('General');
  const [priority, setPriority] = useState<ReminderPriority>('medium');
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [frequency, setFrequency] = useState<'Daily' | 'Weekly' | 'Monthly'>('Weekly');

  const now = new Date().toISOString().split('T')[0];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dueDate) return;

    await addReminder({
      title,
      description: desc,
      category,
      dueDate,
      priority,
      status: 'pending',
      isRecurring,
      frequency: isRecurring ? frequency : undefined,
    });

    setIsAddOpen(false);
    setTitle('');
    setDesc('');
    setIsRecurring(false);
    setFrequency('Weekly');
  };

  const handleToggleComplete = async (rem: ReminderItem) => {
    const isCompleted = rem.status === 'completed';
    await updateReminder(rem.id, {
      status: isCompleted ? 'pending' : 'completed',
      completedAt: isCompleted ? undefined : new Date().toISOString(),
    });
  };

  const filtered = reminders.filter((r) => {
    const matchesStatus =
      filterStatus === 'all'
        ? true
        : filterStatus === 'pending'
        ? r.status === 'pending'
        : r.status === 'completed';
    const matchesCat = filterCategory === 'all' || r.category === filterCategory;
    return matchesStatus && matchesCat;
  });

  const overdueCount = reminders.filter((r) => r.status === 'pending' && r.dueDate < now).length;
  const pendingCount = reminders.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <CalendarIcon className="w-5 h-5" />
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              Life Calendar & Reminders
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Automated alerts for expiring documents, appliance maintenance schedules, and warranty renewals.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Create Reminder</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Pending Tasks
          </span>
          <span className="text-xl font-extrabold text-blue-500">{pendingCount}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Overdue Deadlines
          </span>
          <span className={`text-xl font-extrabold ${overdueCount > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
            {overdueCount}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Total Monitored
          </span>
          <span className="text-xl font-extrabold text-slate-900 dark:text-white">
            {reminders.length}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filterStatus === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filterStatus === 'pending'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filterStatus === 'completed'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            Completed
          </button>
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-white dark:bg-slate-800 text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none"
        >
          <option value="all">All Categories</option>
          {REMINDER_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Reminders List */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
          No reminders found matching your filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((rem) => {
            const isCompleted = rem.status === 'completed';
            const isOverdue = !isCompleted && rem.dueDate < now;

            return (
              <div
                key={rem.id}
                className={`p-4 rounded-3xl bg-white dark:bg-slate-900 border shadow-sm flex items-center justify-between transition-all ${
                  isCompleted
                    ? 'opacity-60 border-slate-200 dark:border-slate-800'
                    : isOverdue
                    ? 'border-rose-500/40 bg-rose-500/5'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start space-x-3.5 min-w-0">
                  <button
                    onClick={() => handleToggleComplete(rem)}
                    className={`w-6 h-6 rounded-xl border flex items-center justify-center transition-colors shrink-0 mt-0.5 ${
                      isCompleted
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'
                    }`}
                  >
                    {isCompleted && <Check className="w-3.5 h-3.5" />}
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4
                        className={`font-semibold text-xs text-slate-900 dark:text-white truncate ${
                          isCompleted ? 'line-through text-slate-400' : ''
                        }`}
                      >
                        {rem.title}
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {rem.category}
                      </span>
                      {rem.isRecurring && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center space-x-1">
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>{rem.frequency || 'Weekly'}</span>
                        </span>
                      )}
                    </div>

                    {rem.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                        {rem.description}
                      </p>
                    )}

                    <div className="flex items-center space-x-2 mt-1.5 text-[10px] text-slate-400">
                      <span
                        className={`font-medium ${
                          isOverdue ? 'text-rose-500 font-bold' : ''
                        }`}
                      >
                        Due: {rem.dueDate}
                      </span>
                      {rem.relatedModule && (
                        <span>• Source: {rem.relatedModule}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 ml-4">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      rem.priority === 'high'
                        ? 'bg-rose-500/10 text-rose-500'
                        : rem.priority === 'medium'
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {rem.priority}
                  </span>
                  <button
                    onClick={() => deleteReminder(rem.id)}
                    className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Reminder Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3">
              Create New Reminder
            </h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Car Insurance Renewal, Filter Replacement"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Optional notes or details"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ReminderCategory)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-2 text-xs"
                  >
                    {REMINDER_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as ReminderPriority)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-2 text-xs"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Due Date *
                </label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-2 text-xs"
                />
              </div>

              {/* Recurring Switch */}
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
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {isRecurring && (
                  <div className="mt-2.5 pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 animate-in fade-in">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Frequency
                    </label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value as 'Daily' | 'Weekly' | 'Monthly')}
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
                    setIsAddOpen(false);
                    setIsRecurring(false);
                  }}
                  className="px-3 py-1.5 text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold"
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
