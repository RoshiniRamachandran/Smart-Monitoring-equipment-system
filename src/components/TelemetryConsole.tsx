import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Radio,
  Zap,
  Flame,
  Gauge,
  Thermometer,
  Droplet,
  BatteryCharging,
  Cpu,
  RefreshCw,
  AlertTriangle,
  Play,
  Pause,
  Sliders,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Search,
  CheckCircle2,
  FileDown,
} from 'lucide-react';
import {
  TelemetryReading,
  getLatestTelemetryApi,
  getEquipmentTelemetryHistoryApi,
  injectAnomalyApi,
  getExportCsvUrl,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

interface TelemetryConsoleProps {
  onOpenAuth?: () => void;
}

export const TelemetryConsole: React.FC<TelemetryConsoleProps> = ({ onOpenAuth }) => {
  const { user, isAuthenticated } = useAuth();

  // State
  const [readings, setReadings] = useState<TelemetryReading[]>([]);
  const [selectedEqId, setSelectedEqId] = useState<string>('DT-001');
  const [history, setHistory] = useState<TelemetryReading[]>([]);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMetric, setSelectedMetric] = useState<'rpm' | 'temp' | 'pressure' | 'vibration' | 'fuel'>(
    'temp'
  );
  const [isInjecting, setIsInjecting] = useState<boolean>(false);
  const [anomalyToast, setAnomalyToast] = useState<{ message: string; type: 'success' | 'error' } | null>(
    null
  );

  const eventSourceRef = useRef<EventSource | null>(null);

  // Initialize and SSE listener
  useEffect(() => {
    let sse: EventSource | null = null;

    if (isStreaming) {
      try {
        const streamUrl = `${import.meta.env.VITE_API_URL || '/api'}/telemetry/stream`;
        sse = new EventSource(streamUrl);
        eventSourceRef.current = sse;

        sse.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            if (parsed.type === 'telemetry_batch' && Array.isArray(parsed.data)) {
              setReadings(parsed.data);
              setLastUpdated(new Date().toLocaleTimeString());

              // Append to selected history
              const match = parsed.data.find((r: TelemetryReading) => r.equipmentId === selectedEqId);
              if (match) {
                setHistory((prev) => {
                  const next = [...prev, match];
                  return next.length > 30 ? next.slice(next.length - 30) : next;
                });
              }
            }
          } catch (e) {
            console.error('Failed to parse SSE payload', e);
          }
        };

        sse.onerror = () => {
          // Fallback to polling if SSE disconnected
          if (sse) sse.close();
        };
      } catch (err) {
        console.error('SSE initialization error, fallback to polling', err);
      }
    } else {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    }

    return () => {
      if (sse) sse.close();
    };
  }, [isStreaming, selectedEqId]);

  // Initial load or periodic poll fallback
  const fetchTelemetry = async () => {
    try {
      const res = await getLatestTelemetryApi();
      if (res.success && res.data) {
        setReadings(res.data);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('Fetch telemetry failed', err);
    }
  };

  const fetchHistory = async (eqId: string) => {
    try {
      const res = await getEquipmentTelemetryHistoryApi(eqId);
      if (res.success && res.data) {
        setHistory(res.data);
      }
    } catch (err) {
      console.error('Fetch history failed', err);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, []);

  useEffect(() => {
    if (selectedEqId) {
      fetchHistory(selectedEqId);
    }
  }, [selectedEqId]);

  // Active selected reading
  const selectedReading = readings.find((r) => r.equipmentId === selectedEqId) || readings[0];

  // Filtering
  const filteredReadings = readings.filter((r) => {
    const matchesSearch =
      r.equipmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.equipmentId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'ALL' || r.equipmentType === filterType;
    return matchesSearch && matchesType;
  });

  // Calculate fleet telemetry stats
  const activeSensorsCount = readings.length * 8;
  const anomaliesCount = readings.filter((r) => r.anomalyDetected).length;
  const avgEngineLoad =
    readings.length > 0
      ? Math.round(readings.reduce((acc, curr) => acc + curr.engineLoad, 0) / readings.length)
      : 0;
  const totalFuelRate =
    readings.length > 0
      ? Math.round(readings.reduce((acc, curr) => acc + curr.fuelConsumptionRate, 0))
      : 0;

  // Anomaly Injection Handler
  const handleTriggerAnomaly = async (
    anomalyType: 'temperature' | 'vibration' | 'pressure' | 'rpm'
  ) => {
    if (!isAuthenticated) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    setIsInjecting(true);
    try {
      const res = await injectAnomalyApi({
        equipmentId: selectedEqId,
        anomalyType,
      });
      if (res.success) {
        setAnomalyToast({
          message: `Simulated anomaly triggered on ${selectedEqId}: ${res.message}`,
          type: 'success',
        });
        setTimeout(() => setAnomalyToast(null), 5000);
      }
    } catch (err: any) {
      setAnomalyToast({
        message: err.response?.data?.message || 'Failed to inject anomaly',
        type: 'error',
      });
      setTimeout(() => setAnomalyToast(null), 5000);
    } finally {
      setIsInjecting(false);
    }
  };

  // Sparkline generator for SVG
  const renderSparkline = (
    data: number[],
    minVal: number,
    maxVal: number,
    color: string,
    fillColor: string
  ) => {
    if (!data || data.length < 2) {
      return <div className="h-14 flex items-center justify-center text-xs text-slate-400">Awaiting stream...</div>;
    }

    const width = 300;
    const height = 54;
    const padding = 4;

    const points = data.map((val, idx) => {
      const x = padding + (idx / (data.length - 1)) * (width - 2 * padding);
      const normalized = Math.max(0, Math.min(1, (val - minVal) / (maxVal - minVal || 1)));
      const y = height - padding - normalized * (height - 2 * padding);
      return `${x},${y}`;
    });

    const pathString = `M ${points.join(' L ')}`;
    const areaString = `${pathString} L ${width - padding},${height} L ${padding},${height} Z`;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-14 overflow-visible">
        <defs>
          <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={fillColor} stopOpacity="0.4" />
            <stop offset="100%" stopColor={fillColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={areaString} fill={`url(#grad-${color})`} />
        <path d={pathString} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.length > 0 && (
          <circle
            cx={Number(points[points.length - 1].split(',')[0])}
            cy={Number(points[points.length - 1].split(',')[1])}
            r="4"
            fill={color}
            className="animate-pulse"
          />
        )}
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast alert */}
      {anomalyToast && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center justify-between shadow-lg border transition-all ${
            anomalyToast.type === 'success'
              ? 'bg-amber-900/90 text-amber-100 border-amber-600'
              : 'bg-rose-900/90 text-rose-100 border-rose-600'
          }`}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="font-medium">{anomalyToast.message}</span>
          </div>
          <button
            onClick={() => setAnomalyToast(null)}
            className="text-xs px-2.5 py-1 bg-black/40 hover:bg-black/60 rounded"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Header & Simulation Controls */}
      <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Radio className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  IoT Telemetry Simulator & Live Sensor Stream
                </h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  SSE LIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time physics telemetry engine streaming CAN bus / Modbus sensor vectors every 3.0s
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={() => setIsStreaming(!isStreaming)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border shadow-sm ${
              isStreaming
                ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isStreaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isStreaming ? 'Stream Running' : 'Stream Paused'}
          </button>

          <button
            onClick={fetchTelemetry}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl transition"
            title="Manual refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <a
            href={getExportCsvUrl('telemetry', { equipmentId: selectedEqId })}
            download
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            title="Export telemetry stream as CSV"
          >
            <FileDown className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </a>

          <div className="text-right pl-2 border-l border-slate-800">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">
              Last Sensor Frame
            </span>
            <span className="text-xs font-mono text-slate-300">{lastUpdated || 'Streaming...'}</span>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Active Sensor Channels</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">{activeSensorsCount}</span>
            <span className="text-xs text-emerald-400 font-medium">8 per vehicle</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">Temp, RPM, PSI, Vibration, Fuel, Load, Voltage</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Detected Anomaly Flags</span>
            <AlertTriangle className={`w-4 h-4 ${anomaliesCount > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-black font-mono ${anomaliesCount > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
              {anomaliesCount}
            </span>
            <span className="text-xs text-slate-400">Fleet Units Exceeding Threshold</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">Auto-logged to predictive anomaly buffer</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Fleet Avg Engine Load</span>
            <Gauge className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">{avgEngineLoad}%</span>
            <span className="text-xs text-sky-400 font-medium">Duty Cycle</span>
          </div>
          <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-sky-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${avgEngineLoad}%` }} />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Fleet Fuel Consumption</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">{totalFuelRate}</span>
            <span className="text-xs text-amber-400 font-medium">L / hr total</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">Aggregate burn rate across running fleet</div>
        </div>
      </div>

      {/* Main 2-Column Split: Telemetry Dashboard & Live Vehicle Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Machinery Fleet Real-time Feed (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Filter Bar */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search equipment ID or machine name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto text-xs">
              {['ALL', 'Excavator', 'Dump Truck', 'Bulldozer', 'Drilling Machine'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                    filterType === type
                      ? 'bg-amber-500 text-slate-950 font-semibold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid of Machines */}
          <div className="space-y-3">
            {filteredReadings.map((reading) => {
              const isSelected = reading.equipmentId === selectedEqId;
              return (
                <div
                  key={reading.equipmentId}
                  onClick={() => setSelectedEqId(reading.equipmentId)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-850/90 border-amber-500/60 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/30'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-white font-mono">
                        {reading.equipmentId.substring(0, 3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{reading.equipmentId}</span>
                          <span className="text-xs text-slate-400">· {reading.equipmentName}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {reading.equipmentType}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {reading.anomalyDetected ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Anomaly
                        </span>
                      ) : (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            reading.operationalStatus === 'Running'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : reading.operationalStatus === 'Idle'
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {reading.operationalStatus}
                        </span>
                      )}
                      <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-slate-600'}`} />
                    </div>
                  </div>

                  {/* 4 Essential Quick Gauges */}
                  <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-800/80">
                    <div className="bg-slate-950/40 rounded-xl p-2 border border-slate-800/40">
                      <span className="text-[10px] text-slate-500 uppercase block">Engine RPM</span>
                      <span className="text-xs font-mono font-bold text-white mt-0.5 block">
                        {reading.engineRpm} <span className="text-[9px] font-normal text-slate-400">rpm</span>
                      </span>
                    </div>

                    <div className="bg-slate-950/40 rounded-xl p-2 border border-slate-800/40">
                      <span className="text-[10px] text-slate-500 uppercase block">Coolant Temp</span>
                      <span
                        className={`text-xs font-mono font-bold mt-0.5 block ${
                          reading.temperature > 98 ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {reading.temperature} <span className="text-[9px] font-normal text-slate-400">°C</span>
                      </span>
                    </div>

                    <div className="bg-slate-950/40 rounded-xl p-2 border border-slate-800/40">
                      <span className="text-[10px] text-slate-500 uppercase block">Oil Pressure</span>
                      <span
                        className={`text-xs font-mono font-bold mt-0.5 block ${
                          reading.oilPressure < 25 && reading.operationalStatus === 'Running'
                            ? 'text-rose-400'
                            : 'text-sky-400'
                        }`}
                      >
                        {reading.oilPressure} <span className="text-[9px] font-normal text-slate-400">psi</span>
                      </span>
                    </div>

                    <div className="bg-slate-950/40 rounded-xl p-2 border border-slate-800/40">
                      <span className="text-[10px] text-slate-500 uppercase block">Vibration</span>
                      <span
                        className={`text-xs font-mono font-bold mt-0.5 block ${
                          reading.vibration > 5.0 ? 'text-amber-400' : 'text-slate-300'
                        }`}
                      >
                        {reading.vibration} <span className="text-[9px] font-normal text-slate-400">mm/s</span>
                      </span>
                    </div>
                  </div>

                  {reading.anomalyDetected && reading.anomalyReason && (
                    <div className="mt-2.5 text-xs text-rose-300 bg-rose-950/40 border border-rose-800/50 p-2 rounded-xl flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>{reading.anomalyReason}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Deep Vehicle Telemetry Inspector & Live Oscillogram (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {selectedReading ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                    Detailed Telemetry Inspector
                  </span>
                  <h2 className="text-lg font-bold text-white mt-0.5">{selectedReading.equipmentName}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs text-slate-400 font-semibold bg-slate-800 px-2 py-0.5 rounded">
                      ID: {selectedReading.equipmentId}
                    </span>
                    <span className="text-xs text-slate-400">· {selectedReading.equipmentType}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      selectedReading.operationalStatus === 'Running'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : selectedReading.operationalStatus === 'Idle'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {selectedReading.operationalStatus}
                  </span>
                </div>
              </div>

              {/* Time-Series Real-time Graph */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-amber-400" />
                    Live Sensor Trend Stream
                  </span>

                  {/* Metric Switcher */}
                  <div className="flex items-center gap-1 text-[11px]">
                    {[
                      { id: 'temp', label: 'Temp' },
                      { id: 'rpm', label: 'RPM' },
                      { id: 'pressure', label: 'PSI' },
                      { id: 'vibration', label: 'Vib' },
                      { id: 'fuel', label: 'Fuel' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMetric(m.id as any)}
                        className={`px-2 py-0.5 rounded font-medium transition ${
                          selectedMetric === m.id
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SVG Live Sparkline Render */}
                <div>
                  {selectedMetric === 'temp' &&
                    renderSparkline(
                      history.map((h) => h.temperature),
                      50,
                      120,
                      '#f97316',
                      '#ea580c'
                    )}
                  {selectedMetric === 'rpm' &&
                    renderSparkline(
                      history.map((h) => h.engineRpm),
                      500,
                      2400,
                      '#38bdf8',
                      '#0284c7'
                    )}
                  {selectedMetric === 'pressure' &&
                    renderSparkline(
                      history.map((h) => h.oilPressure),
                      10,
                      80,
                      '#34d399',
                      '#059669'
                    )}
                  {selectedMetric === 'vibration' &&
                    renderSparkline(
                      history.map((h) => h.vibration),
                      0,
                      10,
                      '#a855f7',
                      '#7c3aed'
                    )}
                  {selectedMetric === 'fuel' &&
                    renderSparkline(
                      history.map((h) => h.fuelLevel),
                      0,
                      100,
                      '#eab308',
                      '#ca8a04'
                    )}
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 font-mono">
                  <span>-90 seconds</span>
                  <span>Live Stream Window (Last 30 samples)</span>
                  <span>Now</span>
                </div>
              </div>

              {/* Comprehensive 8-Sensor Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px]">Coolant Temp</span>
                    <Thermometer className="w-3.5 h-3.5 text-orange-400" />
                  </div>
                  <div className="text-base font-bold font-mono text-white mt-1">
                    {selectedReading.temperature} °C
                  </div>
                  <span className="text-[10px] text-slate-500">Threshold: &lt;100°C</span>
                </div>

                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px]">Engine RPM</span>
                    <Cpu className="w-3.5 h-3.5 text-sky-400" />
                  </div>
                  <div className="text-base font-bold font-mono text-white mt-1">
                    {selectedReading.engineRpm} RPM
                  </div>
                  <span className="text-[10px] text-slate-500">Nominal: 1400 - 2100</span>
                </div>

                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px]">Engine Oil Pressure</span>
                    <Droplet className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="text-base font-bold font-mono text-white mt-1">
                    {selectedReading.oilPressure} PSI
                  </div>
                  <span className="text-[10px] text-slate-500">Nominal: 40 - 70 PSI</span>
                </div>

                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px]">Bearing Vibration</span>
                    <Activity className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <div className="text-base font-bold font-mono text-white mt-1">
                    {selectedReading.vibration} mm/s
                  </div>
                  <span className="text-[10px] text-slate-500">ISO Limit: &lt;5.0 mm/s</span>
                </div>

                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px]">Fuel Level</span>
                    <Flame className="w-3.5 h-3.5 text-yellow-400" />
                  </div>
                  <div className="text-base font-bold font-mono text-white mt-1">
                    {selectedReading.fuelLevel}%
                  </div>
                  <span className="text-[10px] text-slate-500">Burn: {selectedReading.fuelConsumptionRate} L/h</span>
                </div>

                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px]">Hydraulic System</span>
                    <Gauge className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div className="text-base font-bold font-mono text-white mt-1">
                    {selectedReading.hydraulicPressure} Bar
                  </div>
                  <span className="text-[10px] text-slate-500">Main Circuit</span>
                </div>

                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px]">Alternator Voltage</span>
                    <BatteryCharging className="w-3.5 h-3.5 text-green-400" />
                  </div>
                  <div className="text-base font-bold font-mono text-white mt-1">
                    {selectedReading.batteryVoltage} V
                  </div>
                  <span className="text-[10px] text-slate-500">24V Heavy System</span>
                </div>

                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px]">Engine Load</span>
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="text-base font-bold font-mono text-white mt-1">
                    {selectedReading.engineLoad}%
                  </div>
                  <span className="text-[10px] text-slate-500">ECU Throttle Duty</span>
                </div>
              </div>

              {/* Anomaly Simulator Injection Controls */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    Simulated Fault Injection Tool
                  </span>
                  {!isAuthenticated && (
                    <span className="text-[10px] text-amber-400 underline cursor-pointer" onClick={onOpenAuth}>
                      Login required
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mb-3">
                  Inject live test sensor anomalies into <span className="text-amber-300 font-mono font-semibold">{selectedReading.equipmentId}</span> to verify threshold alarm triggers and predictive maintenance alarms.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    disabled={isInjecting}
                    onClick={() => handleTriggerAnomaly('temperature')}
                    className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-[11px] font-semibold transition flex flex-col items-center gap-1 text-center"
                  >
                    <Thermometer className="w-4 h-4 text-rose-400" />
                    <span>Overheat (108°C)</span>
                  </button>

                  <button
                    disabled={isInjecting}
                    onClick={() => handleTriggerAnomaly('vibration')}
                    className="p-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-xl text-[11px] font-semibold transition flex flex-col items-center gap-1 text-center"
                  >
                    <Activity className="w-4 h-4 text-purple-400" />
                    <span>Bearing Fault</span>
                  </button>

                  <button
                    disabled={isInjecting}
                    onClick={() => handleTriggerAnomaly('pressure')}
                    className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-[11px] font-semibold transition flex flex-col items-center gap-1 text-center"
                  >
                    <Droplet className="w-4 h-4 text-amber-400" />
                    <span>Low Oil (14 PSI)</span>
                  </button>

                  <button
                    disabled={isInjecting}
                    onClick={() => handleTriggerAnomaly('rpm')}
                    className="p-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-xl text-[11px] font-semibold transition flex flex-col items-center gap-1 text-center"
                  >
                    <Cpu className="w-4 h-4 text-sky-400" />
                    <span>Overspeed (2450)</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
              Select an equipment unit to inspect live telemetry sensors.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
