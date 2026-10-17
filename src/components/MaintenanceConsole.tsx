import React, { useState, useEffect, useCallback } from 'react';
import {
  Wrench,
  Calendar,
  AlertTriangle,
  Clock,
  DollarSign,
  CheckCircle2,
  Filter,
  Search,
  Plus,
  ArrowUpDown,
  RefreshCw,
  User,
  ShieldCheck,
  Tag,
  Check,
  FileDown,
} from 'lucide-react';
import {
  MaintenanceItem,
  getMaintenanceListApi,
  createMaintenanceApi,
  updateMaintenanceApi,
  getEquipmentListApi,
  EquipmentItem,
  getExportCsvUrl,
} from '../services/api';
import { MaintenanceModal } from './MaintenanceModal';
import { useAuth } from '../context/AuthContext';

interface MaintenanceConsoleProps {
  onOpenAuth: () => void;
}

export const MaintenanceConsole: React.FC<MaintenanceConsoleProps> = ({ onOpenAuth }) => {
  const { user } = useAuth();
  const [maintenanceList, setMaintenanceList] = useState<MaintenanceItem[]>([]);
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    scheduled: 0,
    inProgress: 0,
    completed: 0,
    critical: 0,
    totalCost: 0,
    totalDowntime: 0,
  });

  // Selected item for drawer
  const [selectedTask, setSelectedTask] = useState<MaintenanceItem | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isTechnicianOrAdmin = user?.role === 'Admin' || user?.role === 'Manager' || user?.role === 'Maintenance';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mRes, eRes] = await Promise.all([
        getMaintenanceListApi({
          search: searchTerm || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          priority: priorityFilter !== 'all' ? priorityFilter : undefined,
          type: typeFilter !== 'all' ? typeFilter : undefined,
        }),
        getEquipmentListApi(),
      ]);

      if (mRes.success) {
        setMaintenanceList(mRes.data);
        if (mRes.stats) {
          setStats(mRes.stats);
        }
        if (mRes.data.length > 0 && !selectedTask) {
          setSelectedTask(mRes.data[0]);
        }
      }

      if (eRes.success) {
        setEquipmentList(eRes.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch maintenance tasks.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, priorityFilter, typeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateMaintenance = async (payload: Partial<MaintenanceItem>) => {
    try {
      const res = await createMaintenanceApi(payload);
      await fetchData();
      if (res.data) {
        setSelectedTask(res.data);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error scheduling maintenance';
      throw new Error(msg);
    }
  };

  const handleStatusChange = async (task: MaintenanceItem, newStatus: MaintenanceItem['status']) => {
    try {
      await updateMaintenanceApi(task.maintenanceId, {
        status: newStatus,
        equipmentId: task.equipmentId,
      });
      await fetchData();
      if (selectedTask?.maintenanceId === task.maintenanceId) {
        setSelectedTask({ ...selectedTask, status: newStatus });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error updating status');
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'High':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Medium':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'In-Progress':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Completed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Cancelled':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
      default:
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                Maintenance Work Orders & Scheduling
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  {stats.total} Work Orders
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Manage preventive maintenance routines, track technician assignments, and log repairs.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            title="Refresh records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <a
            href={getExportCsvUrl('maintenance', { status: statusFilter !== 'all' ? statusFilter : undefined })}
            download
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold flex items-center gap-2 text-sm transition-all shadow-sm"
            title="Export maintenance orders to CSV"
          >
            <FileDown className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </a>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all text-sm"
          >
            <Plus className="w-4 h-4" />
            Schedule Maintenance
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Scheduled Tasks</span>
            <Calendar className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">{stats.scheduled}</div>
          <div className="text-xs text-slate-500 mt-1">Upcoming service windows</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active In-Progress</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">{stats.inProgress}</div>
          <div className="text-xs text-slate-500 mt-1">Bays currently servicing</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Completed Tasks</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{stats.completed}</div>
          <div className="text-xs text-slate-500 mt-1">Returned to full operational fleet</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Est. Cost</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            ${stats.totalCost.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {stats.totalDowntime} hrs total fleet downtime
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search work orders by ID, equipment, technician, or description..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="In-Progress">In-Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Priority */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Type */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="Preventive">Preventive</option>
              <option value="Corrective">Corrective</option>
              <option value="Inspection">Inspection</option>
              <option value="Emergency">Emergency</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Table + Detail Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Table View */}
        <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Work Order</th>
                  <th className="px-5 py-3.5">Target Asset</th>
                  <th className="px-5 py-3.5">Type & Priority</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Technician</th>
                  <th className="px-5 py-3.5 text-right">Cost / Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                      Loading maintenance logs...
                    </td>
                  </tr>
                ) : maintenanceList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      No maintenance work orders found matching criteria.
                    </td>
                  </tr>
                ) : (
                  maintenanceList.map(task => {
                    const isSelected = selectedTask?.maintenanceId === task.maintenanceId;
                    return (
                      <tr
                        key={task.maintenanceId}
                        onClick={() => setSelectedTask(task)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-amber-500/10' : 'hover:bg-slate-800/50'
                        }`}
                      >
                        <td className="px-5 py-4">
                          <div className="font-mono font-bold text-amber-400">{task.maintenanceId}</div>
                          <div className="text-xs text-slate-400">
                            {new Date(task.scheduledDate).toLocaleDateString()}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-200">{task.equipmentName}</div>
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                            {task.equipmentId}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-xs font-semibold text-slate-300 mb-1">{task.type}</div>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${getPriorityBadge(
                              task.priority
                            )}`}
                          >
                            {task.priority}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadge(
                              task.status
                            )}`}
                          >
                            {task.status}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-xs text-slate-300 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {task.assignedTechnician}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="font-mono text-slate-200 font-semibold">
                            ${task.cost.toLocaleString()}
                          </div>
                          <div className="text-xs text-slate-400">{task.downtimeHours} hrs downtime</div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Task Inspector Drawer */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          {selectedTask ? (
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <span className="font-mono text-xs text-amber-400 font-bold">
                    {selectedTask.maintenanceId}
                  </span>
                  <h2 className="text-lg font-bold text-slate-100 mt-0.5">{selectedTask.equipmentName}</h2>
                </div>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadge(
                    selectedTask.status
                  )}`}
                >
                  {selectedTask.status}
                </span>
              </div>

              {/* Description */}
              <div className="mt-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Scope of Work
                </span>
                <p className="text-sm text-slate-300 mt-1 leading-relaxed bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  {selectedTask.description}
                </p>
              </div>

              {/* Action Taken if present */}
              {selectedTask.actionTaken && (
                <div className="mt-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    Action Taken
                  </span>
                  <p className="text-sm text-slate-300 mt-1 bg-emerald-950/20 border border-emerald-500/20 p-3.5 rounded-xl">
                    {selectedTask.actionTaken}
                  </p>
                </div>
              )}

              {/* Key Attributes Grid */}
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">Assigned Tech</span>
                  <span className="font-semibold text-slate-200">{selectedTask.assignedTechnician}</span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">Scheduled Date</span>
                  <span className="font-semibold text-slate-200">
                    {new Date(selectedTask.scheduledDate).toLocaleDateString()}
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">Estimated Cost</span>
                  <span className="font-semibold font-mono text-amber-400">
                    ${selectedTask.cost.toLocaleString()}
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">Downtime Duration</span>
                  <span className="font-semibold text-slate-200">{selectedTask.downtimeHours} Hours</span>
                </div>
              </div>

              {/* Parts Replaced */}
              {selectedTask.partsReplaced && selectedTask.partsReplaced.length > 0 && (
                <div className="mt-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Parts Replaced / Allocated
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTask.partsReplaced.map((part, i) => (
                      <span
                        key={i}
                        className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-1 rounded-lg border border-slate-700"
                      >
                        {part}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Action Controls */}
              {isTechnicianOrAdmin && (
                <div className="mt-6 pt-5 border-t border-slate-800">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                    Quick Status Update
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleStatusChange(selectedTask, 'Scheduled')}
                      className={`py-2 px-3 text-xs rounded-xl border font-bold transition-all ${
                        selectedTask.status === 'Scheduled'
                          ? 'bg-sky-500/20 border-sky-500 text-sky-400'
                          : 'border-slate-700 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      Scheduled
                    </button>
                    <button
                      onClick={() => handleStatusChange(selectedTask, 'In-Progress')}
                      className={`py-2 px-3 text-xs rounded-xl border font-bold transition-all ${
                        selectedTask.status === 'In-Progress'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                          : 'border-slate-700 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      In-Progress
                    </button>
                    <button
                      onClick={() => handleStatusChange(selectedTask, 'Completed')}
                      className={`py-2 px-3 text-xs rounded-xl border font-bold transition-all ${
                        selectedTask.status === 'Completed'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'border-slate-700 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      Completed
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-500">
              <Wrench className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p>Select a maintenance order to inspect technical details</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <MaintenanceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateMaintenance}
        equipmentOptions={equipmentList.map(e => ({ equipmentId: e.equipmentId, name: e.name }))}
      />
    </div>
  );
};
