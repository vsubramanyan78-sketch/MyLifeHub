import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Wallet,
  Wrench,
  ShoppingBag,
  Sparkles,
  Calendar,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Boxes,
  MapPin,
  Gamepad2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  collapsed,
  setCollapsed,
}) => {
  const { user, profile, logout, isGuest } = useAuth();
  const { documents, pantryItems, reminders } = useData();

  // Pending reviews or expiring items count
  const unverifiedDocsCount = documents.filter((d) => !d.isVerified).length;
  const lowStockCount = pantryItems.filter((p) => p.quantity <= p.lowStockThreshold).length;
  const pendingRemindersCount = reminders.filter((r) => r.status === 'pending').length;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'documents',
      label: 'DocuMind',
      sublabel: 'Documents',
      icon: FileText,
      badge: unverifiedDocsCount > 0 ? `${unverifiedDocsCount} unverified` : null,
      badgeColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    },
    {
      id: 'finances',
      label: 'SpendSense',
      sublabel: 'Finances',
      icon: Wallet,
      badge: null,
    },
    {
      id: 'assets',
      label: 'FixFlow',
      sublabel: 'Assets & Maintenance',
      icon: Wrench,
      badge: null,
    },
    {
      id: 'home3d',
      label: '3D Home & Game',
      sublabel: 'Three.js Twin',
      icon: Boxes,
      badge: '3D',
      badgeColor: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
    },
    {
      id: 'maps',
      label: 'Service Locator',
      sublabel: 'Google Maps',
      icon: MapPin,
      badge: null,
    },
    {
      id: 'pantry',
      label: 'PantryPilot',
      sublabel: 'Grocery & Inventory',
      icon: ShoppingBag,
      badge: lowStockCount > 0 ? `${lowStockCount} low` : null,
      badgeColor: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
    },
    {
      id: 'intelligence',
      label: 'Intelligence',
      sublabel: 'AI & Automation',
      icon: Sparkles,
      badge: 'Gemini',
      badgeColor: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
    },
    {
      id: 'reminders',
      label: 'Reminders',
      sublabel: 'Calendar & Tasks',
      icon: Calendar,
      badge: pendingRemindersCount > 0 ? String(pendingRemindersCount) : null,
      badgeColor: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    },
    {
      id: 'settings',
      label: 'Settings',
      sublabel: 'Preferences',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <aside
      className={`relative flex flex-col border-r transition-all duration-300 z-30 ${
        collapsed ? 'w-20' : 'w-64'
      } bg-slate-900/95 dark:bg-slate-950/95 border-slate-800 text-slate-200 backdrop-blur-md shrink-0`}
    >
      {/* Brand Logo & Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800/80">
        {!collapsed && (
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-blue-500/25 ring-1 ring-white/20 shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                MyLifeHub
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">
                Life Operating System
              </span>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center rounded-xl transition-all font-medium text-sm group ${
                collapsed ? 'justify-center p-3' : 'px-3.5 py-2.5 justify-between'
              } ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600/30 to-indigo-600/20 text-blue-400 border border-blue-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-blue-400' : 'text-slate-400'
                  }`}
                />
                {!collapsed && (
                  <div className="flex flex-col text-left">
                    <span className={isActive ? 'text-white font-semibold' : ''}>{item.label}</span>
                    {item.sublabel && (
                      <span className="text-[10px] text-slate-500 font-normal">
                        {item.sublabel}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {!collapsed && item.badge && (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-slate-800 text-slate-400'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User profile & footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-blue-400 shrink-0">
                {profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-slate-200 truncate">
                  {profile?.fullName || (isGuest ? 'Guest User' : user?.email || 'User')}
                </span>
                <span className="text-[10px] text-slate-400 truncate">
                  {profile?.preferredCurrency || 'INR'} • {isGuest ? 'Demo Mode' : 'Connected'}
                </span>
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => logout()}
            title="Sign Out"
            className="w-full flex justify-center p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};
