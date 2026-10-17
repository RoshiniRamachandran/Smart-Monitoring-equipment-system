import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Flame,
  Clock,
  DollarSign,
  CheckCircle2,
  Filter,
  Search,
  Plus,
  RefreshCw,
  User,
  ShieldCheck,
  MapPin,
  FileWarning,
  Activity,
} from 'lucide-react';
import {
  BreakdownItem,
  getBreakdownsListApi,
  reportBreakdownApi,
  updateBreakdownStatusApi,
  getEquipmentListApi,
  EquipmentItem,
} from '../services/api';
import { BreakdownModal } from './BreakdownModal';
import { useAuth } from '../context/AuthContext';

interface BreakdownConsoleProps {
  onOpenAuth: () => void;
}

export const BreakdownConsole: React.FC<BreakdownConsoleProps> = ({ onOpenAuth }) => {
  const { user } = useAuth();
  const [breakdownList, setBreakdownList] = useState<BreakdownItem[]>([]);
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    reported: 0,
    repairing: 0,
    resolved: 0,
    critical: 0,
    totalDowntime: 0,
    totalEstimatedCost: 0,
  });

  // Selected incident for drawer
  const [selectedIncident, setSelectedIncident] = useState<BreakdownItem | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Resolution Notes Form
  const [resolutionNoteInput, setResolutionNoteInput] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bRes, eRes] = await Promise.all([
        getBreakdownsListApi({
          search: searchTerm || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          severity: severityFilter !== 'all' ? severityFilter : undefined,
          faultCategory: categoryFilter !== 'all' ? categoryFilter : undefined,
        }),
        getEquipmentListApi(),
      ]);

      if (bRes.success) {
        setBreakdownList(bRes.data);
        if (bRes.stats) {
          setStats(bRes.stats);
        }
        if (bRes.data.length > 0 && !selectedIncident) {
          setSelectedIncident(bRes.data[0]);
        }
      }

      if (eRes.success) {
        setEquipmentList(eRes.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch breakdown incidents.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, severityFilter, categoryFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleReportBreakdown = async (payload: Partial<BreakdownItem>) => {
    try {
      const res = await reportBreakdownApi(payload);
      await fetchData();
      if (res.data) {
        setSelectedIncident(res.data);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error reporting breakdown incident.';
      throw new Error(msg);
    }
  };

  const handleStatusTransition = async (
    incident: BreakdownItem,
    newStatus: BreakdownItem['status']
  ) => {
    setUpdatingStatus(true);
    try {
      await updateBreakdownStatusApi(incident.breakdownId, {
        status: newStatus,
        resolutionNotes: resolutionNoteInput || undefined,
      });
      await fetchData();
      if (selectedIncident?.breakdownId === incident.breakdownId) {
        setSelectedIncident({
          ...selectedIncident,
          status: newStatus,
          resolutionNotes: resolutionNoteInput || selectedIncident.resolutionNotes,
        });
      }
      setResolutionNoteInput('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error updating breakdown status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'High':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'Medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Reported':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'Assessed':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      case 'Repairing':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Resolved':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                Equipment Breakdown Incidents & Diagnostics
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30">
                  {stats.total} Incidents
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Real-time incident dispatch, root-cause isolation, and emergency repair lifecycle tracking.
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

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-rose-600/20 transition-all text-sm"
          >
            <AlertTriangle className="w-4 h-4" />
            Report Breakdown
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Unresolved Incidents</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400">
            {stats.reported + stats.repairing}
          </div>
          <div className="text-xs text-slate-500 mt-1">{stats.critical} flagged as Critical severity</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">In Active Repair</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">{stats.repairing}</div>
          <div className="text-xs text-slate-500 mt-1">Mobile workshop units dispatched</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Resolved Incidents</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{stats.resolved}</div>
          <div className="text-xs text-slate-500 mt-1">Returned to full production line</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Breakdown Cost</span>
            <DollarSign className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            ${stats.totalEstimatedCost.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">{stats.totalDowntime} hrs unpredicted downtime</div>
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
            placeholder="Search incident ID, equipment, reporter, symptoms, location..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
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
              <option value="Reported">Reported</option>
              <option value="Assessed">Assessed</option>
              <option value="Repairing">Repairing</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          {/* Severity */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Fault Category */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5">
            <Flame className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="Engine">Engine</option>
              <option value="Hydraulic">Hydraulic</option>
              <option value="Electrical">Electrical</option>
              <option value="Cooling System">Cooling System</option>
              <option value="Transmission">Transmission</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Table + Incident Detail Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Table */}
        <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Incident ID</th>
                  <th className="px-5 py-3.5">Asset</th>
                  <th className="px-5 py-3.5">Category & Severity</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Pit Location</th>
                  <th className="px-5 py-3.5 text-right">Cost / Downtime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-500" />
                      Loading breakdown incidents...
                    </td>
                  </tr>
                ) : breakdownList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      No breakdown incidents matching current filters.
                    </td>
                  </tr>
                ) : (
                  breakdownList.map(incident => {
                    const isSelected = selectedIncident?.breakdownId === incident.breakdownId;
                    return (
                      <tr
                        key={incident.breakdownId}
                        onClick={() => setSelectedIncident(incident)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-rose-500/10' : 'hover:bg-slate-800/50'
                        }`}
                      >
                        <td className="px-5 py-4">
                          <div className="font-mono font-bold text-rose-400">{incident.breakdownId}</div>
                          <div className="text-xs text-slate-400">
                            {new Date(incident.reportedAt).toLocaleDateString()}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-200">{incident.equipmentName}</div>
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                            {incident.equipmentId}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-xs font-semibold text-slate-300 mb-1">
                            {incident.faultCategory}
                          </div>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${getSeverityBadge(
                              incident.severity
                            )}`}
                          >
                            {incident.severity}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadge(
                              incident.status
                            )}`}
                          >
                            {incident.status}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-xs text-slate-300 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {incident.location}
                          </div>
                          <div className="text-[11px] text-slate-500">{incident.reportedBy}</div>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="font-mono text-rose-400 font-semibold">
                            ${(incident.estimatedCost || 0).toLocaleString()}
                          </div>
                          <div className="text-xs text-slate-400">{incident.downtimeHours || 0} hrs downtime</div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Incident Inspector Drawer */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          {selectedIncident ? (
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <span className="font-mono text-xs text-rose-400 font-bold">
                    {selectedIncident.breakdownId}
                  </span>
                  <h2 className="text-lg font-bold text-slate-100 mt-0.5">
                    {selectedIncident.equipmentName}
                  </h2>
                </div>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadge(
                    selectedIncident.status
                  )}`}
                >
                  {selectedIncident.status}
                </span>
              </div>

              {/* Observed Symptoms */}
              <div className="mt-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FileWarning className="w-3.5 h-3.5 text-rose-400" />
                  Observed Symptoms
                </span>
                <p className="text-sm text-slate-300 mt-1 leading-relaxed bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  {selectedIncident.symptoms}
                </p>
              </div>

              {/* Root Cause Analysis */}
              {selectedIncident.rootCause && (
                <div className="mt-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                    Root Cause Diagnosis
                  </span>
                  <p className="text-sm text-slate-300 mt-1 bg-amber-950/20 border border-amber-500/20 p-3.5 rounded-xl">
                    {selectedIncident.rootCause}
                  </p>
                </div>
              )}

              {/* Resolution Notes */}
              {selectedIncident.resolutionNotes && (
                <div className="mt-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    Resolution Notes & Actions Taken
                  </span>
                  <p className="text-sm text-slate-300 mt-1 bg-emerald-950/20 border border-emerald-500/20 p-3.5 rounded-xl">
                    {selectedIncident.resolutionNotes}
                  </p>
                </div>
              )}

              {/* Attributes Grid */}
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">Reported By</span>
                  <span className="font-semibold text-slate-200">{selectedIncident.reportedBy}</span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">Fault Category</span>
                  <span className="font-semibold text-slate-200">{selectedIncident.faultCategory}</span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">Est. Repair Cost</span>
                  <span className="font-semibold font-mono text-rose-400">
                    ${(selectedIncident.estimatedCost || 0).toLocaleString()}
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">Downtime Incurred</span>
                  <span className="font-semibold text-slate-200">
                    {selectedIncident.downtimeHours || 0} Hours
                  </span>
                </div>
              </div>

              {/* Lifecycle State Controls */}
              <div className="mt-6 pt-5 border-t border-slate-800 space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                  Update Incident Lifecycle
                </span>

                {selectedIncident.status !== 'Resolved' && (
                  <input
                    type="text"
                    value={resolutionNoteInput}
                    onChange={e => setResolutionNoteInput(e.target.value)}
                    placeholder="Optional technician repair notes / action..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                )}

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleStatusTransition(selectedIncident, 'Assessed')}
                    disabled={updatingStatus}
                    className={`py-2 px-2 text-xs rounded-xl border font-bold transition-all ${
                      selectedIncident.status === 'Assessed'
                        ? 'bg-sky-500/20 border-sky-500 text-sky-400'
                        : 'border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    Assessed
                  </button>
                  <button
                    onClick={() => handleStatusTransition(selectedIncident, 'Repairing')}
                    disabled={updatingStatus}
                    className={`py-2 px-2 text-xs rounded-xl border font-bold transition-all ${
                      selectedIncident.status === 'Repairing'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                        : 'border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    Repairing
                  </button>
                  <button
                    onClick={() => handleStatusTransition(selectedIncident, 'Resolved')}
                    disabled={updatingStatus}
                    className={`py-2 px-2 text-xs rounded-xl border font-bold transition-all ${
                      selectedIncident.status === 'Resolved'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                        : 'border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    Resolved
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-500">
              <Flame className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p>Select a breakdown incident to inspect diagnostics</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <BreakdownModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleReportBreakdown}
        equipmentOptions={equipmentList.map(e => ({
          equipmentId: e.equipmentId,
          name: e.name,
          location: e.location,
        }))}
        currentUser={user}
      />
    </div>
  );
};
