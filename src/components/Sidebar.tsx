import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { LogIn, LogOut, ShieldCheck, ShoppingBag, ClipboardList, BarChart3, Binary, RefreshCw, Terminal, ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
  syncStatus: 'synced' | 'syncing' | 'offline';
  onForceSync: () => void;
  txCount: number;
  currentUser: User | null;
  onLogin: () => void;
  onLogout: () => void;
}

export default function Sidebar({ currentView, setView, syncStatus, onForceSync, txCount, currentUser, onLogin, onLogout }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch (e) {
      console.warn("localStorage view check state blocked:", e);
      return false;
    }
  });

  const handleToggle = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem('sidebar_collapsed', String(next));
    } catch (e) {
      console.warn("localStorage save state blocked:", e);
    }
  };

  const menuItems = [
    { id: 'register', label: 'Cashier Register', icon: ShoppingBag, description: 'Point of Sale' },
    { id: 'inventory', label: 'Inventory Desk', icon: ClipboardList, description: 'Stock & SKUs' },
    { id: 'analytics', label: 'Dremo Intelligence', icon: BarChart3, description: 'Revenue & Logs' },
    { id: 'macros', label: 'VBA Macro Lab', icon: Binary, description: 'Excel Automations' },
  ];

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-68'} bg-slate-900 text-white flex flex-col justify-between border-r border-slate-800 shrink-0 h-screen select-none transition-all duration-300 relative`}>
      {/* Edge collapse trigger handle */}
      <button
        id="sidebar-toggle-btn"
        onClick={handleToggle}
        className="absolute top-6.5 -right-3 z-50 size-6 rounded-full border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center shadow-lg cursor-pointer transition-colors"
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
      </button>

      {/* Brand Header */}
      <div>
        <div className={`p-6 border-b border-slate-800 transition-all text-center ${isCollapsed ? 'py-6 px-2' : ''}`}>
          {!isCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="size-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-lg tracking-wider text-white shadow-lg shadow-indigo-500/20 shrink-0">
                DR
              </div>
              <div className="text-left">
                <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent whitespace-nowrap">
                  Dremo POS
                </h1>
                <p className="text-xs text-slate-400 font-medium whitespace-nowrap">Modern Excel Hybrid</p>
              </div>
            </div>
          ) : (
            <div className="size-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-lg tracking-wider text-white shadow-lg shadow-indigo-500/20 mx-auto shrink-0" title="Dremo POS - Modern Excel Hybrid">
              DR
            </div>
          )}
        </div>

        {/* Navigation Options */}
        <nav className="p-4 space-y-1.5">
          {!isCollapsed ? (
            <p className="px-3 text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-2">Workspace</p>
          ) : (
            <div className="h-4" />
          )}
          {menuItems.map((item) => {
            const Icon = item.icon;
            const IsActive = currentView === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-btn-${item.id}`}
                onClick={() => setView(item.id)}
                title={isCollapsed ? `${item.label} - ${item.description}` : undefined}
                className={`w-full flex items-center transition-all duration-150 ${
                  isCollapsed
                    ? 'justify-center p-3 rounded-xl'
                    : 'gap-3.5 px-3 py-3 rounded-lg text-left'
                } ${
                  IsActive
                    ? 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/10'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                <Icon className={`size-5 shrink-0 ${IsActive ? 'text-white' : 'text-slate-400'}`} />
                {!isCollapsed && (
                  <div className="overflow-hidden">
                    <div className="text-sm font-semibold truncate leading-tight">{item.label}</div>
                    <div className={`text-[10px] truncate ${IsActive ? 'text-indigo-200' : 'text-slate-500'}`}>
                      {item.description}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Spreadsheet Status & Cashier Info */}
      <div className={`p-4 border-t border-slate-800 bg-slate-950/40 transition-all ${
        isCollapsed ? 'space-y-4 px-2' : 'space-y-4'
      }`}>
        {/* Sync panel */}
        {!isCollapsed ? (
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`inline-block size-2 rounded-full ${
                  syncStatus === 'synced' ? 'bg-emerald-500 animate-pulse' :
                  syncStatus === 'syncing' ? 'bg-amber-400 animate-spin' : 'bg-rose-400'
                }`} />
                <span className="text-xs font-semibold text-slate-300">
                  {syncStatus === 'synced' ? 'Excel Live-Sync' :
                   syncStatus === 'syncing' ? 'Publishing Sheet...' : 'Local Cache Only'}
                </span>
              </div>
              <button
                id="btn-sync-trigger"
                onClick={onForceSync}
                disabled={syncStatus === 'syncing'}
                className="text-slate-400 hover:text-white transition-colors disabled:opacity-40 cursor-pointer"
                title="Force full recalculation and export"
              >
                <RefreshCw className="size-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed font-mono">
              {txCount} sales sheets buffered. Ready for XLSM workbook import.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-1">
            <div className="relative">
              <button
                id="btn-sync-trigger-collapsed"
                onClick={onForceSync}
                disabled={syncStatus === 'syncing'}
                className="size-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                title={`Excel Status: ${
                  syncStatus === 'synced' ? 'Synced (Live-Sync active)' :
                  syncStatus === 'syncing' ? 'Publishing Sheet...' : 'Offline (Local Cache Only)'
                }. Click to force sync.`}
              >
                <span className={`absolute -top-1 -right-1 size-2.5 rounded-full border-2 border-slate-900 ${
                  syncStatus === 'synced' ? 'bg-emerald-500 animate-pulse' :
                  syncStatus === 'syncing' ? 'bg-amber-400 animate-spin' : 'bg-rose-400'
                }`} />
                <RefreshCw className={`size-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        )}

        {/* Operating Cashier Profile */}
        {!isCollapsed ? (
          currentUser ? (
            <div className="flex items-center justify-between gap-2 p-1.5 bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
              <div className="flex items-center gap-2 overflow-hidden">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt="avatar"
                    referrerPolicy="no-referrer"
                    className="size-8 rounded-full ring-2 ring-indigo-500/50 shrink-0"
                  />
                ) : (
                  <div className="size-8 rounded-full bg-indigo-600 font-mono text-xs flex items-center justify-center text-white font-bold shrink-0">
                    {String(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="overflow-hidden">
                  <div className="text-xs font-semibold text-slate-200 truncate leading-tight flex items-center gap-1">
                    {currentUser.displayName || currentUser.email?.split('@')[0] || 'Yakubu Hakeem'}
                    <ShieldCheck className="size-3 text-indigo-400 shrink-0" />
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono truncate">
                    {currentUser.email}
                  </div>
                </div>
              </div>
              <button
                id="btn-logout"
                onClick={onLogout}
                className="p-1.5 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-rose-400 transition-colors shrink-0 cursor-pointer"
                title="Sign Out of Cloud Session"
              >
                <LogOut className="size-3.5" />
              </button>
            </div>
          ) : (
            <button
              id="btn-login-google"
              onClick={onLogin}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 transition-all cursor-pointer group"
            >
              <LogIn className="size-4 group-hover:translate-x-0.5 transition-transform" /> Sync to Cloud
            </button>
          )
        ) : (
          <div className="flex justify-center">
            {currentUser ? (
              <button
                id="btn-logout-collapsed"
                onClick={onLogout}
                className="size-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-400 transition-all cursor-pointer hover:bg-slate-800"
                title={`Logged in as: ${currentUser.email || 'Authenticated operator'}. Click to Log Out.`}
              >
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt="avatar"
                    referrerPolicy="no-referrer"
                    className="size-5 rounded-full"
                  />
                ) : (
                  <LogOut className="size-4" />
                )}
              </button>
            ) : (
              <button
                id="btn-login-collapsed"
                onClick={onLogin}
                className="size-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500 cursor-pointer"
                title="Unlock Real-time Database Sync (Log In with Google)"
              >
                <LogIn className="size-4 animate-bounce shrink-0" />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
