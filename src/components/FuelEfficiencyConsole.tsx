import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Flame,
  TrendingDown,
  DollarSign,
  Leaf,
  Clock,
  Gauge,
  Sliders,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Truck,
  CheckCircle,
  HelpCircle,
  BarChart3,
  ArrowUpRight,
} from 'lucide-react';
import {
  getFuelEfficiencyAnalyticsApi,
  FuelEfficiencyResponse,
  EquipmentFuelProfileItem,
} from '../services/api';

interface FuelEfficiencyConsoleProps {
  onOpenAuth?: () => void;
}

export const FuelEfficiencyConsole: React.FC<FuelEfficiencyConsoleProps> = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FuelEfficiencyResponse | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'burnRate' | 'ecoScore' | 'idleCost' | 'fuelLevel'>('burnRate');

  // Interactive What-If Idle Reduction Slider
  const [idleReductionPct, setIdleReductionPct] = useState<number>(40);

  const fetchFuelData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getFuelEfficiencyAnalyticsApi();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch fuel efficiency analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFuelData();
  }, [fetchFuelData]);

  const summary = data?.summary;
  const equipmentList = data?.equipment || [];
  const hourlyTrend = data?.hourlyFuelTrend || [];

  // Filter and sort equipment
  const filteredEquipment = useMemo(() => {
    let result = [...equipmentList];

    if (typeFilter !== 'All') {
      result = result.filter((e) => e.type === typeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.equipmentId.toLowerCase().includes(q) ||
          e.name.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q) ||
          e.assignedOperator.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'burnRate') return b.currentBurnRateLh - a.currentBurnRateLh;
      if (sortBy === 'ecoScore') return b.ecoScore - a.ecoScore;
      if (sortBy === 'idleCost') return b.idleCostPerShiftUsd - a.idleCostPerShiftUsd;
      if (sortBy === 'fuelLevel') return a.currentFuelLevel - b.currentFuelLevel;
      return 0;
    });

    return result;
  }, [equipmentList, typeFilter, searchQuery, sortBy]);

  // Interactive savings calculation based on slider
  const simulatedSavings = useMemo(() => {
    const baseDailyIdleCost = summary?.totalDailyIdleCostUsd || 1450;
    const baseDailyIdleLiters = summary?.totalDailyIdleWastedLiters || 1130;
    const reductionRatio = idleReductionPct / 100;

    const dailyDollarsSaved = Math.round(baseDailyIdleCost * reductionRatio);
    const annualDollarsSaved = Math.round(dailyDollarsSaved * 365);
    const dailyLitersSaved = Math.round(baseDailyIdleLiters * reductionRatio);
    const annualCo2TonnesReduced = Number(((dailyLitersSaved * 2.68 * 365) / 1000).toFixed(1));

    return {
      dailyDollarsSaved,
      annualDollarsSaved,
      dailyLitersSaved,
      annualCo2TonnesReduced,
    };
  }, [summary, idleReductionPct]);

  // Eco grade styling
  const getEcoGradeBadge = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/40';
      case 'B':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/40';
      case 'C':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/40';
      case 'D':
      case 'F':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/40';
      default:
        return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  return (
    <div className="space-y-6 text-white pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Mining Fuel Intelligence & Eco-Metrics
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Flame className="w-6 h-6 text-amber-500" />
            Fuel Efficiency & Waste Reduction Analysis
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            Real-time burn rate monitoring, idle fuel waste quantification, OEM load-curve benchmarks, and carbon footprint telemetry.
          </p>
        </div>

        <button
          onClick={fetchFuelData}
          disabled={loading}
          className="self-start md:self-auto flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Recalculate Telemetry
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Level Economic KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* KPI 1: Live Burn Rate */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Fleet Burn Rate</div>
          <div className="text-2xl font-black text-amber-400 mt-2">
            {summary?.totalCurrentBurnRateLh || 428} <span className="text-xs text-slate-400 font-normal">L/h</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Across active machines</div>
        </div>

        {/* KPI 2: Daily Fuel Cost */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Est. Daily Fuel Cost</div>
          <div className="text-2xl font-black text-white mt-2">
            ${(summary?.totalDailyFuelCostUsd || 8765).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {(summary?.totalDailyFuelConsumedLiters || 6848).toLocaleString()} Liters/day
          </div>
        </div>

        {/* KPI 3: Idle Fuel Waste ($) */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider text-rose-400">Idle Fuel Waste</div>
          <div className="text-2xl font-black text-rose-400 mt-2">
            ${(summary?.totalDailyIdleCostUsd || 1446).toLocaleString()}
            <span className="text-xs text-slate-400 font-normal">/day</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {(summary?.totalDailyIdleWastedLiters || 1130).toLocaleString()} L unrecoverable idle
          </div>
        </div>

        {/* KPI 4: Fleet Eco Score */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Fleet Eco Score</div>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-2xl font-black text-emerald-400">{summary?.avgFleetEcoScore || 81}</span>
            <span className="text-xs text-slate-400">/ 100</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Load-adjusted efficiency</div>
        </div>

        {/* KPI 5: CO2 Emissions */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">CO₂ Footprint</div>
          <div className="text-2xl font-black text-white mt-2">
            {summary?.fleetCo2DailyTonnes || 18.3} <span className="text-xs text-slate-400 font-normal">T/day</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">EPA diesel combustion standard</div>
        </div>

        {/* KPI 6: Potential Annual Savings */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col justify-between border-emerald-500/30 bg-emerald-950/10">
          <div className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">Annual Opportunity</div>
          <div className="text-2xl font-black text-emerald-400 mt-2">
            ${((summary?.potentialAnnualSavingsUsd || 290000) / 1000).toFixed(0)}k
          </div>
          <div className="text-[10px] text-slate-400 mt-1">With 50% idle reduction</div>
        </div>
      </div>

      {/* Interactive What-If Idle Reduction Calculator */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/30 border border-slate-800 p-5 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="space-y-0.5">
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              What-If Idle Waste Mitigation Simulator
            </h3>
            <p className="text-xs text-slate-400">
              Drag the slider to preview the direct economic savings of operator auto-idle shutdown protocols.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">Reduction Target:</span>
            <span className="text-sm font-black text-emerald-400 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 font-mono">
              {idleReductionPct}% Idle Cut
            </span>
          </div>
        </div>

        {/* Slider Input */}
        <div className="space-y-2">
          <input
            type="range"
            min="10"
            max="80"
            step="5"
            value={idleReductionPct}
            onChange={(e) => setIdleReductionPct(Number(e.target.value))}
            className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>10% (Basic Policy)</span>
            <span>40% (Auto-Derate Staging)</span>
            <span>80% (Aggressive Telematics Shutdown)</span>
          </div>
        </div>

        {/* Simulated Impact Projections */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">Daily Cost Saved</span>
            <span className="text-lg font-black text-emerald-400 mt-1 block">
              +${simulatedSavings.dailyDollarsSaved.toLocaleString()}
            </span>
          </div>
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">Annual Operational Profit</span>
            <span className="text-lg font-black text-emerald-400 mt-1 block">
              +${simulatedSavings.annualDollarsSaved.toLocaleString()}
            </span>
          </div>
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">Diesel Conserved / Day</span>
            <span className="text-lg font-black text-white mt-1 block">
              {simulatedSavings.dailyLitersSaved.toLocaleString()} Liters
            </span>
          </div>
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">CO₂ Abated / Year</span>
            <span className="text-lg font-black text-cyan-400 mt-1 block">
              {simulatedSavings.annualCo2TonnesReduced} Tonnes CO₂
            </span>
          </div>
        </div>
      </div>

      {/* Hourly Fuel Burn Chart & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart: 24h Hourly Profile */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-500" />
                Fleet Fuel Burn Profile (24-Hour Cycle)
              </h3>
              <p className="text-xs text-slate-400">
                Hourly aggregate fuel burn (L/h) compared against optimal eco-efficiency baseline.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Actual Burn
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                Optimal Target
              </span>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="h-56 flex items-end justify-between gap-1.5 pt-6 pb-2 px-1">
            {hourlyTrend.map((pt, idx) => {
              const maxBurn = 550;
              const actualHeight = (pt.actualBurn / maxBurn) * 100;
              const targetHeight = (pt.targetBurn / maxBurn) * 100;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {/* Tooltip */}
                  <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950 border border-slate-700 px-2 py-1 rounded text-[10px] text-white whitespace-nowrap z-20 pointer-events-none shadow-xl">
                    <span className="font-bold">{pt.hour}</span>: {pt.actualBurn} L/h (Target: {pt.targetBurn} L/h)
                  </div>

                  {/* Dual Bars */}
                  <div className="w-full flex items-end justify-center gap-0.5 h-44">
                    {/* Actual */}
                    <div
                      className="w-1/2 bg-amber-500/80 hover:bg-amber-400 rounded-t transition-all"
                      style={{ height: `${actualHeight}%` }}
                    />
                    {/* Target */}
                    <div
                      className="w-1/2 bg-emerald-500/40 hover:bg-emerald-400/60 rounded-t transition-all"
                      style={{ height: `${targetHeight}%` }}
                    />
                  </div>

                  <span className="text-[9px] text-slate-500 font-mono truncate">{pt.hour}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Eco Champions & Highest Consumers */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-4 flex flex-col justify-between">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Leaf className="w-4 h-4 text-emerald-400" />
              Efficiency Extremes & Benchmarks
            </h3>
            <p className="text-xs text-slate-400">Top eco-performer vs heavy fuel burner.</p>
          </div>

          <div className="space-y-4">
            {/* Top Eco Performer */}
            {summary?.mostEfficient && (
              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Most Eco-Efficient Asset
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                    Score: {summary.mostEfficient.ecoScore}
                  </span>
                </div>
                <div className="text-sm font-bold text-white">{summary.mostEfficient.equipmentId}</div>
                <div className="text-xs text-slate-300">{summary.mostEfficient.name}</div>
                <p className="text-[11px] text-slate-400">
                  Minimal idle time and steady throttle application within OEM sweet-spot.
                </p>
              </div>
            )}

            {/* Highest Consumer */}
            {summary?.highestConsumer && (
              <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5" />
                    Highest Burn Rate Asset
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                    {summary.highestConsumer.burnRate} L/h
                  </span>
                </div>
                <div className="text-sm font-bold text-white">{summary.highestConsumer.equipmentId}</div>
                <div className="text-xs text-slate-300">{summary.highestConsumer.name}</div>
                <p className="text-[11px] text-slate-400">
                  High haul road ramp grade load or hydraulic continuous relief cycle.
                </p>
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-500 text-center">
            Fuel benchmarks updated continuously via telemetry streaming.
          </div>
        </div>
      </div>

      {/* Equipment-by-Equipment Fuel Breakdown Table & Cards */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-500" />
              Machine-by-Machine Fuel Profiles & Actionable Insights
            </h3>
            <p className="text-xs text-slate-400">
              Comparative burn metrics, idle loss analysis, and engineering recommendations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search machine, operator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 w-44"
              />
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="All">All Machine Types</option>
              <option value="Excavator">Excavators</option>
              <option value="Dump Truck">Dump Trucks</option>
              <option value="Loader">Loaders</option>
              <option value="Bulldozer">Bulldozers</option>
              <option value="Drilling Machine">Drilling Machines</option>
            </select>

            {/* Sort by */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="burnRate">Sort: Burn Rate (High to Low)</option>
              <option value="ecoScore">Sort: Eco Score (Best to Worst)</option>
              <option value="idleCost">Sort: Idle Waste $ (High to Low)</option>
              <option value="fuelLevel">Sort: Fuel Tank Level (Low First)</option>
            </select>
          </div>
        </div>

        {/* Machine Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEquipment.length > 0 ? (
            filteredEquipment.map((eq) => (
              <div
                key={eq.equipmentId}
                className="bg-slate-950 border border-slate-800/90 hover:border-slate-700 p-4 rounded-xl space-y-3.5 transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{eq.equipmentId}</span>
                      <span className="text-[10px] text-slate-400">· {eq.type}</span>
                    </div>
                    <div className="text-xs text-slate-300 font-medium truncate mt-0.5 max-w-[200px]">
                      {eq.name}
                    </div>
                  </div>

                  {/* Eco Score Badge */}
                  <div className={`px-2 py-0.5 rounded border text-[11px] font-bold ${getEcoGradeBadge(eq.ecoGrade)}`}>
                    Eco: {eq.ecoGrade} ({eq.ecoScore})
                  </div>
                </div>

                {/* Primary Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Current Burn vs Nominal */}
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Burn Rate:</span>
                    <span className="font-mono font-bold text-white text-sm">
                      {eq.currentBurnRateLh} L/h
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      OEM baseline: {eq.nominalBurnRateLh} L/h
                    </span>
                  </div>

                  {/* Idle Cost Shift */}
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Idle Waste:</span>
                    <span className="font-mono font-bold text-rose-400 text-sm">
                      ${eq.idleCostPerShiftUsd}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {eq.idleWastedLitersPerShift} L ({eq.idlePercentage}% idle)
                    </span>
                  </div>
                </div>

                {/* Fuel Tank Level Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Fuel Tank Level:</span>
                    <span className="font-mono font-bold text-white">
                      {eq.currentFuelLevel}% ({eq.currentFuelLiters} / {eq.fuelCapacity} L)
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all ${
                        eq.currentFuelLevel > 40
                          ? 'bg-amber-500'
                          : eq.currentFuelLevel > 20
                          ? 'bg-yellow-500'
                          : 'bg-rose-500 animate-pulse'
                      }`}
                      style={{ width: `${eq.currentFuelLevel}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 pt-0.5">
                    <span>Est. Run Time: ~{eq.estimatedRemainingHours}h</span>
                    <span>CO₂: {eq.co2EmissionsHourlyKg} kg/h</span>
                  </div>
                </div>

                {/* Operator & Location */}
                <div className="text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-900 pt-2">
                  <span className="truncate">Operator: <strong className="text-slate-300">{eq.assignedOperator}</strong></span>
                  <span className="truncate text-slate-500">{eq.location}</span>
                </div>

                {/* AI Engineering Recommendation */}
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 text-[11px] text-slate-300 flex items-start gap-2">
                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>{eq.optimizationRecommendation}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-slate-500 text-xs">
              No mining machines match the selected filter criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
