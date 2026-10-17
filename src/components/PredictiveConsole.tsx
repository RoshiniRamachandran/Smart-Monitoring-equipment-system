import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Brain,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Clock,
  ShieldAlert,
  Zap,
  RefreshCw,
  ChevronRight,
  Sliders,
  Search,
  Check,
  Award,
  BarChart3,
  SlidersHorizontal,
} from 'lucide-react';
import {
  PredictionAssessmentItem,
  getFleetPredictionsOverviewApi,
  getEquipmentPredictionApi,
  injectAnomalyApi,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

interface PredictiveConsoleProps {
  onOpenAuth?: () => void;
}

export const PredictiveConsole: React.FC<PredictiveConsoleProps> = ({ onOpenAuth }) => {
  const { isAuthenticated } = useAuth();

  const [fleetAssessments, setFleetAssessments] = useState<PredictionAssessmentItem[]>([]);
  const [stats, setStats] = useState({
    totalEquipments: 0,
    averageHealthScore: 0,
    highRiskCount: 0,
    totalActiveAnomalies: 0,
  });
  const [selectedEqId, setSelectedEqId] = useState<string>('DT-001');
  const [activeAssessment, setActiveAssessment] = useState<PredictionAssessmentItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [analyzingEq, setAnalyzingEq] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');

  const fetchFleetOverview = async () => {
    setLoading(true);
    try {
      const res = await getFleetPredictionsOverviewApi();
      if (res.success && res.data) {
        setFleetAssessments(res.data);
        if (res.stats) setStats(res.stats);

        // Update active selection
        const match = res.data.find((a) => a.equipmentId === selectedEqId);
        if (match) setActiveAssessment(match);
        else if (res.data.length > 0) {
          setActiveAssessment(res.data[0]);
          setSelectedEqId(res.data[0].equipmentId);
        }
      }
    } catch (err) {
      console.error('Failed to load predictive fleet overview', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEquipment = async (eqId: string) => {
    setSelectedEqId(eqId);
    const existing = fleetAssessments.find((item) => item.equipmentId === eqId);
    if (existing) {
      setActiveAssessment(existing);
    }
    setAnalyzingEq(true);
    try {
      const res = await getEquipmentPredictionApi(eqId);
      if (res.success && res.data) {
        setActiveAssessment(res.data);
        // update item in fleet array
        setFleetAssessments((prev) =>
          prev.map((item) => (item.equipmentId === eqId ? res.data : item))
        );
      }
    } catch (err) {
      console.error('Failed to analyze equipment with AI', err);
    } finally {
      setAnalyzingEq(false);
    }
  };

  useEffect(() => {
    fetchFleetOverview();
  }, []);

  // Filtered List
  const filteredAssessments = fleetAssessments.filter((item) => {
    const matchesSearch =
      item.equipmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.equipmentId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRisk = riskFilter === 'ALL' || item.riskLevel === riskFilter;
    return matchesSearch && matchesRisk;
  });

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'B':
        return 'text-sky-400 bg-sky-500/10 border-sky-500/30';
      case 'C':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'D':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'F':
      default:
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'Low':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'Moderate':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'High':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'Critical':
      default:
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <Brain className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Predictive Maintenance & Health Scoring
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Health Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Physics-informed machine learning estimating Remaining Useful Life (RUL), Failure Probability, and Root Causes
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchFleetOverview}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Predictions
          </button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Fleet Health Index</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">{stats.averageHealthScore}</span>
            <span className="text-xs text-slate-400">/ 100 Overall</span>
          </div>
          <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full ${
                stats.averageHealthScore > 75 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${stats.averageHealthScore}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">High Risk Units</span>
            <ShieldAlert className={`w-4 h-4 ${stats.highRiskCount > 0 ? 'text-rose-400' : 'text-slate-500'}`} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-3xl font-black font-mono ${stats.highRiskCount > 0 ? 'text-rose-400' : 'text-white'}`}>
              {stats.highRiskCount}
            </span>
            <span className="text-xs text-slate-400">of {stats.totalEquipments} assets</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">Immediate servicing recommended</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Predictive Anomalies</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-400 font-mono">
              {stats.totalActiveAnomalies}
            </span>
            <span className="text-xs text-slate-400">Active Sensor Deviations</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">Identified by vibration & thermal signatures</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">AI Inference Engine</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-purple-300 font-mono">Neural ML</span>
            <span className="text-xs text-emerald-400 font-medium">Online</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">Hybrid neural + deterministic physics fallback</div>
        </div>
      </div>

      {/* Main Split: Fleet List vs Deep AI Diagnostic Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Machinery Health Overview Table/Cards (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Filter Bar */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search machine or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
              />
            </div>

            <div className="flex items-center gap-1 text-xs">
              {['ALL', 'Low', 'Moderate', 'High', 'Critical'].map((risk) => (
                <button
                  key={risk}
                  onClick={() => setRiskFilter(risk)}
                  className={`px-2 py-1 rounded-lg font-medium transition ${
                    riskFilter === risk
                      ? 'bg-purple-600 text-white font-semibold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {risk}
                </button>
              ))}
            </div>
          </div>

          {/* Cards List */}
          <div className="space-y-3">
            {filteredAssessments.map((assessment) => {
              const isSelected = assessment.equipmentId === selectedEqId;
              return (
                <div
                  key={assessment.equipmentId}
                  onClick={() => handleSelectEquipment(assessment.equipmentId)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-850/90 border-purple-500/60 shadow-lg shadow-purple-500/5 ring-1 ring-purple-500/30'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl border flex flex-col items-center justify-center font-bold font-mono ${getGradeColor(
                          assessment.healthGrade
                        )}`}
                      >
                        <span className="text-base leading-none">{assessment.healthGrade}</span>
                        <span className="text-[9px] font-normal opacity-80 mt-0.5">
                          {assessment.healthScore}%
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">
                            {assessment.equipmentId}
                          </span>
                          <span className="text-xs text-slate-400">· {assessment.equipmentName}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {assessment.equipmentType}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getRiskBadge(
                          assessment.riskLevel
                        )}`}
                      >
                        {assessment.riskLevel} Risk
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 ${isSelected ? 'text-purple-400' : 'text-slate-600'}`}
                      />
                    </div>
                  </div>

                  {/* Metrics footer */}
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Est. RUL</span>
                      <span className="font-mono font-bold text-white">
                        {assessment.remainingUsefulLifeDays} <span className="text-[10px] font-normal text-slate-400">days</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Failure Prob.</span>
                      <span
                        className={`font-mono font-bold ${
                          assessment.failureProbability > 40 ? 'text-rose-400' : 'text-slate-300'
                        }`}
                      >
                        {assessment.failureProbability}%
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Engine Integrity</span>
                      <span className="font-mono font-bold text-white">
                        {assessment.componentBreakdown.engine}%
                      </span>
                    </div>
                  </div>

                  {assessment.anomalousSensors.length > 0 && (
                    <div className="mt-2 text-xs text-amber-300 bg-amber-950/30 border border-amber-800/40 p-2 rounded-xl flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{assessment.anomalousSensors[0]}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Detailed AI Diagnostic Report (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          {activeAssessment ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
                      AI Diagnostic Inspection
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                      {activeAssessment.source === 'gemini-ai' ? 'Neural ML Engine' : 'Physics Rule Engine'}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white mt-1">
                    {activeAssessment.equipmentName}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs text-slate-400 font-semibold bg-slate-800 px-2 py-0.5 rounded">
                      {activeAssessment.equipmentId}
                    </span>
                    <span className="text-xs text-slate-400">· {activeAssessment.equipmentType}</span>
                  </div>
                </div>

                <div
                  className={`w-14 h-14 rounded-2xl border flex flex-col items-center justify-center font-bold font-mono shadow-lg ${getGradeColor(
                    activeAssessment.healthGrade
                  )}`}
                >
                  <span className="text-2xl leading-none">{activeAssessment.healthGrade}</span>
                  <span className="text-[10px] font-normal opacity-80 mt-0.5">
                    {activeAssessment.healthScore}%
                  </span>
                </div>
              </div>

              {/* RUL and Failure Prob Meter */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs">Remaining Useful Life (RUL)</span>
                    <Clock className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold font-mono text-white">
                      {activeAssessment.remainingUsefulLifeDays}
                    </span>
                    <span className="text-xs text-slate-400">operational days</span>
                  </div>
                  <div className="mt-2 w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                    <div
                      className="bg-sky-400 h-1 rounded-full"
                      style={{
                        width: `${Math.min(100, (activeAssessment.remainingUsefulLifeDays / 120) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs">Failure Probability (30-day)</span>
                    <TrendingDown className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span
                      className={`text-2xl font-bold font-mono ${
                        activeAssessment.failureProbability > 30 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {activeAssessment.failureProbability}%
                    </span>
                    <span className="text-xs text-slate-400">breakdown risk</span>
                  </div>
                  <div className="mt-2 w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                    <div
                      className="bg-rose-500 h-1 rounded-full"
                      style={{ width: `${activeAssessment.failureProbability}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* AI Executive Summary */}
              <div className="bg-purple-950/20 border border-purple-900/40 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-purple-300 mb-1.5">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Predictive Diagnostic Summary
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {activeAssessment.aiAnalysisSummary}
                </p>
                <div className="mt-2.5 pt-2 border-t border-purple-900/30 text-[11px] text-purple-200/80">
                  <strong className="text-purple-300">Primary Risk Vector:</strong>{' '}
                  {activeAssessment.primaryRiskFactor}
                </div>
              </div>

              {/* Component Health Breakdown Progress Bars */}
              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 space-y-3">
                <span className="text-xs font-bold text-white block">Subsystem Integrity Health</span>

                <div className="space-y-2 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Internal Combustion Engine</span>
                      <span className="font-mono text-white">
                        {activeAssessment.componentBreakdown.engine}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full"
                        style={{ width: `${activeAssessment.componentBreakdown.engine}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Hydraulic Circuit & Pumps</span>
                      <span className="font-mono text-white">
                        {activeAssessment.componentBreakdown.hydraulics}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-sky-500 h-1.5 rounded-full"
                        style={{ width: `${activeAssessment.componentBreakdown.hydraulics}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Cooling & Radiator Core</span>
                      <span className="font-mono text-white">
                        {activeAssessment.componentBreakdown.coolingSystem}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full ${
                          activeAssessment.componentBreakdown.coolingSystem < 60
                            ? 'bg-rose-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${activeAssessment.componentBreakdown.coolingSystem}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Power Transmission & Drivetrain</span>
                      <span className="font-mono text-white">
                        {activeAssessment.componentBreakdown.transmission}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-amber-500 h-1.5 rounded-full"
                        style={{ width: `${activeAssessment.componentBreakdown.transmission}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Actionable Recommendations */}
              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
                <span className="text-xs font-bold text-white block mb-2.5">
                  Actionable Maintenance Work Orders
                </span>
                <div className="space-y-2">
                  {activeAssessment.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
              Select an equipment unit to view AI health diagnostics.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
