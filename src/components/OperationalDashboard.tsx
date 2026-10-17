import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LayoutDashboard,
  BarChart3,
  TrendingUp,
  Percent,
  Clock,
  Wrench,
  AlertOctagon,
  Flame,
  Activity,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Gauge,
  CheckCircle2,
  DollarSign,
  Filter,
  Search,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import {
  FleetKPIs,
  StatusDistributionItem,
  TypeDistributionItem,
  MachineDowntimeLeaderboardItem,
  AvailabilityTrendItem,
  getOperationalKPIsApi,
  getAnalyticsDistributionsApi,
  AnalyticsFilterParams,
} from '../services/api';

interface OperationalDashboardProps {
  onNavigateTab?: (tab: string) => void;
}

export const OperationalDashboard: React.FC<OperationalDashboardProps> = ({ onNavigateTab }) => {
  const [kpis, setKpis] = useState<FleetKPIs | null>(null);
  const [statusDist, setStatusDist] = useState<StatusDistributionItem[]>([]);
  const [typeDist, setTypeDist] = useState<TypeDistributionItem[]>([]);
  const [downtimeLeaders, setDowntimeLeaders] = useState<MachineDowntimeLeaderboardItem[]>([]);
  const [trendData, setTrendData] = useState<AvailabilityTrendItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filteredAssetCount, setFilteredAssetCount] = useState<number | undefined>(undefined);

  // Advanced Multi-Dimensional Filter States
  const [equipmentFilter, setEquipmentFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [severityFilter, setSeverityFilter] = useState<string>('All');
  const [dateRange, setDateRange] = useState<string>('30d');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFiltersPanel, setShowFiltersPanel] = useState<boolean>(true);

  const availableEquipments = [
    { id: 'All', name: 'All Equipment Fleet' },
    { id: 'EXC-001', name: 'CAT 390F Heavy Excavator' },
    { id: 'EXC-002', name: 'Komatsu PC2000-8 Mining Shovel' },
    { id: 'DT-001', name: 'CAT 797F Ultra Haul Dump Truck' },
    { id: 'DT-002', name: 'BelAZ 75710 Heavy Dump Truck' },
    { id: 'LD-001', name: 'Komatsu WA900-8 Wheel Loader' },
    { id: 'DR-001', name: 'Epiroc Pit Viper 271 Rotary Drill' },
    { id: 'BD-001', name: 'CAT D11T Track Bulldozer' },
  ];

  const hasActiveFilters = useMemo(() => {
    return (
      equipmentFilter !== 'All' ||
      typeFilter !== 'All' ||
      statusFilter !== 'All' ||
      severityFilter !== 'All' ||
      dateRange !== '30d' ||
      searchQuery.trim() !== ''
    );
  }, [equipmentFilter, typeFilter, statusFilter, severityFilter, dateRange, searchQuery]);

  const resetFilters = () => {
    setEquipmentFilter('All');
    setTypeFilter('All');
    setStatusFilter('All');
    setSeverityFilter('All');
    setDateRange('30d');
    setSearchQuery('');
  };

  const applyPreset = (preset: 'all' | 'critical' | 'haul' | 'workshop') => {
    resetFilters();
    if (preset === 'critical') {
      setStatusFilter('Breakdown');
      setSeverityFilter('Critical');
    } else if (preset === 'haul') {
      setTypeFilter('Dump Truck');
      setStatusFilter('Running');
    } else if (preset === 'workshop') {
      setStatusFilter('Maintenance');
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: AnalyticsFilterParams = {
        equipmentId: equipmentFilter !== 'All' ? equipmentFilter : undefined,
        type: typeFilter !== 'All' ? typeFilter : undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        healthStatus: severityFilter !== 'All' ? severityFilter : undefined,
        search: searchQuery.trim() ? searchQuery.trim() : undefined,
        dateRange,
      };

      const [kpiRes, distRes] = await Promise.all([
        getOperationalKPIsApi(params),
        getAnalyticsDistributionsApi(params),
      ]);

      if (kpiRes.success && kpiRes.data) {
        setKpis(kpiRes.data);
        setFilteredAssetCount(kpiRes.filteredAssetCount);
      }

      if (distRes.success) {
        setStatusDist(distRes.statusDistribution || []);
        setTypeDist(distRes.typeDistribution || []);
        setDowntimeLeaders(distRes.downtimeLeaderboard || []);
        setTrendData(distRes.availabilityTrend || []);
      }
    } catch (err) {
      console.error('Failed to load operational analytics dashboard', err);
    } finally {
      setLoading(false);
    }
  }, [equipmentFilter, typeFilter, statusFilter, severityFilter, searchQuery, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <LayoutDashboard className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Executive Operational Dashboard & Asset Reliability Analytics
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                  <Activity className="w-3 h-3" />
                  Live Fleet KPIs
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time MTBF, MTTR, overall equipment effectiveness (OEE), fleet availability %, and downtime analytics
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              hasActiveFilters || showFiltersPanel
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Advanced Filters
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            )}
          </button>

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition cursor-pointer"
            title="Refresh dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Advanced Filter Toolbar Panel */}
      {showFiltersPanel && (
        <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3.5 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span>Multi-Dimensional Fleet Filters</span>
              {filteredAssetCount !== undefined && (
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono normal-case">
                  Showing {filteredAssetCount} asset{filteredAssetCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Filter Presets */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-400 text-[11px] mr-1 hidden sm:inline">Presets:</span>
              <button
                onClick={() => applyPreset('all')}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
              >
                All Fleet
              </button>
              <button
                onClick={() => applyPreset('critical')}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition cursor-pointer"
              >
                Critical Outages
              </button>
              <button
                onClick={() => applyPreset('haul')}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition cursor-pointer"
              >
                Active Hauling
              </button>
              <button
                onClick={() => applyPreset('workshop')}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition cursor-pointer"
              >
                In Workshop
              </button>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="px-2.5 py-1 rounded-md text-[11px] font-bold text-rose-400 hover:text-rose-300 transition flex items-center gap-1 ml-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* 6-Field Filter Inputs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
            {/* 1. Equipment Asset */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">Equipment</label>
              <select
                value={equipmentFilter}
                onChange={(e) => setEquipmentFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500 truncate cursor-pointer"
              >
                {availableEquipments.map((eq) => (
                  <option key={eq.id} value={eq.id} className="bg-slate-900 text-white">
                    {eq.id === 'All' ? 'All Units' : `${eq.id} - ${eq.name}`}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Machinery Type */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">Machine Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="All">All Types</option>
                <option value="Excavator">Excavators</option>
                <option value="Dump Truck">Dump Trucks</option>
                <option value="Loader">Loaders</option>
                <option value="Bulldozer">Bulldozers</option>
                <option value="Drilling Machine">Drills</option>
              </select>
            </div>

            {/* 3. Operational Status */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Running">Running (Active)</option>
                <option value="Idle">Idle (Staged)</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Breakdown">Breakdown</option>
              </select>
            </div>

            {/* 4. Health Severity */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">Health Severity</label>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="All">All Health Grades</option>
                <option value="Good">Good (Healthy)</option>
                <option value="Warning">Warning (Moderate)</option>
                <option value="Critical">Critical (High Risk)</option>
              </select>
            </div>

            {/* 5. Date / Time Window */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">Time Horizon</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="shift">Current Shift (12h)</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Quarter (90d)</option>
              </select>
            </div>

            {/* 6. Keyword Search */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">Search Filter</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="ID, Operator, Sector..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4 Core Reliability & Availability Metric Cards */}
      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium uppercase tracking-wider">Fleet Availability</span>
              <Percent className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white font-mono">
                {kpis.fleetAvailabilityRate}%
              </span>
              <span className="text-xs text-emerald-400 font-medium">Target &gt;85%</span>
            </div>
            <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all"
                style={{ width: `${kpis.fleetAvailabilityRate}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-2 block">
              {kpis.totalAssets - kpis.breakdownAssets} of {kpis.totalAssets} units operational in pit
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium uppercase tracking-wider">MTBF (Reliability)</span>
              <Clock className="w-4 h-4 text-sky-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white font-mono">
                {kpis.mtbfHours}
              </span>
              <span className="text-xs text-sky-400 font-medium">operating hrs</span>
            </div>
            <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-sky-500 h-1.5 rounded-full" style={{ width: '82%' }} />
            </div>
            <span className="text-[10px] text-slate-400 mt-2 block">
              Mean Time Between Failures across heavy fleet
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium uppercase tracking-wider">MTTR (Maintainability)</span>
              <Wrench className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-400 font-mono">
                {kpis.mttrHours}
              </span>
              <span className="text-xs text-slate-400 font-medium">hrs avg repair</span>
            </div>
            <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '45%' }} />
            </div>
            <span className="text-[10px] text-slate-400 mt-2 block">
              Mean Time To Repair for field breakdown events
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium uppercase tracking-wider">Cumulative Downtime</span>
              <AlertOctagon className="w-4 h-4 text-rose-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-rose-400 font-mono">
                {kpis.totalDowntimeHours}
              </span>
              <span className="text-xs text-slate-400 font-medium">hours</span>
            </div>
            <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: '56%' }} />
            </div>
            <span className="text-[10px] text-slate-400 mt-2 block">
              Est. Fleet Service Cost: ${kpis.totalMaintenanceCost.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Row 2: Visual Charts & Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Availability 7-Day Trend Chart (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                7-Day Operational Availability Trend
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Daily mining fleet uptime percentage and operational vs breakdown machines
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              Avg 89.9%
            </span>
          </div>

          {/* SVG Bar / Trend Chart */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
            <div className="h-44 flex items-end justify-between gap-3 pt-6 pb-2 px-2">
              {trendData.map((item, idx) => {
                const heightPercent = (item.availability / 100) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <span className="text-[11px] font-mono text-slate-300 font-bold">
                      {item.availability}%
                    </span>
                    <div className="w-full max-w-[36px] bg-slate-800 rounded-t-lg relative flex flex-col justify-end overflow-hidden h-32">
                      <div
                        className={`w-full rounded-t-lg transition-all duration-700 ${
                          item.availability > 90 ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-400">{item.day}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/80">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  Optimal (&gt;90%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  Degraded (&lt;90%)
                </span>
              </div>
              <span className="text-[11px] text-slate-500">Target Benchmark: 92.0%</span>
            </div>
          </div>

          {/* Status Breakdown Bar */}
          <div>
            <span className="text-xs font-bold text-white uppercase tracking-wider block mb-2">
              Fleet Operational Status Distribution
            </span>
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-800">
              {statusDist.map((item, i) => (
                <div
                  key={i}
                  style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                  title={`${item.status}: ${item.count} (${item.percentage}%)`}
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs">
              {statusDist.map((item, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300 font-medium">{item.status}:</span>
                  <span className="font-mono text-white font-bold">{item.count}</span>
                  <span className="text-[10px] text-slate-500">({item.percentage}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fleet Machinery Classes & Utilization (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" />
              Machinery Classes & Operating Load
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Active running units and average hours accumulated per category
            </p>
          </div>

          <div className="space-y-3">
            {typeDist.map((typeItem) => {
              const runPct = Math.round((typeItem.running / typeItem.count) * 100);
              return (
                <div
                  key={typeItem.type}
                  className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sm text-white">{typeItem.type}</span>
                      <span className="text-xs text-slate-400 block mt-0.5">
                        {typeItem.count} fleet units · Avg {typeItem.avgHours} operating hours
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-xs font-bold text-emerald-400">
                        {typeItem.running} / {typeItem.count} Running
                      </span>
                      <span className="text-[10px] text-slate-500 block">{runPct}% active</span>
                    </div>
                  </div>

                  <div className="mt-2.5 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-sky-500 h-1.5 rounded-full"
                      style={{ width: `${runPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3.5 bg-sky-950/20 border border-sky-900/40 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Gauge className="w-5 h-5 text-sky-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-white block">Continuous Live Telemetry Link</span>
                <span className="text-[11px] text-slate-400">
                  Real-time sensor engine streaming RPM, PSI, and vibration
                </span>
              </div>
            </div>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('telemetry')}
                className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold whitespace-nowrap transition"
              >
                Inspect Telemetry
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Machine Downtime Impact Leaderboard */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-rose-400" />
              Downtime Bottleneck Leaderboard (Top Maintenance Impact)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ranked by total accumulated maintenance & breakdown downtime hours
            </p>
          </div>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('maintenance')}
              className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-semibold"
            >
              Open Work Orders <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="pb-3 font-semibold">Rank</th>
                <th className="pb-3 font-semibold">Machinery ID & Name</th>
                <th className="pb-3 font-semibold">Category</th>
                <th className="pb-3 font-semibold">Current State</th>
                <th className="pb-3 font-semibold">Incident Count</th>
                <th className="pb-3 font-semibold">Total Downtime</th>
                <th className="pb-3 font-semibold">Downtime Impact Ratio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {downtimeLeaders.map((leader, i) => {
                const maxDowntime = downtimeLeaders[0]?.downtimeHours || 1;
                const impactPercent = Math.round((leader.downtimeHours / maxDowntime) * 100);
                return (
                  <tr key={leader.equipmentId} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 font-mono font-bold text-slate-500">#{i + 1}</td>
                    <td className="py-3">
                      <span className="font-mono font-bold text-white">{leader.equipmentId}</span>
                      <span className="text-slate-400 ml-2">· {leader.equipmentName}</span>
                    </td>
                    <td className="py-3 text-slate-300">{leader.equipmentType}</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          leader.status === 'Running'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : leader.status === 'Breakdown'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {leader.status}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-slate-300">{leader.incidentCount} events</td>
                    <td className="py-3 font-mono font-bold text-rose-400">
                      {leader.downtimeHours} hrs
                    </td>
                    <td className="py-3 w-44">
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-rose-500 h-1.5 rounded-full"
                          style={{ width: `${impactPercent}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
