import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Filter,
  User,
  DollarSign,
  Truck,
  X,
  AlertOctagon,
  Eye,
  Edit3,
} from 'lucide-react';
import {
  MaintenanceItem,
  MaintenancePriority,
  MaintenanceStatus,
  MaintenanceType,
  getMaintenanceListApi,
  createMaintenanceApi,
  updateMaintenanceApi,
  getEquipmentListApi,
  EquipmentItem,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

interface MaintenanceCalendarProps {
  onOpenAuth?: () => void;
}

export const MaintenanceCalendar: React.FC<MaintenanceCalendarProps> = ({ onOpenAuth }) => {
  const { user } = useAuth();

  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 8, 14)); // Sept 2026
  const [maintenanceList, setMaintenanceList] = useState<MaintenanceItem[]>([]);
  const [equipments, setEquipments] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');

  // Filters
  const [filterEquipment, setFilterEquipment] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Selected event for detail modal
  const [selectedItem, setSelectedItem] = useState<MaintenanceItem | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // New Work Order Modal
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [formEqId, setFormEqId] = useState<string>('EXC-001');
  const [formType, setFormType] = useState<MaintenanceType>('Preventive');
  const [formPriority, setFormPriority] = useState<MaintenancePriority>('Medium');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formTechnician, setFormTechnician] = useState<string>('Marcus Vance (Hydraulics Lead)');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formDowntime, setFormDowntime] = useState<number>(4);
  const [formCost, setFormCost] = useState<number>(1200);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fallbackEquipments: Array<{ equipmentId: string; name: string }> = [
    { equipmentId: 'EXC-001', name: 'Hitachi EX1200 Mining Excavator' },
    { equipmentId: 'DT-001', name: 'Cat 793F Ultra-Class Haul Truck' },
    { equipmentId: 'LD-001', name: 'Komatsu WA900 Front Wheel Loader' },
    { equipmentId: 'DR-001', name: 'Sandvik DR412i Blast Hole Drill Rig' },
    { equipmentId: 'CR-001', name: 'Metso Outotec Primary Gyratory Crusher' },
  ];

  const activeEquipments = equipments.length > 0 ? equipments : fallbackEquipments;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mRes, eqRes] = await Promise.all([
        getMaintenanceListApi(),
        getEquipmentListApi(),
      ]);
      if (mRes.success) {
        setMaintenanceList(mRes.data);
      }
      if (eqRes.success) {
        setEquipments(eqRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch maintenance calendar data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date(2026, 8, 14));
  };

  // Filter items
  const filteredEvents = maintenanceList.filter((item) => {
    const matchesEq = filterEquipment === 'ALL' || item.equipmentId === filterEquipment;
    const matchesPriority = filterPriority === 'ALL' || item.priority === filterPriority;
    const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;
    return matchesEq && matchesPriority && matchesStatus;
  });

  // Group events by day string "YYYY-MM-DD"
  const eventsByDate = filteredEvents.reduce<Record<string, MaintenanceItem[]>>((acc, item) => {
    if (!item.scheduledDate) return acc;
    const dateStr = item.scheduledDate.slice(0, 10);
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(item);
    return acc;
  }, {});

  // Handle status update
  const handleUpdateStatus = async (item: MaintenanceItem, newStatus: MaintenanceStatus) => {
    if (!item._id) return;
    setIsUpdating(true);
    try {
      const res = await updateMaintenanceApi(item._id, {
        status: newStatus,
        equipmentId: item.equipmentId,
      });
      if (res.success) {
        setMaintenanceList((prev) =>
          prev.map((m) => (m._id === item._id ? { ...m, status: newStatus } : m))
        );
        if (selectedItem && selectedItem._id === item._id) {
          setSelectedItem({ ...selectedItem, status: newStatus });
        }
      }
    } catch (err) {
      console.error('Failed to update status', err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle new maintenance submission
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSubmitting(true);
    try {
      const matchedEq = activeEquipments.find((eq) => eq.equipmentId === formEqId);
      const res = await createMaintenanceApi({
        equipmentId: formEqId,
        equipmentName: matchedEq ? matchedEq.name : `Mining Asset ${formEqId}`,
        type: formType,
        priority: formPriority,
        status: 'Scheduled',
        scheduledDate: formDate ? new Date(formDate).toISOString() : new Date().toISOString(),
        assignedTechnician: formTechnician.trim() || 'Marcus Vance (Hydraulics Lead)',
        description: formDescription.trim() || `${formType} routine maintenance check for ${formEqId}`,
        downtimeHours: Number(formDowntime) || 4,
        cost: Number(formCost) || 1200,
      });

      if (res.success && res.data) {
        setMaintenanceList((prev) => [res.data, ...prev.filter(m => m.maintenanceId !== res.data.maintenanceId)]);
        setShowScheduleModal(false);
        setFormDescription('');
      } else {
        setModalError(res.message || 'Failed to schedule work order.');
      }
    } catch (err: any) {
      console.error('Failed to schedule maintenance', err);
      setModalError(err.response?.data?.message || err.message || 'Failed to schedule maintenance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Priority color styling helper
  const getPriorityStyle = (priority: MaintenancePriority) => {
    switch (priority) {
      case 'Critical':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30';
      case 'High':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30';
      case 'Medium':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40 hover:bg-sky-500/30';
      case 'Low':
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30';
    }
  };

  const getStatusBadge = (status: MaintenanceStatus) => {
    switch (status) {
      case 'In-Progress':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse';
      case 'Completed':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'Cancelled':
        return 'bg-slate-700/50 text-slate-400 border-slate-600';
      case 'Scheduled':
      default:
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
    }
  };

  // Calendar summary stats
  const scheduledCount = maintenanceList.filter((m) => m.status === 'Scheduled').length;
  const inProgressCount = maintenanceList.filter((m) => m.status === 'In-Progress').length;
  const criticalCount = maintenanceList.filter((m) => m.priority === 'Critical').length;
  const totalDowntimePlanned = maintenanceList
    .filter((m) => m.status !== 'Completed')
    .reduce((sum, cur) => sum + (cur.downtimeHours || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <CalendarIcon className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Maintenance Schedule & Calendar View
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Visual timeline for preventive service intervals, hydraulic overhauls, and statutory mine inspections
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View toggle */}
          <div className="bg-slate-950/70 p-1 rounded-xl border border-slate-800 flex items-center gap-1 text-xs">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                viewMode === 'month'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Month View
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                viewMode === 'agenda'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Agenda List
            </button>
          </div>

          <button
            onClick={() => setShowScheduleModal(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Work Order</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Scheduled Work Orders</span>
            <CalendarIcon className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-1">{scheduledCount}</div>
          <span className="text-[11px] text-sky-400">Upcoming planned tasks</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">In-Progress Bays</span>
            <Wrench className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{inProgressCount}</div>
          <span className="text-[11px] text-slate-400">Currently being serviced</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Critical Priority</span>
            <AlertOctagon className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-1">{criticalCount}</div>
          <span className="text-[11px] text-rose-400/80">Immediate attention</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Planned Downtime</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-1">{totalDowntimePlanned} <span className="text-sm font-normal text-slate-400">hrs</span></div>
          <span className="text-[11px] text-emerald-400">Scheduled pit outage</span>
        </div>
      </div>

      {/* Calendar Navigation & Filters Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Month Navigation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={prevMonth}
              title="Previous Month"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToToday}
              className="px-2.5 py-1 text-xs font-bold text-amber-400 hover:text-amber-300 transition"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              title="Next Month"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-lg font-bold text-white min-w-[180px]">
            {monthNames[month]} {year}
          </h2>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Equipment Filter */}
          <select
            value={filterEquipment}
            onChange={(e) => setFilterEquipment(e.target.value)}
            className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-300 focus:outline-none focus:border-amber-500/50"
          >
            <option value="ALL">All Mining Assets</option>
            {equipments.map((e) => (
              <option key={e.equipmentId} value={e.equipmentId}>
                {e.equipmentId} - {e.name}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-300 focus:outline-none focus:border-amber-500/50"
          >
            <option value="ALL">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-300 focus:outline-none focus:border-amber-500/50"
          >
            <option value="ALL">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="In-Progress">In-Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* MONTH GRID VIEW */}
      {viewMode === 'month' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950/50 text-center py-2.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
            {daysOfWeek.map((d, i) => (
              <div key={d} className={i === 0 || i === 6 ? 'text-amber-500/70' : ''}>
                {d}
              </div>
            ))}
          </div>

          {/* Month Day Cells */}
          <div className="grid grid-cols-7 auto-rows-fr bg-slate-950/20">
            {/* Previous month filler days */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => {
              const dayNum = prevMonthDays - firstDayOfMonth + i + 1;
              return (
                <div
                  key={`prev-${i}`}
                  className="min-h-[115px] p-2 border-b border-r border-slate-800/40 bg-slate-950/40 text-slate-600 opacity-40 select-none"
                >
                  <span className="text-xs font-mono">{dayNum}</span>
                </div>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayEvents = eventsByDate[dateStr] || [];
              const isToday =
                dayNum === 14 && month === 8 && year === 2026; // Simulated Today: Sept 14, 2026

              return (
                <div
                  key={`day-${dayNum}`}
                  onClick={() => {
                    setFormDate(dateStr);
                  }}
                  className={`min-h-[120px] p-2 border-b border-r border-slate-800/70 flex flex-col justify-between transition group hover:bg-slate-800/30 ${
                    isToday ? 'bg-amber-500/5 border-amber-500/30' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-mono font-bold rounded-full w-6 h-6 flex items-center justify-center ${
                        isToday
                          ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm shadow-amber-500/40'
                          : 'text-slate-300 group-hover:text-white'
                      }`}
                    >
                      {dayNum}
                    </span>

                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                        {dayEvents.length} {dayEvents.length === 1 ? 'task' : 'tasks'}
                      </span>
                    )}
                  </div>

                  {/* Day Event Chips */}
                  <div className="space-y-1 overflow-y-auto max-h-[85px] pr-0.5">
                    {dayEvents.map((item) => (
                      <button
                        key={item._id || item.maintenanceId}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItem(item);
                        }}
                        className={`w-full text-left p-1 rounded-md border text-[11px] leading-tight font-medium transition block truncate ${getPriorityStyle(
                          item.priority
                        )}`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold truncate">{item.equipmentId}</span>
                          <span
                            className={`text-[9px] px-1 rounded uppercase font-semibold shrink-0 ${
                              item.status === 'In-Progress'
                                ? 'bg-amber-500 text-slate-950'
                                : item.status === 'Completed'
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {item.status === 'In-Progress' ? 'Active' : item.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-300 truncate mt-0.5">
                          {item.type}: {item.description}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Quick Add Tooltip Hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFormDate(dateStr);
                      setShowScheduleModal(true);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 mt-1 transition self-end font-semibold"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Schedule</span>
                  </button>
                </div>
              );
            })}

            {/* Next month filler days */}
            {Array.from({
              length: (7 - ((firstDayOfMonth + daysInMonth) % 7)) % 7,
            }).map((_, i) => (
              <div
                key={`next-${i}`}
                className="min-h-[115px] p-2 border-b border-r border-slate-800/40 bg-slate-950/40 text-slate-600 opacity-40 select-none"
              >
                <span className="text-xs font-mono">{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AGENDA LIST VIEW */}
      {viewMode === 'agenda' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white">Upcoming Mining Work Orders (Chronological)</h3>
            <span className="text-xs text-slate-400">{filteredEvents.length} Tasks matching filters</span>
          </div>

          <div className="divide-y divide-slate-800/60">
            {filteredEvents
              .sort(
                (a, b) =>
                  new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
              )
              .map((item) => (
                <div
                  key={item._id || item.maintenanceId}
                  onClick={() => setSelectedItem(item)}
                  className="py-3 px-2 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-800/40 rounded-xl transition cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 text-center min-w-[65px]">
                      <span className="text-[10px] text-slate-500 uppercase block">
                        {new Date(item.scheduledDate).toLocaleDateString(undefined, {
                          month: 'short',
                        })}
                      </span>
                      <span className="text-lg font-bold text-amber-400 font-mono">
                        {new Date(item.scheduledDate).getDate()}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {item.equipmentId}
                        </span>
                        <span className="text-xs text-slate-400">· {item.equipmentName}</span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${getPriorityStyle(
                            item.priority
                          )}`}
                        >
                          {item.priority}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${getStatusBadge(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <h4 className="text-sm font-semibold text-white mt-1">{item.description}</h4>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          {item.assignedTechnician}
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {item.downtimeHours} hrs est.
                        </span>
                        <span className="flex items-center gap-1 font-mono text-emerald-400">
                          <DollarSign className="w-3.5 h-3.5" />
                          ${item.cost?.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem(item);
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      View Bay Details
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* EVENT DETAIL & ACTION MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                  <Wrench className="w-5 h-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-base">
                      {selectedItem.maintenanceId || selectedItem._id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getPriorityStyle(
                        selectedItem.priority
                      )}`}
                    >
                      {selectedItem.priority}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {selectedItem.equipmentId} · {selectedItem.equipmentName}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-500 uppercase text-[10px] font-bold mb-1">
                  Scope of Maintenance Work
                </label>
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-slate-200 text-sm">
                  {selectedItem.description}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">
                    Scheduled Date
                  </span>
                  <span className="text-white font-mono font-semibold text-xs mt-0.5 block">
                    {new Date(selectedItem.scheduledDate).toLocaleDateString(undefined, {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">
                    Assigned Technician
                  </span>
                  <span className="text-white font-semibold text-xs mt-0.5 block">
                    {selectedItem.assignedTechnician}
                  </span>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">
                    Planned Downtime
                  </span>
                  <span className="text-amber-400 font-mono font-bold text-xs mt-0.5 block">
                    {selectedItem.downtimeHours} Operating Hours
                  </span>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">
                    Allocated Budget
                  </span>
                  <span className="text-emerald-400 font-mono font-bold text-xs mt-0.5 block">
                    ${selectedItem.cost?.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Status Update Actions */}
              <div>
                <label className="block text-slate-400 font-bold mb-2">
                  Update Workshop Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    disabled={isUpdating || selectedItem.status === 'Scheduled'}
                    onClick={() => handleUpdateStatus(selectedItem, 'Scheduled')}
                    className={`py-2 px-3 rounded-xl font-bold border transition ${
                      selectedItem.status === 'Scheduled'
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    Scheduled
                  </button>

                  <button
                    disabled={isUpdating || selectedItem.status === 'In-Progress'}
                    onClick={() => handleUpdateStatus(selectedItem, 'In-Progress')}
                    className={`py-2 px-3 rounded-xl font-bold border transition ${
                      selectedItem.status === 'In-Progress'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    In-Progress
                  </button>

                  <button
                    disabled={isUpdating || selectedItem.status === 'Completed'}
                    onClick={() => handleUpdateStatus(selectedItem, 'Completed')}
                    className={`py-2 px-3 rounded-xl font-bold border transition ${
                      selectedItem.status === 'Completed'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    Completed
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/40">
              <span className="text-[11px] text-slate-500">
                Machine health auto-syncs upon job completion
              </span>
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE NEW WORK ORDER MODAL */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Schedule Maintenance Work Order</h3>
                <p className="text-xs text-slate-400">Book planned service bay or urgent overhaul</p>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mx-5 mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleScheduleSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Equipment Unit</label>
                  <select
                    value={formEqId}
                    onChange={(e) => setFormEqId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    {activeEquipments.map((e) => (
                      <option key={e.equipmentId} value={e.equipmentId}>
                        {e.equipmentId} - {e.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Service Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as MaintenanceType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Preventive">Preventive Maintenance</option>
                    <option value="Corrective">Corrective Maintenance</option>
                    <option value="Inspection">Statutory Inspection</option>
                    <option value="Overhaul">Component Overhaul</option>
                    <option value="Emergency">Emergency Repair</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Priority</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as MaintenancePriority)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Low">Low (Standard)</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High Priority</option>
                    <option value="Critical">Critical (Immediate Outage)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Scheduled Date</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Assigned Lead Technician</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Henderson (Senior Mechanical)"
                  value={formTechnician}
                  onChange={(e) => setFormTechnician(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Task Scope & Description</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Specify oil analysis, filter replacement, hydraulic relief valve calibration..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Est. Downtime (Hours)</label>
                  <input
                    type="number"
                    min="1"
                    value={formDowntime}
                    onChange={(e) => setFormDowntime(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Est. Cost ($ USD)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={formCost}
                    onChange={(e) => setFormCost(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-800 flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20"
                >
                  {isSubmitting ? 'Booking Bay...' : 'Confirm Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
