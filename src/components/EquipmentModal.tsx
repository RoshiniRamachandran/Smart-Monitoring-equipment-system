import React, { useState, useEffect } from 'react';
import {
  EquipmentItem,
  EquipmentType,
  EquipmentStatus,
  EquipmentHealthStatus,
  createEquipmentApi,
  updateEquipmentApi,
} from '../services/api';
import { Truck, X, Save, AlertCircle, CheckCircle2 } from 'lucide-react';

interface EquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialData?: EquipmentItem | null;
}

export const EquipmentModal: React.FC<EquipmentModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialData,
}) => {
  const isEdit = !!initialData;

  const [equipmentId, setEquipmentId] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<EquipmentType>('Excavator');
  const [model, setModel] = useState('');
  const [manufacturer, setManufacturer] = useState('Caterpillar');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [status, setStatus] = useState<EquipmentStatus>('Idle');
  const [location, setLocation] = useState('North Pit - Bench 2');
  const [engineHours, setEngineHours] = useState<number>(1200);
  const [fuelCapacity, setFuelCapacity] = useState<number>(1500);
  const [currentFuelLevel, setCurrentFuelLevel] = useState<number>(80);
  const [temperature, setTemperature] = useState<number>(75);
  const [utilization, setUtilization] = useState<number>(70);
  const [assignedOperator, setAssignedOperator] = useState('Tariq Al-Mansoor');
  const [healthStatus, setHealthStatus] = useState<EquipmentHealthStatus>('Good');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setEquipmentId(initialData.equipmentId);
      setName(initialData.name);
      setType(initialData.type);
      setModel(initialData.model);
      setManufacturer(initialData.manufacturer);
      setYear(initialData.year);
      setStatus(initialData.status);
      setLocation(initialData.location);
      setEngineHours(initialData.engineHours);
      setFuelCapacity(initialData.fuelCapacity);
      setCurrentFuelLevel(initialData.currentFuelLevel);
      setTemperature(initialData.temperature);
      setUtilization(initialData.utilization);
      setAssignedOperator(initialData.assignedOperator || 'Unassigned');
      setHealthStatus(initialData.healthStatus);
    } else {
      // Auto-suggest an ID
      const randomNum = Math.floor(100 + Math.random() * 900);
      setEquipmentId(`EQ-${randomNum}`);
      setName('New Mining Asset');
      setType('Excavator');
      setModel('Standard Mining Spec');
      setManufacturer('Caterpillar');
      setYear(new Date().getFullYear());
      setStatus('Idle');
      setLocation('Main Pit Base');
      setEngineHours(500);
      setFuelCapacity(1800);
      setCurrentFuelLevel(90);
      setTemperature(70);
      setUtilization(60);
      setAssignedOperator('Unassigned');
      setHealthStatus('Good');
    }
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const payload: Partial<EquipmentItem> = {
      equipmentId: equipmentId.toUpperCase().trim(),
      name,
      type,
      model,
      manufacturer,
      year: Number(year),
      status,
      location,
      engineHours: Number(engineHours),
      fuelCapacity: Number(fuelCapacity),
      currentFuelLevel: Number(currentFuelLevel),
      temperature: Number(temperature),
      utilization: Number(utilization),
      assignedOperator,
      healthStatus,
    };

    try {
      if (isEdit && initialData) {
        const res = await updateEquipmentApi(initialData.equipmentId, payload);
        if (res.success) {
          setSuccessMsg('Equipment record updated successfully.');
          setTimeout(() => {
            onSaved();
            onClose();
          }, 600);
        }
      } else {
        const res = await createEquipmentApi(payload);
        if (res.success) {
          setSuccessMsg('New equipment asset commissioned into fleet.');
          setTimeout(() => {
            onSaved();
            onClose();
          }, 600);
        }
      }
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message ||
          err.message ||
          'Failed to save equipment record. Check Admin permissions.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl relative text-white my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                {isEdit ? `Edit Asset: ${initialData?.equipmentId}` : 'Commission New Mining Asset'}
              </h3>
              <p className="text-xs text-slate-400">
                Heavy Machinery Registration & Telemetry Profile
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback alerts */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Equipment ID *
              </label>
              <input
                type="text"
                required
                disabled={isEdit}
                value={equipmentId}
                onChange={(e) => setEquipmentId(e.target.value.toUpperCase())}
                placeholder="e.g. EXC-003"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white uppercase font-mono focus:border-amber-500 disabled:opacity-50"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Equipment Asset Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. CAT 390F Excavator"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Machinery Type *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as EquipmentType)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500"
              >
                <option value="Excavator">Excavator</option>
                <option value="Dump Truck">Dump Truck</option>
                <option value="Loader">Loader</option>
                <option value="Drilling Machine">Drilling Machine</option>
                <option value="Bulldozer">Bulldozer</option>
                <option value="Haul Truck">Haul Truck</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Manufacturer *
              </label>
              <input
                type="text"
                required
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g. Caterpillar"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Model Identifier
              </label>
              <input
                type="text"
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. 797F"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Year of Manufacture
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                min={1995}
                max={2027}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Operational Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as EquipmentStatus)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500"
              >
                <option value="Running">Running</option>
                <option value="Idle">Idle</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Breakdown">Breakdown</option>
                <option value="Offline">Offline</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Health Status
              </label>
              <select
                value={healthStatus}
                onChange={(e) => setHealthStatus(e.target.value as EquipmentHealthStatus)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500"
              >
                <option value="Good">Good</option>
                <option value="Warning">Warning</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Site Location / Pit Bench *
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. North Pit - Bench 4"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Assigned Operator
              </label>
              <input
                type="text"
                value={assignedOperator}
                onChange={(e) => setAssignedOperator(e.target.value)}
                placeholder="e.g. Tariq Al-Mansoor"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500"
              />
            </div>
          </div>

          {/* Telemetry & Specifications */}
          <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Telemetry & Operational Metrics
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Engine Hours (hrs)</label>
                <input
                  type="number"
                  value={engineHours}
                  onChange={(e) => setEngineHours(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Fuel Tank (L)</label>
                <input
                  type="number"
                  value={fuelCapacity}
                  onChange={(e) => setFuelCapacity(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Fuel Level (%)</label>
                <input
                  type="number"
                  value={currentFuelLevel}
                  onChange={(e) => setCurrentFuelLevel(Number(e.target.value))}
                  min={0}
                  max={100}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Operating Temp (°C)</label>
                <input
                  type="number"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving Asset...' : isEdit ? 'Update Equipment' : 'Save Equipment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
