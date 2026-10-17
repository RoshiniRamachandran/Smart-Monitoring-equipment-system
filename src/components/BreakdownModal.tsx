import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  MapPin,
  FileWarning,
  DollarSign,
  Clock,
  Wrench,
  Flame,
} from 'lucide-react';
import { BreakdownItem, BreakdownSeverity } from '../services/api';

interface BreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: Partial<BreakdownItem>) => Promise<void>;
  equipmentOptions: Array<{ equipmentId: string; name: string; location: string }>;
  currentUser: any;
}

export const BreakdownModal: React.FC<BreakdownModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  equipmentOptions,
  currentUser,
}) => {
  const fallbackOptions = [
    { equipmentId: 'EXC-001', name: 'Hitachi EX1200 Mining Excavator', location: 'Pit Area 4 - North Face' },
    { equipmentId: 'DT-001', name: 'Cat 793F Ultra-Class Haul Truck', location: 'Haul Road B - Sector 2' },
    { equipmentId: 'LD-001', name: 'Komatsu WA900 Front Wheel Loader', location: 'Stockpile 3' },
    { equipmentId: 'DR-001', name: 'Sandvik DR412i Blast Hole Drill Rig', location: 'Bench 12 - East Ridge' },
    { equipmentId: 'CR-001', name: 'Metso Outotec Primary Gyratory Crusher', location: 'Crusher Station A' },
    { equipmentId: 'BD-001', name: 'CAT D11T Heavy Bulldozer', location: 'Waste Dump Bench 7' },
  ];

  const availableOptions = equipmentOptions && equipmentOptions.length > 0 ? equipmentOptions : fallbackOptions;

  const [equipmentId, setEquipmentId] = useState<string>(
    availableOptions[0]?.equipmentId || 'BD-001'
  );
  const [severity, setSeverity] = useState<BreakdownSeverity>('High');
  const [faultCategory, setFaultCategory] = useState<string>('Engine');
  const [location, setLocation] = useState<string>(
    availableOptions[0]?.location || 'North Pit - Bench 4'
  );
  const [symptoms, setSymptoms] = useState<string>('');
  const [estimatedCost, setEstimatedCost] = useState<number>(3500);
  const [downtimeHours, setDowntimeHours] = useState<number>(12);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && availableOptions.length > 0 && !availableOptions.some(e => e.equipmentId === equipmentId)) {
      setEquipmentId(availableOptions[0].equipmentId);
      setLocation(availableOptions[0].location);
    }
  }, [isOpen, availableOptions]);

  if (!isOpen) return null;

  const handleEquipmentChange = (selectedId: string) => {
    setEquipmentId(selectedId);
    const eq = availableOptions.find(e => e.equipmentId === selectedId);
    if (eq) {
      setLocation(eq.location);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!symptoms.trim()) {
      setError('Please specify observed fault symptoms.');
      return;
    }

    const selectedEq = availableOptions.find(eq => eq.equipmentId === equipmentId);

    setSubmitting(true);
    try {
      await onSubmit({
        equipmentId,
        equipmentName: selectedEq?.name || equipmentId,
        reportedBy: currentUser ? `${currentUser.name} (${currentUser.role})` : 'Field Operator',
        severity,
        faultCategory,
        location: location.trim() || 'Pit Operational Area',
        symptoms: symptoms.trim(),
        estimatedCost: Number(estimatedCost) || 3500,
        downtimeHours: Number(downtimeHours) || 8,
      });
      setSymptoms('');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to report breakdown incident.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-slate-900 border border-rose-500/30 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-rose-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Report Field Breakdown Incident
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Critical Event
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Instantly flags equipment into Breakdown state & triggers maintenance response
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
          {/* Target Machinery */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Select Broken Machine
            </label>
            <select
              value={equipmentId}
              onChange={e => handleEquipmentChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              {availableOptions.map(eq => (
                <option key={eq.equipmentId} value={eq.equipmentId}>
                  [{eq.equipmentId}] {eq.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Severity */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                Incident Severity
              </label>
              <select
                value={severity}
                onChange={e => setSeverity(e.target.value as BreakdownSeverity)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="Critical">Critical (Immediate Halt)</option>
                <option value="High">High (Major Impairment)</option>
                <option value="Medium">Medium (Partial Function)</option>
                <option value="Low">Low (Minor Glitch)</option>
              </select>
            </div>

            {/* Fault Category */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-slate-400" />
                Fault Category
              </label>
              <select
                value={faultCategory}
                onChange={e => setFaultCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="Engine">Engine & Combustion</option>
                <option value="Hydraulic">Hydraulic System & Cylinders</option>
                <option value="Electrical">Electrical & Telemetry</option>
                <option value="Transmission">Transmission & Drive</option>
                <option value="Braking System">Braking System</option>
                <option value="Cooling System">Cooling & Radiator</option>
                <option value="Structural">Structural Chassis & Boom</option>
              </select>
            </div>
          </div>

          {/* Incident Location */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Incident Pit Location / Bench
            </label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. West Waste Dump - Bench 2"
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Observed Symptoms */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
              <FileWarning className="w-3.5 h-3.5 text-rose-400" />
              Observed Symptoms & Fault Description
            </label>
            <textarea
              value={symptoms}
              onChange={e => setSymptoms(e.target.value)}
              rows={3}
              placeholder="Describe what occurred (e.g. Sudden high-temperature chime, hydraulic pressure drop, loss of drive power)..."
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Estimated Cost */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                Est. Repair Cost (USD)
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={estimatedCost}
                onChange={e => setEstimatedCost(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* Estimated Downtime */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Est. Downtime (Hours)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={downtimeHours}
                onChange={e => setDowntimeHours(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50"
            >
              {submitting ? 'Dispatching...' : 'Dispatch Breakdown Alert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
