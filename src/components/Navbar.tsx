import React, { useState, useEffect } from 'react';
import {
  HardHat,
  Database,
  Server,
  RefreshCw,
  User,
  LogIn,
  LogOut,
  Activity,
  Calendar,
  FileDown,
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  serverOnline: boolean;
  dbStatus: 'connected' | 'disconnected' | 'connecting' | 'error';
  onRefresh: () => void;
  loading: boolean;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  activeTab?: string;
  onNavigateTab?: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  serverOnline,
  dbStatus,
  onRefresh,
  loading,
  onOpenAuth,
  activeTab,
  onNavigateTab,
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div 
            className="flex items-center gap-3 shrink-0 cursor-pointer select-none"
            onClick={() => onNavigateTab && onNavigateTab('dashboard')}
            title="Smart Mining Equipment System"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
              <HardHat className="w-6 h-6" />
            </div>
            <div className="shrink-0 flex flex-col justify-center">
              <span className="font-bold tracking-tight text-white text-base sm:text-lg whitespace-nowrap leading-tight">
                Smart Mining Equipment System
              </span>
              <span className="text-[11px] text-slate-400 hidden xl:block whitespace-nowrap leading-tight mt-0.5">
                Industrial Telemetry, Preventive Maintenance & Fleet Analytics
              </span>
            </div>
          </div>

          {/* System Status Pills & User Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Express Server Health */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700/60">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-300">Express:</span>
              <StatusBadge
                status={serverOnline ? 'online' : 'offline'}
                label={serverOnline ? 'Running' : 'Offline'}
                size="sm"
              />
            </div>

            {/* MongoDB Health */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700/60">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-300">MongoDB:</span>
              <StatusBadge
                status={dbStatus}
                label={dbStatus === 'connected' ? 'Connected' : 'Atlas Ready'}
                size="sm"
              />
            </div>

            {/* Refresh Button */}
            <button
              id="refresh-diagnostics-btn"
              onClick={onRefresh}
              disabled={loading}
              title="Ping Backend & Re-check Status"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center gap-1.5 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
              <span className="hidden sm:inline">Ping</span>
            </button>

            {/* User Auth Control */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2 bg-slate-800/90 pl-3 pr-1.5 py-1 rounded-lg border border-slate-700">
                <div className="text-right">
                  <div className="text-xs font-bold text-white leading-tight flex items-center gap-1.5 justify-end">
                    <span>{user.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                      user.role === 'Admin'
                        ? 'bg-amber-500/20 text-amber-300'
                        : user.role === 'Manager'
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {user.role}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                    {user.email}
                  </div>
                </div>
                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-1.5 rounded bg-slate-700 hover:bg-rose-500/30 text-slate-300 hover:text-rose-300 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onOpenAuth('login')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Crew Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
