import React from 'react';
import {
  LayoutDashboard,
  Truck,
  Wrench,
  AlertTriangle,
  BarChart3,
  Bell,
  FileText,
  Radio,
  Lock,
  KeyRound,
  Brain,
  ClipboardCheck,
  Calendar,
  FileDown,
  Activity,
  ShieldCheck,
  MapPin,
  Flame,
  Layers,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const menuItems = [
    { id: 'telemetry', label: 'Live Telemetry', icon: Activity, badge: 'LIVE', enabled: true, isLive: true },
    { id: 'fleetmap', label: 'Fleet Site Map', icon: MapPin, badge: 'GPS/Tactical', enabled: true, isFeature: true },
    { id: 'fuelefficiency', label: 'Fuel & Eco Analysis', icon: Flame, badge: 'Eco/Waste', enabled: true, isFeature: true },
    { id: 'healthhistory', label: 'Health Condition History', icon: Layers, badge: 'Timeline', enabled: true, isFeature: true },
    { id: 'calendar', label: 'Maintenance Calendar', icon: Calendar, badge: 'Schedule', enabled: true, isFeature: true },
    { id: 'reports', label: 'Export Reports', icon: FileDown, badge: 'Audit/CSV', enabled: true, isFeature: true },
    { id: 'equipment', label: 'Fleet Registry', icon: Truck, badge: 'Assets', enabled: true },
    { id: 'maintenance', label: 'Maintenance Orders', icon: Wrench, badge: 'Work Orders', enabled: true },
    { id: 'breakdowns', label: 'Breakdown Logs', icon: AlertTriangle, badge: 'Incidents', enabled: true },
    { id: 'predictions', label: 'AI Health & RUL', icon: Brain, badge: 'Predictive', enabled: true },
    { id: 'dashboard', label: 'Fleet Analytics', icon: LayoutDashboard, badge: 'Analytics', enabled: true },
    { id: 'handovers', label: 'Shift Handovers', icon: ClipboardCheck, badge: 'Logs', enabled: true },
    { id: 'alerts', label: 'Alarms & Sirens', icon: Bell, badge: 'Alarms', enabled: true },
    { id: 'auth', label: 'Access Control', icon: KeyRound, badge: 'RBAC', enabled: true },
    { id: 'overview', label: 'System Health', icon: Radio, badge: 'Diagnostics', enabled: true },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
      <div className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)]">
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Navigation Modules</span>
          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            15 Modules Active
          </span>
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isSelected = activeTab === item.id;
          const isEnabled = item.enabled;

          return (
            <button
              key={item.id}
              onClick={() => isEnabled && onSelectTab(item.id)}
              disabled={!isEnabled}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : isEnabled
                  ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  : 'text-slate-500 cursor-not-allowed opacity-50 hover:bg-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon
                  className={`w-4 h-4 ${
                    isSelected
                      ? 'text-amber-400'
                      : item.isLive
                      ? 'text-emerald-400 animate-pulse'
                      : 'text-slate-400'
                  }`}
                />
                <span className="truncate font-medium">{item.label}</span>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                  item.isLive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1'
                    : isSelected
                    ? 'bg-amber-500/30 text-amber-200 border border-amber-500/40'
                    : item.isFeature
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {item.isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                {item.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer Info Box */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Industrial Mine System</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            All operational modules active. Live IoT telemetry, work orders, maintenance calendar, and compliance exports online.
          </p>
        </div>
      </div>
    </aside>
  );
};
