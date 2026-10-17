import React, { useState, useEffect } from 'react';
import {
  EquipmentItem,
  getEquipmentListApi,
  deleteEquipmentApi,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Truck,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Thermometer,
  Fuel,
  Clock,
  MapPin,
  User,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { EquipmentModal } from './EquipmentModal';

interface EquipmentListProps {
  onOpenAuth: (mode?: 'login' | 'register') => void;
}

export const EquipmentList: React.FC<EquipmentListProps> = ({ onOpenAuth }) => {
  const { user, isAuthenticated } = useAuth();
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>('MongoDB');

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedHealth, setSelectedHealth] = useState('All');
  const [sortBy, setSortBy] = useState('equipmentId_asc');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipmentItem | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<EquipmentItem | null>(null);

  // Delete notification
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const fetchEquipment = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await getEquipmentListApi({
        search: searchTerm,
        type: selectedType,
        status: selectedStatus,
        healthStatus: selectedHealth,
        sort: sortBy,
      });
      if (res.success) {
        setEquipmentList(res.data);
        setDataSource(res.dataSource || 'MongoDB');
        if (selectedDetail) {
          const updated = res.data.find((e) => e.equipmentId === selectedDetail.equipmentId);
          if (updated) setSelectedDetail(updated);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to fetch equipment list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, [searchTerm, selectedType, selectedStatus, selectedHealth, sortBy]);

  const handleCreateNew = () => {
    if (!isAuthenticated) {
      onOpenAuth('login');
      return;
    }
    if (user?.role !== 'Admin') {
      alert('Only Admin users can commission or modify equipment.');
      return;
    }
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleEdit = (item: EquipmentItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      onOpenAuth('login');
      return;
    }
    if (user?.role !== 'Admin') {
      alert('Restricted: Admin role required to edit equipment.');
      return;
    }
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleDelete = async (item: EquipmentItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      onOpenAuth('login');
      return;
    }
    if (user?.role !== 'Admin') {
      alert('Restricted: Admin role required to delete equipment.');
      return;
    }
    if (window.confirm(`Confirm decommissioning asset: ${item.equipmentId} (${item.name})?`)) {
      try {
        const res = await deleteEquipmentApi(item.equipmentId);
        if (res.success) {
          setActionFeedback(`Equipment ${item.equipmentId} successfully removed.`);
          setTimeout(() => setActionFeedback(null), 4000);
          fetchEquipment();
          if (selectedDetail?.equipmentId === item.equipmentId) {
            setSelectedDetail(null);
          }
        }
      } catch (err: any) {
        alert(err.response?.data?.message || 'Decommission failed.');
      }
    }
  };

  // Status styling helpers
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Running':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'Idle':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'Maintenance':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'Breakdown':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      default:
        return 'bg-slate-700/40 text-slate-400 border-slate-600/30';
    }
  };

  const getHealthBadge = (health: string) => {
    switch (health) {
      case 'Good':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'Warning':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'Critical':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      default:
        return 'bg-slate-700 text-slate-300';
    }
  };

  // Summary counts
  const totalAssets = equipmentList.length;
  const runningAssets = equipmentList.filter((e) => e.status === 'Running').length;
  const maintenanceAssets = equipmentList.filter((e) => e.status === 'Maintenance').length;
  const breakdownAssets = equipmentList.filter((e) => e.status === 'Breakdown').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/70 rounded-xl p-5 sm:p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Truck className="w-6 h-6 text-amber-400" />
              <span>Mining Equipment Fleet Directory</span>
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Real-time CRUD operations, type categorization (Excavators, Dump Trucks, Loaders, Drillers, Bulldozers, Haul Trucks), telemetry statistics, and multi-parameter filtering.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchEquipment}
              disabled={loading}
              className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs flex items-center gap-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
              <span className="hidden sm:inline">Refresh Fleet</span>
            </button>
            <button
              onClick={handleCreateNew}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Commission Asset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Fleet KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-[11px] text-slate-400 font-medium">Total Registered Fleet</div>
          <div className="text-2xl font-bold text-white mt-1">{totalAssets}</div>
          <div className="text-[10px] text-slate-500 mt-1">Source: {dataSource}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-[11px] text-emerald-400 font-medium">Active (Running)</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{runningAssets}</div>
          <div className="text-[10px] text-slate-500 mt-1">Operational in pit</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-[11px] text-cyan-400 font-medium">Scheduled Maintenance</div>
          <div className="text-2xl font-bold text-cyan-400 mt-1">{maintenanceAssets}</div>
          <div className="text-[10px] text-slate-500 mt-1">In workshop bays</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-[11px] text-rose-400 font-medium">Critical / Breakdown</div>
          <div className="text-2xl font-bold text-rose-400 mt-1">{breakdownAssets}</div>
          <div className="text-[10px] text-slate-500 mt-1">Immediate action needed</div>
        </div>
      </div>

      {/* Action Notification */}
      {actionFeedback && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ID (e.g. EXC-001), name, pit location, operator..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="All">All Types</option>
              <option value="Excavator">Excavators</option>
              <option value="Dump Truck">Dump Trucks</option>
              <option value="Loader">Loaders</option>
              <option value="Drilling Machine">Drilling Machines</option>
              <option value="Bulldozer">Bulldozers</option>
              <option value="Haul Truck">Haul Trucks</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="All">All Statuses</option>
              <option value="Running">Running</option>
              <option value="Idle">Idle</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Breakdown">Breakdown</option>
              <option value="Offline">Offline</option>
            </select>

            {/* Health Filter */}
            <select
              value={selectedHealth}
              onChange={(e) => setSelectedHealth(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="All">All Health</option>
              <option value="Good">Good</option>
              <option value="Warning">Warning</option>
              <option value="Critical">Critical</option>
            </select>

            {/* Sorting */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="equipmentId_asc">Sort: ID (Asc)</option>
              <option value="engineHours_desc">Engine Hours (High-Low)</option>
              <option value="utilization_desc">Utilization (High-Low)</option>
              <option value="temperature_desc">Temperature (High-Low)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Equipment Table & Selected Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Equipment Table (Spans 2 columns) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-400" />
              <span>Fleet Registry ({equipmentList.length} Units Found)</span>
            </h3>
            <span className="text-[11px] text-slate-400">Click row for full telemetry</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider bg-slate-950/50">
                  <th className="py-3 px-3.5 font-semibold">ID / Type</th>
                  <th className="py-3 px-3.5 font-semibold">Asset Name & Pit</th>
                  <th className="py-3 px-3 font-semibold">Status</th>
                  <th className="py-3 px-3 font-semibold">Health</th>
                  <th className="py-3 px-3 font-semibold">Fuel / Temp</th>
                  <th className="py-3 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {equipmentList.map((item) => {
                  const isSelected = selectedDetail?.equipmentId === item.equipmentId;

                  return (
                    <tr
                      key={item.equipmentId}
                      onClick={() => setSelectedDetail(item)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-amber-500/10' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 px-3.5">
                        <div className="font-mono font-bold text-amber-300">{item.equipmentId}</div>
                        <div className="text-[10px] text-slate-400">{item.type}</div>
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-white">{item.name}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          <span>{item.location}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadge(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getHealthBadge(
                            item.healthStatus
                          )}`}
                        >
                          {item.healthStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 text-[11px] text-slate-200">
                          <Fuel className="w-3 h-3 text-cyan-400" />
                          <span>{item.currentFuelLevel}%</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Thermometer className="w-3 h-3 text-rose-400" />
                          <span>{item.temperature}°C</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => handleEdit(item, e)}
                            title="Edit Equipment (Admin)"
                            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-amber-400 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(item, e)}
                            title="Decommission (Admin)"
                            className="p-1.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Detailed Equipment Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          {selectedDetail ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="font-mono text-xs font-bold text-amber-400">
                    {selectedDetail.equipmentId}
                  </span>
                  <h3 className="text-base font-bold text-white leading-snug">
                    {selectedDetail.name}
                  </h3>
                </div>
                <span
                  className={`px-2.5 py-1 rounded text-xs font-bold border ${getStatusBadge(
                    selectedDetail.status
                  )}`}
                >
                  {selectedDetail.status}
                </span>
              </div>

              {/* Machinery Specifications */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Machinery Category:</span>
                  <strong className="text-white">{selectedDetail.type}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Manufacturer & Model:</span>
                  <span className="text-white">{selectedDetail.manufacturer} {selectedDetail.model}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Model Year:</span>
                  <span className="text-white">{selectedDetail.year}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Assigned Operator:</span>
                  <span className="text-amber-300 font-medium">{selectedDetail.assignedOperator}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Pit Zone:</span>
                  <span className="text-white">{selectedDetail.location}</span>
                </div>
              </div>

              {/* Live Telemetry Gauges */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Live Sensor Readings
                </h4>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Fuel className="w-3 h-3 text-cyan-400" /> Fuel Level:
                    </span>
                    <strong className="text-cyan-300">{selectedDetail.currentFuelLevel}%</strong>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        selectedDetail.currentFuelLevel < 20 ? 'bg-rose-500' : 'bg-cyan-400'
                      }`}
                      style={{ width: `${selectedDetail.currentFuelLevel}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 text-right">
                    Capacity: {selectedDetail.fuelCapacity} Litres
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Thermometer className="w-3 h-3 text-rose-400" /> Engine Temperature:
                    </span>
                    <strong
                      className={
                        selectedDetail.temperature > 90 ? 'text-rose-400' : 'text-emerald-400'
                      }
                    >
                      {selectedDetail.temperature}°C
                    </strong>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        selectedDetail.temperature > 90 ? 'bg-rose-500' : 'bg-amber-400'
                      }`}
                      style={{ width: `${Math.min(100, (selectedDetail.temperature / 120) * 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-amber-400" /> Operating Utilization:
                    </span>
                    <strong className="text-amber-300">{selectedDetail.utilization}%</strong>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-amber-400 h-full rounded-full"
                      style={{ width: `${selectedDetail.utilization}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" /> Total Engine Run:
                  </span>
                  <strong className="text-white font-mono">{selectedDetail.engineHours} hrs</strong>
                </div>
              </div>

              {/* Action Buttons for Selected Asset */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={(e) => handleEdit(selectedDetail, e)}
                  className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Specifications</span>
                </button>
                <button
                  onClick={(e) => handleDelete(selectedDetail, e)}
                  className="p-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-3">
              <Truck className="w-12 h-12 text-slate-700" />
              <div>
                <h4 className="text-xs font-bold text-slate-400 mb-1">Select an Asset</h4>
                <p className="text-[11px] text-slate-500 max-w-xs">
                  Click any equipment row in the table to inspect detailed mechanical specifications and sensor metrics.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Equipment Modal for Create / Edit */}
      <EquipmentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={fetchEquipment}
        initialData={editingItem}
      />
    </div>
  );
};
