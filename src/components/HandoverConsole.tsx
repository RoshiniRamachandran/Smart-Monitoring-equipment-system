import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Users,
  Clock,
  Fuel,
  Shield,
  FileText,
  Lock,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Award,
} from 'lucide-react';
import {
  ShiftHandoverItem,
  InspectionItem,
  InspectionResult,
  getShiftHandoversApi,
  createShiftHandoverApi,
  getEquipmentListApi,
  EquipmentItem,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

interface HandoverConsoleProps {
  onOpenAuth?: () => void;
}

const DEFAULT_CHECKLIST_TEMPLATE: {
  category: 'Fluid Levels' | 'Safety Systems' | 'Engine & Electrical' | 'Undercarriage / Tyres' | 'Controls & Hydraulics';
  itemName: string;
}[] = [
  { category: 'Fluid Levels', itemName: 'Engine Oil Dipstick & Level Check' },
  { category: 'Fluid Levels', itemName: 'Hydraulic Tank Sight Gauge Level' },
  { category: 'Fluid Levels', itemName: 'Radiator Coolant Expansion Reserve' },
  { category: 'Safety Systems', itemName: 'Automatic Fire Suppression Pressure Pin & Gauge' },
  { category: 'Safety Systems', itemName: 'Emergency Cab E-Stop & Park Brake Interlock' },
  { category: 'Safety Systems', itemName: 'Reverse Warning Alarm, Horn & Beacons' },
  { category: 'Engine & Electrical', itemName: 'Battery Terminals, Alternator & Cab Gauges' },
  { category: 'Engine & Electrical', itemName: 'Air Filter Restriction Indicator' },
  { category: 'Undercarriage / Tyres', itemName: 'Tyre Pressure / Track Sag & Missing Lug Nuts' },
  { category: 'Controls & Hydraulics', itemName: 'Steering Accumulator & Hydraulic Hose Integrity' },
];

export const HandoverConsole: React.FC<HandoverConsoleProps> = ({ onOpenAuth }) => {
  const { isAuthenticated, user } = useAuth();

  const [handovers, setHandovers] = useState<ShiftHandoverItem[]>([]);
  const [equipments, setEquipments] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [selectedHandover, setSelectedHandover] = useState<ShiftHandoverItem | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [resultFilter, setResultFilter] = useState<string>('ALL');

  // Form State
  const [formEquipmentId, setFormEquipmentId] = useState<string>('DT-001');
  const [formShift, setFormShift] = useState<string>('Day Shift (06:00 - 18:00)');
  const [formOutgoingOperator, setFormOutgoingOperator] = useState<string>('');
  const [formIncomingOperator, setFormIncomingOperator] = useState<string>('');
  const [formStartingHours, setFormStartingHours] = useState<number>(6431);
  const [formEndingHours, setFormEndingHours] = useState<number>(6442);
  const [formStartingFuel, setFormStartingFuel] = useState<number>(90);
  const [formEndingFuel, setFormEndingFuel] = useState<number>(45);
  const [formInspectionResult, setFormInspectionResult] = useState<InspectionResult>('Passed');
  const [formChecklist, setFormChecklist] = useState<InspectionItem[]>(
    DEFAULT_CHECKLIST_TEMPLATE.map((t) => ({ ...t, status: 'Pass' }))
  );
  const [formCriticalDefects, setFormCriticalDefects] = useState<string>('');
  const [formOperationalNotes, setFormOperationalNotes] = useState<string>('');
  const [formSafetyInterlock, setFormSafetyInterlock] = useState<boolean>(true);
  const [formFireSuppression, setFormFireSuppression] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [shoRes, eqRes] = await Promise.all([
        getShiftHandoversApi(),
        getEquipmentListApi(),
      ]);

      if (shoRes.success) {
        setHandovers(shoRes.data);
        if (shoRes.data.length > 0 && !selectedHandover) {
          setSelectedHandover(shoRes.data[0]);
        }
      }
      if (eqRes.success) {
        setEquipments(eqRes.data);
      }
    } catch (err) {
      console.error('Failed to load handover logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreate = () => {
    if (!isAuthenticated && onOpenAuth) {
      onOpenAuth();
      return;
    }
    setFormOutgoingOperator(user?.name || 'Current Shift Operator');
    setFormIncomingOperator('');
    setShowCreateModal(true);
  };

  const handleChecklistStatusChange = (index: number, status: 'Pass' | 'Fail' | 'N/A') => {
    const updated = [...formChecklist];
    updated[index].status = status;
    setFormChecklist(updated);

    // Auto-update overall inspection result
    const hasFailures = updated.some((item) => item.status === 'Fail');
    if (hasFailures) {
      setFormInspectionResult('Passed with Minor Defects');
    } else {
      setFormInspectionResult('Passed');
    }
  };

  const handleEquipmentSelect = (eqId: string) => {
    setFormEquipmentId(eqId);
    const match = equipments.find((e) => e.equipmentId === eqId);
    if (match) {
      setFormStartingHours(match.engineHours);
      setFormEndingHours(match.engineHours + 11);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await createShiftHandoverApi({
        equipmentId: formEquipmentId,
        shift: formShift,
        outgoingOperatorName: formOutgoingOperator,
        incomingOperatorName: formIncomingOperator,
        startingEngineHours: Number(formStartingHours),
        endingEngineHours: Number(formEndingHours),
        startingFuelLevel: Number(formStartingFuel),
        endingFuelLevel: Number(formEndingFuel),
        inspectionResult: formInspectionResult,
        inspectionChecklist: formChecklist,
        criticalDefectsNoted: formCriticalDefects,
        operationalNotes: formOperationalNotes,
        safetyInterlockTested: formSafetyInterlock,
        fireSuppressionInspected: formFireSuppression,
      });

      if (res.success) {
        setHandovers([res.data, ...handovers]);
        setSelectedHandover(res.data);
        setShowCreateModal(false);
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to submit shift handover');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredHandovers = handovers.filter((item) => {
    const matchesSearch =
      item.equipmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.equipmentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.outgoingOperatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.incomingOperatorName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesResult = resultFilter === 'ALL' || item.inspectionResult === resultFilter;
    return matchesSearch && matchesResult;
  });

  const getResultBadge = (result: InspectionResult) => {
    switch (result) {
      case 'Passed':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'Passed with Minor Defects':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'Failed - Out of Service':
      default:
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <ClipboardCheck className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Operator Shift Handover & Digital Pre-Start Inspection Logs
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  Mine Safety Compliant
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-point pre-shift mechanical inspection checklists, fluid level audits, defect tracking, and digital operator signatures
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            Log Shift Handover
          </button>
        </div>
      </div>

      {/* Main Split: Handovers Log List vs Active Detailed Inspection Sign-off */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Filterable Handovers Feed (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search operator, machine or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="flex items-center gap-1 text-xs">
              {['ALL', 'Passed', 'Passed with Minor Defects', 'Failed - Out of Service'].map(
                (res) => (
                  <button
                    key={res}
                    onClick={() => setResultFilter(res)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-medium transition ${
                      resultFilter === res
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {res === 'ALL' ? 'All' : res.split(' ')[0]}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="space-y-3">
            {filteredHandovers.map((item) => {
              const isSelected = selectedHandover?._id === item._id;
              return (
                <div
                  key={item._id}
                  onClick={() => setSelectedHandover(item)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-850/90 border-amber-500/60 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/30'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                        {item.equipmentId}
                      </span>
                      <span className="font-bold text-sm text-white">{item.equipmentName}</span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getResultBadge(
                        item.inspectionResult
                      )}`}
                    >
                      {item.inspectionResult}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        {item.outgoingOperatorName} &rarr; {item.incomingOperatorName}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-500">
                      {new Date(item.date).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Engine Hours</span>
                      <span className="font-mono font-bold text-white">
                        {item.startingEngineHours} &rarr; {item.endingEngineHours}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Fuel Burn</span>
                      <span className="font-mono font-bold text-white">
                        {item.startingFuelLevel}% &rarr; {item.endingFuelLevel}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Items Verified</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {item.inspectionChecklist.filter((c) => c.status === 'Pass').length} /{' '}
                        {item.inspectionChecklist.length}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Detailed Inspection Checklist & Operator Sign-off (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          {selectedHandover ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                      Shift Handover Record
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                      {selectedHandover._id}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white mt-1">
                    {selectedHandover.equipmentName}
                  </h2>
                  <span className="text-xs text-slate-400 block mt-0.5">
                    {selectedHandover.shift} · {new Date(selectedHandover.date).toLocaleString()}
                  </span>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getResultBadge(
                    selectedHandover.inspectionResult
                  )}`}
                >
                  {selectedHandover.inspectionResult}
                </span>
              </div>

              {/* Operators Dual Card */}
              <div className="grid grid-cols-2 gap-3 bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                    Outgoing Operator (Signed)
                  </span>
                  <span className="text-white font-bold text-sm block mt-0.5">
                    {selectedHandover.outgoingOperatorName}
                  </span>
                  <span className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Shift Concluded
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                    Incoming Operator (Accepted)
                  </span>
                  <span className="text-white font-bold text-sm block mt-0.5">
                    {selectedHandover.incomingOperatorName}
                  </span>
                  <span className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Pre-Start Accepted
                  </span>
                </div>
              </div>

              {/* Safety Interlocks */}
              <div className="flex items-center gap-4 bg-slate-950/40 border border-slate-800 rounded-xl p-3 text-xs">
                <div className="flex items-center gap-2">
                  <Shield
                    className={`w-4 h-4 ${
                      selectedHandover.safetyInterlockTested ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  />
                  <span className="text-slate-300">
                    Emergency E-Stop Interlock:{' '}
                    <strong className="text-white">
                      {selectedHandover.safetyInterlockTested ? 'Tested & Armed' : 'Unchecked'}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Award
                    className={`w-4 h-4 ${
                      selectedHandover.fireSuppressionInspected ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  />
                  <span className="text-slate-300">
                    Fire Suppression:{' '}
                    <strong className="text-white">
                      {selectedHandover.fireSuppressionInspected ? 'Verified' : 'Flagged'}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Pre-Start Inspection Checklist Items */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                  Mandatory Multi-Point Inspection Items ({selectedHandover.inspectionChecklist.length})
                </span>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {selectedHandover.inspectionChecklist.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800/80 text-xs"
                    >
                      <div>
                        <span className="text-slate-200 block">{item.itemName}</span>
                        <span className="text-[10px] text-slate-500">{item.category}</span>
                        {item.notes && (
                          <span className="text-[11px] text-rose-300 block mt-0.5">
                            Defect Note: {item.notes}
                          </span>
                        )}
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                          item.status === 'Pass'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : item.status === 'Fail'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Defect or Operational Notes */}
              {selectedHandover.criticalDefectsNoted && (
                <div className="p-3 bg-rose-950/30 border border-rose-900/50 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Critical Defect Reported
                  </span>
                  <p className="text-slate-300">{selectedHandover.criticalDefectsNoted}</p>
                </div>
              )}

              {selectedHandover.operationalNotes && (
                <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-slate-300 block">Operator Field Notes</span>
                  <p className="text-slate-400">{selectedHandover.operationalNotes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
              Select a shift handover log to inspect inspection items and operator sign-offs.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Log New Shift Handover */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Log Shift Handover & Digital Pre-Start
                </h3>
                <p className="text-xs text-slate-400">
                  Verify machine fluids, safety devices, and sign-off on operator exchange
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 overflow-y-auto text-xs">
              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Equipment Unit</label>
                  <select
                    value={formEquipmentId}
                    onChange={(e) => handleEquipmentSelect(e.target.value)}
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
                  <label className="block text-slate-400 font-semibold mb-1">Shift</label>
                  <select
                    value={formShift}
                    onChange={(e) => setFormShift(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Day Shift (06:00 - 18:00)">Day Shift (06:00 - 18:00)</option>
                    <option value="Night Shift (18:00 - 06:00)">Night Shift (18:00 - 06:00)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Outgoing Operator
                  </label>
                  <input
                    type="text"
                    required
                    value={formOutgoingOperator}
                    onChange={(e) => setFormOutgoingOperator(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    placeholder="Operator name"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Incoming Operator
                  </label>
                  <input
                    type="text"
                    required
                    value={formIncomingOperator}
                    onChange={(e) => setFormIncomingOperator(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    placeholder="Relief operator name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Start Hours</label>
                  <input
                    type="number"
                    value={formStartingHours}
                    onChange={(e) => setFormStartingHours(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">End Hours</label>
                  <input
                    type="number"
                    value={formEndingHours}
                    onChange={(e) => setFormEndingHours(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Start Fuel (%)</label>
                  <input
                    type="number"
                    value={formStartingFuel}
                    onChange={(e) => setFormStartingFuel(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">End Fuel (%)</label>
                  <input
                    type="number"
                    value={formEndingFuel}
                    onChange={(e) => setFormEndingFuel(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono"
                  />
                </div>
              </div>

              {/* Checklist verification items */}
              <div className="border-t border-slate-800 pt-3">
                <span className="font-bold text-white block mb-2">
                  Pre-Start Checklist Verifications
                </span>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {formChecklist.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800"
                    >
                      <span className="text-slate-300">{item.itemName}</span>
                      <div className="flex items-center gap-1">
                        {(['Pass', 'Fail', 'N/A'] as const).map((st) => (
                          <button
                            type="button"
                            key={st}
                            onClick={() => handleChecklistStatusChange(idx, st)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.status === st
                                ? st === 'Pass'
                                  ? 'bg-emerald-500 text-white'
                                  : st === 'Fail'
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-slate-700 text-white'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Critical Defects (if any)
                </label>
                <input
                  type="text"
                  value={formCriticalDefects}
                  onChange={(e) => setFormCriticalDefects(e.target.value)}
                  placeholder="e.g. Wiper seal leak, retarder shudder"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Operational Handover Notes
                </label>
                <textarea
                  rows={2}
                  value={formOperationalNotes}
                  onChange={(e) => setFormOperationalNotes(e.target.value)}
                  placeholder="Cycle counts, bench conditions, haul road hazards..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="p-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl"
                >
                  {submitting ? 'Submitting...' : 'Sign & Submit Handover'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
