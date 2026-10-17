import React, { useState } from 'react';
import {
  X,
  Wrench,
  Calendar,
  AlertTriangle,
  Clock,
  DollarSign,
  User,
  FileText,
  Tag,
} from 'lucide-react';
import { MaintenanceItem, MaintenancePriority, MaintenanceType } from '../services/api';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: Partial<MaintenanceItem>) => Promise<void>;
  equipmentOptions: Array<{ equipmentId: string; name: string }>;
}

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  equipmentOptions,
}) => {
  const fallbackOptions = [
    { equipmentId: 'EXC-001', name: 'Hitachi EX1200 Mining Excavator' },
    { equipmentId: 'DT-001', name: 'Cat 793F Ultra-Class Haul Truck' },
    { equipmentId: 'LD-001', name: 'Komatsu WA900 Front Wheel Loader' },
    { equipmentId: 'DR-001', name: 'Sandvik DR412i Blast Hole Drill Rig' },
    { equipmentId: 'CR-001', name: 'Metso Outotec Primary Gyratory Crusher' },
    { equipmentId: 'DZ-001', name: 'Cat D11T Heavy Track Bulldozer' },
  ];

  const availableOptions = equipmentOptions && equipmentOptions.length > 0 ? equipmentOptions : fallbackOptions;

  const [equipmentId, setEquipmentId] = useState<string>(
    availableOptions[0]?.equipmentId || 'EXC-001'
  );
  const [type, setType] = useState<MaintenanceType>('Preventive');
  const [priority, setPriority] = useState<MaintenancePriority>('Medium');
  const [scheduledDate, setScheduledDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [assignedTechnician, setAssignedTechnician] = useState<string>('Chen Wei (Mobile Tech)');
  const [description, setDescription] = useState<string>('');
  const [cost, setCost] = useState<number>(1500);
  const [downtimeHours, setDowntimeHours] = useState<number>(8);
  const [parts, setParts] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && availableOptions.length > 0 && !availableOptions.some(eq => eq.equipmentId === equipmentId)) {
      setEquipmentId(availableOptions[0].equipmentId);
    }
  }, [isOpen, availableOptions]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!description.trim()) {
      setError('Please provide maintenance scope/description.');
      return;
    }

    const selectedEq = availableOptions.find(eq => eq.equipmentId === equipmentId);

    setSubmitting(true);
    try {
      await onSubmit({
        equipmentId,
        equipmentName: selectedEq?.name || equipmentId,
        type,
        priority,
        status: 'Scheduled',
        scheduledDate: new Date(scheduledDate).toISOString(),
        assignedTechnician: assignedTechnician.trim() || 'Chen Wei (Mobile Tech)',
        description: description.trim(),
        cost: Number(cost) || 1200,
        downtimeHours: Number(downtimeHours) || 4,
        partsReplaced: parts
          ? parts.split(',').map(p => p.trim()).filter(Boolean)
          : [],
        notes: notes.trim(),
      });
      setDescription('');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to schedule maintenance.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Schedule Equipment Maintenance</h3>
              <p className="text-xs text-slate-400">Assign maintenance tasks to technicians & track downtime</p>
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
              Select Target Mining Machine
            </label>
            <select
              value={equipmentId}
              onChange={e => setEquipmentId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {availableOptions.map(eq => (
                <option key={eq.equipmentId} value={eq.equipmentId}>
                  [{eq.equipmentId}] {eq.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Maintenance Type */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                Type
              </label>
              <select
                value={type}
                onChange={e => setType(e.target.value as MaintenanceType)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="Preventive">Preventive</option>
                <option value="Corrective">Corrective</option>
                <option value="Inspection">Inspection</option>
                <option value="Overhaul">Overhaul</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
                Priority
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as MaintenancePriority)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            {/* Scheduled Date */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Date
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Assigned Technician */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Assigned Lead Technician
            </label>
            <input
              type="text"
              value={assignedTechnician}
              onChange={e => setAssignedTechnician(e.target.value)}
              placeholder="e.g. Sarah Jenkins (Hydraulic Tech)"
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Work Order Scope & Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe work to be performed (e.g. 500-hr lubrication, hydraulic pressure testing, seal pack replacement)..."
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Cost */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                Est. Cost (USD)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={cost}
                onChange={e => setCost(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Downtime Hours */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Est. Downtime (Hours)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={downtimeHours}
                onChange={e => setDowntimeHours(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Parts Replaced */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Parts / Components Required (Comma-separated)
            </label>
            <input
              type="text"
              value={parts}
              onChange={e => setParts(e.target.value)}
              placeholder="e.g. Hydraulic Filter Element, O-Ring Seal Kit, Coolant 50L"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
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
              className="px-5 py-2 text-sm rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
            >
              {submitting ? 'Scheduling...' : 'Confirm Work Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
