import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  Volume2,
  VolumeX,
  Plus,
  Search,
  Filter,
  FileDown,
  Download,
  ShieldAlert,
  Flame,
  Wrench,
  Clock,
  Check,
} from 'lucide-react';
import {
  AlarmItem,
  AlarmSeverity,
  AlarmStatus,
  getAlarmsApi,
  acknowledgeAlarmApi,
  resolveAlarmApi,
  triggerAlarmApi,
  getExportCsvUrl,
  getEquipmentListApi,
  EquipmentItem,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

interface IncidentAlarmsProps {
  onOpenAuth?: () => void;
}

export const IncidentAlarmsConsole: React.FC<IncidentAlarmsProps> = ({ onOpenAuth }) => {
  const { isAuthenticated, user } = useAuth();

  const [alarms, setAlarms] = useState<AlarmItem[]>([]);
  const [equipments, setEquipments] = useState<EquipmentItem[]>([]);
  const [activeCriticalCount, setActiveCriticalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Trigger Modal
  const [showTriggerModal, setShowTriggerModal] = useState<boolean>(false);
  const [formEqId, setFormEqId] = useState<string>('BD-001');
  const [formSeverity, setFormSeverity] = useState<AlarmSeverity>('Critical');
  const [formCategory, setFormCategory] = useState<string>('Transmission');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formTriggerValue, setFormTriggerValue] = useState<string>('');
  const [formThreshold, setFormThreshold] = useState<string>('');
  const [triggering, setTriggering] = useState<boolean>(false);

  // Web Audio Context synthesizer for industrial acoustic alarm siren
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sirenIntervalRef = useRef<any>(null);

  const playSirenChirp = () => {
    if (!audioEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          audioCtxRef.current = new AudioCtx();
        }
      }
      const ctx = audioCtxRef.current;
      if (ctx && ctx.state !== 'closed') {
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(750, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1150, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch {
      // Audio permission or unsupported
    }
  };

  const fetchAlarms = async () => {
    try {
      const [res, eqRes] = await Promise.all([getAlarmsApi(), getEquipmentListApi()]);
      if (res.success) {
        setAlarms(res.data);
        setActiveCriticalCount(res.activeCriticalCount);

        // If there are unacknowledged critical alarms with sirens, pulse tone
        if (res.activeCriticalCount > 0 && audioEnabled) {
          playSirenChirp();
        }
      }
      if (eqRes.success) {
        setEquipments(eqRes.data);
      }
    } catch (err) {
      console.error('Failed to load incident alarms', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlarms();
    const interval = setInterval(fetchAlarms, 6000);
    return () => clearInterval(interval);
  }, [audioEnabled]);

  const handleAcknowledge = async (id: string) => {
    try {
      const operator = user?.name || 'Shift Dispatcher';
      const res = await acknowledgeAlarmApi(id, operator);
      if (res.success) {
        setAlarms(alarms.map((a) => (a._id === id ? res.data : a)));
        setActiveCriticalCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to acknowledge alarm', err);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      const res = await resolveAlarmApi(id, 'Resolved and cleared in pit operations');
      if (res.success) {
        setAlarms(alarms.map((a) => (a._id === id ? res.data : a)));
      }
    } catch (err) {
      console.error('Failed to resolve alarm', err);
    }
  };

  const handleTriggerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTriggering(true);
    try {
      const res = await triggerAlarmApi({
        equipmentId: formEqId,
        severity: formSeverity,
        category: formCategory,
        title: formTitle,
        description: formDescription,
        triggerValue: formTriggerValue,
        threshold: formThreshold,
      });

      if (res.success) {
        setAlarms([res.data, ...alarms]);
        if (formSeverity === 'Critical') {
          setActiveCriticalCount((prev) => prev + 1);
          playSirenChirp();
        }
        setShowTriggerModal(false);
        setFormTitle('');
        setFormDescription('');
      }
    } catch (err) {
      console.error('Failed to trigger simulated alarm', err);
    } finally {
      setTriggering(false);
    }
  };

  const filteredAlarms = alarms.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.equipmentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.equipmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.alarmCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === 'ALL' || item.severity === severityFilter;
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const getSeverityBadge = (severity: AlarmSeverity) => {
    switch (severity) {
      case 'Critical':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
      case 'Warning':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'Caution':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      case 'Info':
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
              <Bell className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Real-Time Incident Alarms & Safety Dispatch
                </h1>
                {activeCriticalCount > 0 ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white flex items-center gap-1.5 animate-pulse">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    {activeCriticalCount} CRITICAL SIRENS
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    All Stations Nominal
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated ISO threshold triggers, mechanical failure alarms, acoustic sirens, and shift compliance reporting
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Audio Siren Toggle */}
          <button
            onClick={() => {
              setAudioEnabled(!audioEnabled);
              if (!audioEnabled) playSirenChirp();
            }}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-2 transition ${
              audioEnabled
                ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4 text-rose-400" /> : <VolumeX className="w-4 h-4" />}
            {audioEnabled ? 'Audio Siren Active' : 'Siren Muted'}
          </button>

          <button
            onClick={() => setShowTriggerModal(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-rose-600/20"
          >
            <Plus className="w-4 h-4" />
            Simulate Alarm
          </button>
        </div>
      </div>

      {/* Compliance Reports Quick Export Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <FileDown className="w-5 h-5 text-amber-400" />
          <div>
            <span className="text-sm font-bold text-white block">
              Official Shift Compliance Reports (CSV / Audit Ready)
            </span>
            <span className="text-xs text-slate-400">
              Directly download certified mine logs for government safety audits and OEM warranty claims
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <a
            href={getExportCsvUrl('fleet-status')}
            download
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl flex items-center gap-1.5 transition font-medium"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            Fleet Registry CSV
          </a>
          <a
            href={getExportCsvUrl('breakdowns')}
            download
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl flex items-center gap-1.5 transition font-medium"
          >
            <Download className="w-3.5 h-3.5 text-rose-400" />
            Breakdowns CSV
          </a>
          <a
            href={getExportCsvUrl('handovers')}
            download
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl flex items-center gap-1.5 transition font-medium"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            Pre-Starts CSV
          </a>
          <a
            href={getExportCsvUrl('alarms')}
            download
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl flex items-center gap-1.5 transition font-medium"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            Incident Alarms CSV
          </a>
        </div>
      </div>

      {/* Alarms Feed Filters */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search alarm title, code, equipment ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50"
          />
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase px-1">Severity:</span>
            {['ALL', 'Critical', 'Warning', 'Caution'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition ${
                  severityFilter === sev
                    ? 'bg-rose-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase px-1">Status:</span>
            {['ALL', 'Active', 'Acknowledged', 'Resolved'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition ${
                  statusFilter === st
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alarms Feed List */}
      <div className="space-y-3">
        {filteredAlarms.map((alarm) => {
          const isCritical = alarm.severity === 'Critical';
          const isActive = alarm.status === 'Active';

          return (
            <div
              key={alarm._id}
              className={`p-4 rounded-2xl border transition-all ${
                isCritical && isActive
                  ? 'bg-rose-950/20 border-rose-500/50 shadow-lg shadow-rose-950/30'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span
                    className={`p-2.5 rounded-xl border mt-0.5 shrink-0 ${
                      isCritical
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                        : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                    }`}
                  >
                    <AlertOctagon className="w-5 h-5" />
                  </span>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getSeverityBadge(
                          alarm.severity
                        )}`}
                      >
                        {alarm.severity}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                        {alarm.alarmCode}
                      </span>
                      <span className="font-mono text-xs font-bold text-white">
                        {alarm.equipmentId} · {alarm.equipmentName}
                      </span>
                      <span className="text-xs text-slate-500">({alarm.category})</span>
                    </div>

                    <h3 className="text-sm font-bold text-white mt-1">{alarm.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{alarm.description}</p>

                    {/* Sensor Threshold Exceedance */}
                    {(alarm.triggerValue || alarm.threshold) && (
                      <div className="flex items-center gap-3 mt-2 text-xs font-mono">
                        <span className="text-rose-400">
                          Detected:{' '}
                          <strong className="text-white bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                            {alarm.triggerValue}
                          </strong>
                        </span>
                        <span className="text-slate-500">
                          OEM Safety Limit: {alarm.threshold}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Actions & Timestamps */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        alarm.status === 'Active'
                          ? 'bg-rose-500/20 text-rose-300'
                          : alarm.status === 'Acknowledged'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {alarm.status}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {new Date(alarm.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {alarm.status === 'Active' && (
                      <button
                        onClick={() => handleAcknowledge(alarm._id)}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Acknowledge Siren
                      </button>
                    )}

                    {alarm.status === 'Acknowledged' && (
                      <button
                        onClick={() => handleResolve(alarm._id)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Mark Cleared
                      </button>
                    )}

                    {alarm.acknowledgedBy && (
                      <span className="text-[10px] text-slate-400 block">
                        Ack by {alarm.acknowledgedBy}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Simulate Incident Alarm */}
      {showTriggerModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Simulate Incident Alarm</h3>
                <p className="text-xs text-slate-400">Trigger acoustic alarm siren & emergency event</p>
              </div>
              <button
                onClick={() => setShowTriggerModal(false)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleTriggerSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Equipment Unit</label>
                  <select
                    value={formEqId}
                    onChange={(e) => setFormEqId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    {equipments.map((e) => (
                      <option key={e.equipmentId} value={e.equipmentId}>
                        {e.equipmentId} - {e.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Severity</label>
                  <select
                    value={formSeverity}
                    onChange={(e) => setFormSeverity(e.target.value as AlarmSeverity)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Critical">Critical (Triggers Siren)</option>
                    <option value="Warning">Warning</option>
                    <option value="Caution">Caution</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Alarm Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Steering Accumulator Nitrogen Pressure Drop"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Technical Description</label>
                <textarea
                  rows={2}
                  placeholder="Details of the anomalous telemetry or mechanical event..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Sensor Value</label>
                  <input
                    type="text"
                    placeholder="e.g. 112°C"
                    value={formTriggerValue}
                    onChange={(e) => setFormTriggerValue(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Threshold</label>
                  <input
                    type="text"
                    placeholder="e.g. < 98°C"
                    value={formThreshold}
                    onChange={(e) => setFormThreshold(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowTriggerModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={triggering}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl"
                >
                  {triggering ? 'Triggering...' : 'Broadcast Alarm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
