import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Calendar,
  AlertTriangle,
  Clock,
  Wrench,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  Info,
  RefreshCw,
  Cpu,
  Layers,
  Thermometer,
  Zap,
} from 'lucide-react';
import {
  getEquipmentHealthHistoryApi,
  getFleetHealthTimelineApi,
  EquipmentHealthHistoryResponse,
  HealthHistoryTimelinePoint,
  FleetHealthTimelineResponse,
} from '../services/api';

interface EquipmentHealthHistoryProps {
  initialEquipmentId?: string;
  onOpenAuth?: () => void;
}

export const EquipmentHealthHistory: React.FC<EquipmentHealthHistoryProps> = ({
  initialEquipmentId = 'EXC-001',
}) => {
  const [selectedEquipment, setSelectedEquipment] = useState<string>(initialEquipmentId);
  const [timeframeDays, setTimeframeDays] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<EquipmentHealthHistoryResponse | null>(null);
  const [fleetTimeline, setFleetTimeline] = useState<FleetHealthTimelineResponse | null>(null);
  const [activeMetricTab, setActiveMetricTab] = useState<'condition' | 'vibration' | 'temperature' | 'hydraulic'>('condition');
  const [hoveredPoint, setHoveredPoint] = useState<HealthHistoryTimelinePoint | null>(null);

  const availableEquipments = [
    { id: 'EXC-001', name: 'CAT 390F Heavy Excavator', type: 'Excavator' },
    { id: 'EXC-002', name: 'Komatsu PC2000-8 Mining Shovel', type: 'Excavator' },
    { id: 'DT-001', name: 'CAT 797F Ultra Haul Dump Truck', type: 'Dump Truck' },
    { id: 'DT-002', name: 'BelAZ 75710 Heavy Dump Truck', type: 'Dump Truck' },
    { id: 'LD-001', name: 'Komatsu WA900-8 Wheel Loader', type: 'Loader' },
    { id: 'DR-001', name: 'Epiroc Pit Viper 271 Rotary Drill', type: 'Drilling Machine' },
    { id: 'BD-001', name: 'CAT D11T Track Bulldozer', type: 'Bulldozer' },
  ];

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [hist, fleet] = await Promise.all([
        getEquipmentHealthHistoryApi(selectedEquipment, timeframeDays),
        getFleetHealthTimelineApi(),
      ]);
      setHistoryData(hist);
      setFleetTimeline(fleet);
      if (hist.timeline && hist.timeline.length > 0) {
        setHoveredPoint(hist.timeline[hist.timeline.length - 1]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch equipment health condition history.');
    } finally {
      setLoading(false);
    }
  }, [selectedEquipment, timeframeDays]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const timelinePoints = historyData?.timeline || [];
  const currentScore = historyData?.currentConditionScore ?? 85;
  const initialScore = historyData?.initialScore ?? 92;
  const netChange = historyData?.netConditionChange ?? -7;

  // Grade color helper
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
      case 'B':
        return 'text-blue-400 border-blue-500/40 bg-blue-500/10';
      case 'C':
        return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
      case 'D':
      case 'F':
        return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
      default:
        return 'text-slate-400 border-slate-700 bg-slate-800';
    }
  };

  return (
    <div className="space-y-6 text-white pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
              Prognostic Condition Tracking
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-cyan-400" />
            Equipment Health Condition History
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            Longitudinal degradation monitoring, sensor decay trajectories, and maintenance intervention impact analysis over time.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Equipment Selector */}
          <div className="relative">
            <select
              value={selectedEquipment}
              onChange={(e) => setSelectedEquipment(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer"
            >
              {availableEquipments.map((eq) => (
                <option key={eq.id} value={eq.id} className="bg-slate-900 text-white">
                  {eq.id} - {eq.name}
                </option>
              ))}
            </select>
          </div>

          {/* Timeframe Selector */}
          <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            {[14, 30, 60].map((d) => (
              <button
                key={d}
                onClick={() => setTimeframeDays(d)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  timeframeDays === d
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {d}D
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-all cursor-pointer"
            title="Refresh Health Timeline"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Health Metrics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Metric 1: Current Condition Score */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Current Condition</div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-white">{currentScore}%</span>
            <span className={`text-[11px] px-1.5 py-0.5 rounded border font-bold ${getGradeColor(historyData?.healthGrade || 'A')}`}>
              Grade {historyData?.healthGrade || 'A'}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Live Telemetry Evaluation</div>
        </div>

        {/* Metric 2: Net Condition Change */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{timeframeDays}D Condition Delta</div>
          <div className="flex items-center gap-1.5 mt-2">
            {netChange >= 0 ? (
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-amber-400" />
            )}
            <span className={`text-2xl font-black ${netChange >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {netChange > 0 ? `+${netChange}%` : `${netChange}%`}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">From {initialScore}% baseline</div>
        </div>

        {/* Metric 3: Degradation Velocity */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Wear Velocity</div>
          <div className="text-2xl font-black text-white mt-2">
            {historyData?.degradationRatePer100h ?? 0.28}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Loss per 100 operating hours</div>
        </div>

        {/* Metric 4: Projected RUL Hours */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Projected RUL</div>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-2xl font-black text-cyan-400">
              {historyData?.estimatedRemainingUsefulLifeHours ?? 420}h
            </span>
            <span className="text-xs text-slate-400">
              ({historyData?.estimatedRemainingUsefulLifeDays ?? 28}d)
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Until critical threshold</div>
        </div>

        {/* Metric 5: Estimated Critical Date */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Critical Threshold</div>
          <div className="text-sm font-bold text-amber-400 mt-2 truncate">
            {historyData?.projectedFailureDate || '2026-11-15'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Without maintenance intervention</div>
        </div>

        {/* Metric 6: Risk Level */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Fleet Risk Class</div>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span className="text-base font-bold text-white">
              {historyData?.riskLevel || 'Moderate'}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1 truncate">
            {historyData?.primaryRiskFactor || 'Bearing vibration'}
          </div>
        </div>
      </div>

      {/* Main Interactive Health Timeline Chart Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
        {/* Metric Tab Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Longitudinal Condition Decay & Recovery Curve
            </h3>
            <p className="text-xs text-slate-400">
              Interactive timeline with recorded operational events, service orders, and sensor degradation telemetry.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveMetricTab('condition')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                activeMetricTab === 'condition'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Overall Score
            </button>
            <button
              onClick={() => setActiveMetricTab('vibration')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                activeMetricTab === 'vibration'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Vibration (mm/s)
            </button>
            <button
              onClick={() => setActiveMetricTab('temperature')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                activeMetricTab === 'temperature'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Temp (°C)
            </button>
            <button
              onClick={() => setActiveMetricTab('hydraulic')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                activeMetricTab === 'hydraulic'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Hydraulics (Bar)
            </button>
          </div>
        </div>

        {/* SVG Curve Graph */}
        <div className="relative pt-4 pb-2">
          {timelinePoints.length > 0 ? (
            <div className="relative h-64 w-full">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 1000 240">
                <defs>
                  <linearGradient id="conditionGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
                {[0, 60, 120, 180, 240].map((y) => (
                  <line key={y} x1="0" y1={y} x2="1000" y2={y} stroke="#1e293b" strokeDasharray="3 3" strokeWidth="1" />
                ))}

                {/* Warning threshold line (70% score or warning sensor level) */}
                <line x1="0" y1="72" x2="1000" y2="72" stroke="#f59e0b" strokeOpacity="0.3" strokeDasharray="4 4" strokeWidth="1.5" />
                <text x="10" y="68" fill="#f59e0b" fontSize="10" fontWeight="bold">Warning Threshold (70%)</text>

                {/* Critical threshold line (40% score) */}
                <line x1="0" y1="144" x2="1000" y2="144" stroke="#f43f5e" strokeOpacity="0.3" strokeDasharray="4 4" strokeWidth="1.5" />
                <text x="10" y="140" fill="#f43f5e" fontSize="10" fontWeight="bold">Critical Failure Threshold (40%)</text>

                {/* Calculated SVG Polyline */}
                {(() => {
                  const points = timelinePoints.map((pt, idx) => {
                    const x = (idx / (timelinePoints.length - 1 || 1)) * 1000;
                    let val = pt.conditionScore;
                    if (activeMetricTab === 'vibration') {
                      val = 100 - (pt.vibration / 8.0) * 100;
                    } else if (activeMetricTab === 'temperature') {
                      val = 100 - ((pt.temperature - 60) / 50) * 100;
                    } else if (activeMetricTab === 'hydraulic') {
                      val = (pt.hydraulicPressure / 320) * 100;
                    }
                    const y = 240 - (val / 100) * 230;
                    return { x, y, pt };
                  });

                  const pathStr = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
                  const areaStr = `${pathStr} L 1000 240 L 0 240 Z`;

                  return (
                    <>
                      {/* Area Fill */}
                      <path d={areaStr} fill="url(#conditionGradient)" />
                      {/* Stroke Line */}
                      <path d={pathStr} fill="none" stroke="#06b6d4" strokeWidth="3" strokeLinecap="round" />

                      {/* Points & Events */}
                      {points.map((p, idx) => {
                        const hasEvent = !!p.pt.event;
                        const isHovered = hoveredPoint?.date === p.pt.date;

                        return (
                          <g
                            key={idx}
                            className="cursor-pointer transition-transform"
                            onMouseEnter={() => setHoveredPoint(p.pt)}
                          >
                            {/* Milestone Marker Pin */}
                            {hasEvent && (
                              <g>
                                <line
                                  x1={p.x}
                                  y1={p.y}
                                  x2={p.x}
                                  y2={p.y - 28}
                                  stroke={p.pt.eventType === 'maintenance' ? '#10b981' : '#f43f5e'}
                                  strokeWidth="1.5"
                                  strokeDasharray="2 2"
                                />
                                <circle
                                  cx={p.x}
                                  cy={p.y - 28}
                                  r="5"
                                  fill={p.pt.eventType === 'maintenance' ? '#10b981' : '#f43f5e'}
                                />
                              </g>
                            )}

                            {/* Node Dot */}
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={isHovered ? 6 : hasEvent ? 4.5 : 3}
                              fill={hasEvent ? (p.pt.eventType === 'maintenance' ? '#10b981' : '#f59e0b') : '#06b6d4'}
                              stroke="#0f172a"
                              strokeWidth={isHovered ? '3' : '1.5'}
                            />
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 text-xs">
              Loading condition timeline records...
            </div>
          )}

          {/* Time axis labels */}
          <div className="flex justify-between items-center text-[10px] text-slate-500 pt-3 border-t border-slate-800/80 px-1 font-mono">
            <span>{timelinePoints[0]?.date || '30 days ago'}</span>
            <span>{timelinePoints[Math.floor(timelinePoints.length / 2)]?.date || '15 days ago'}</span>
            <span className="text-cyan-400 font-bold">Today ({timelinePoints[timelinePoints.length - 1]?.date || 'Now'})</span>
          </div>
        </div>

        {/* Selected Data Point Inspector Card */}
        {hoveredPoint && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-sm">
                {hoveredPoint.conditionScore}%
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Inspection Snapshot: {hoveredPoint.date}</span>
                  {hoveredPoint.event && (
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                      hoveredPoint.eventType === 'maintenance'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      {hoveredPoint.eventType?.toUpperCase()} EVENT
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {hoveredPoint.event || 'Normal continuous sensor data recording (steady-state pit operation)'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Vibration:</span>
                <span className="font-mono font-bold text-white">{hoveredPoint.vibration} mm/s</span>
              </div>
              <div className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Coolant Temp:</span>
                <span className="font-mono font-bold text-white">{hoveredPoint.temperature}°C</span>
              </div>
              <div className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Hydraulics:</span>
                <span className="font-mono font-bold text-white">{hoveredPoint.hydraulicPressure} Bar</span>
              </div>
              <div className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Oil Quality:</span>
                <span className="font-mono font-bold text-white">{hoveredPoint.oilQualityScore}/100</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Subsystem Health Decomposition & Prognostics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Subsystem Health Radar / Component Gauges */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Subsystem Component Health Breakdown
            </h3>
            <span className="text-xs text-slate-400">Current Assessment</span>
          </div>

          <div className="space-y-3.5">
            {[
              { label: 'Engine & Turbocharger Subsystem', score: historyData?.componentScores?.engine ?? 88, icon: Thermometer },
              { label: 'Hydraulic Pumps & Cylinders', score: historyData?.componentScores?.hydraulics ?? 72, icon: Zap },
              { label: 'Drive Train & Transmission', score: historyData?.componentScores?.transmission ?? 84, icon: Activity },
              { label: 'Electrical & Sensor Network', score: historyData?.componentScores?.electrical ?? 92, icon: ShieldCheck },
              { label: 'Chassis & Structural Welds', score: historyData?.componentScores?.structural ?? 90, icon: Wrench },
            ].map((comp, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <div className="flex items-center gap-2 font-medium text-slate-200">
                    <comp.icon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{comp.label}</span>
                  </div>
                  <span className={`font-mono font-bold ${
                    comp.score >= 80 ? 'text-emerald-400' : comp.score >= 65 ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {comp.score}%
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      comp.score >= 80
                        ? 'bg-gradient-to-r from-emerald-500 to-cyan-500'
                        : comp.score >= 65
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                        : 'bg-gradient-to-r from-rose-600 to-red-500'
                    }`}
                    style={{ width: `${comp.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: AI Preventive Engineering Recommendations */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-cyan-400" />
                Condition-Based Maintenance Action Plan
              </h3>
              <span className="text-xs text-cyan-400 font-mono">Prognostic AI</span>
            </div>

            <div className="mt-4 space-y-2.5">
              {historyData?.recommendations && historyData.recommendations.length > 0 ? (
                historyData.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-300"
                  >
                    <ChevronRight className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 italic p-4 text-center">
                  All subsystems operating within standard OEM tolerances. Next scheduled inspection in 18 days.
                </div>
              )}
            </div>
          </div>

          {/* Fleet Timeline Comparison */}
          {fleetTimeline && (
            <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-800/30 text-xs">
              <div className="flex items-center justify-between text-cyan-300 font-bold mb-1">
                <span>Fleet-Wide Health Benchmark:</span>
                <span className="font-mono">{fleetTimeline.currentAverageScore}% Average</span>
              </div>
              <p className="text-[11px] text-slate-400">
                This asset ({selectedEquipment}) is currently operating at{' '}
                <span className={currentScore >= fleetTimeline.currentAverageScore ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {currentScore >= fleetTimeline.currentAverageScore ? 'above' : 'below'}
                </span>{' '}
                the fleet baseline average.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
