import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Truck,
  Wrench,
  ShieldCheck,
  Radio,
  FileCode,
  Layers,
  Search,
  RefreshCw,
} from 'lucide-react';
import {
  ReportType,
  ReportPreviewData,
  getReportPreviewApi,
  getExportCsvUrl,
  getExportJsonUrl,
  getEquipmentListApi,
  EquipmentItem,
} from '../services/api';

interface ReportsExportCenterProps {
  onOpenAuth?: () => void;
}

export const ReportsExportCenter: React.FC<ReportsExportCenterProps> = () => {
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('maintenance');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [equipments, setEquipments] = useState<EquipmentItem[]>([]);
  const [previewData, setPreviewData] = useState<ReportPreviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchFilter, setSearchFilter] = useState<string>('');

  const reportTypesList: {
    id: ReportType;
    label: string;
    description: string;
    icon: any;
    badge: string;
  }[] = [
    {
      id: 'maintenance',
      label: 'Maintenance Work Orders',
      description: 'Scheduled preventive servicing, component overhauls, repair costs, and downtime',
      icon: Wrench,
      badge: 'Preventive & Repairs',
    },
    {
      id: 'fleet-status',
      label: 'Fleet Registry & Asset Health',
      description: 'Full inventory of heavy mining haulers, excavators, engine meters, and health status',
      icon: Truck,
      badge: 'Equipment Registry',
    },
    {
      id: 'breakdowns',
      label: 'Breakdown & Incident Logs',
      description: 'Unscheduled pit breakdowns, mechanical failure categories, and repair costs',
      icon: AlertTriangle,
      badge: 'Downtime & Cost',
    },
    {
      id: 'handovers',
      label: 'Shift Handover & Pre-Starts',
      description: 'Operator digital pre-start inspections, safety interlocks, and hour meter records',
      icon: ShieldCheck,
      badge: 'Operator Sign-Off',
    },
    {
      id: 'alarms',
      label: 'Incident Alarms & Safety Audit',
      description: 'Acoustic siren logs, critical sensor threshold triggers, and dispatcher sign-offs',
      icon: AlertTriangle,
      badge: 'Safety & ISO Audit',
    },
    {
      id: 'telemetry',
      label: 'IoT Live Telemetry Snapshot',
      description: 'High-frequency telemetry: engine RPM, coolant temp, hydraulic pressure, vibration',
      icon: Radio,
      badge: 'Sensor Streams',
    },
  ];

  const fetchEquipments = async () => {
    try {
      const res = await getEquipmentListApi();
      if (res.success) {
        setEquipments(res.data);
      }
    } catch (err) {
      console.error('Failed to load equipments list', err);
    }
  };

  const fetchPreview = async () => {
    setLoading(true);
    try {
      const res = await getReportPreviewApi({
        reportType: selectedReportType,
        equipmentId: selectedEquipment,
        status: selectedStatus,
      });
      if (res.success) {
        setPreviewData(res);
      }
    } catch (err) {
      console.error('Failed to load report preview', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipments();
  }, []);

  useEffect(() => {
    fetchPreview();
  }, [selectedReportType, selectedEquipment, selectedStatus]);

  const csvUrl = getExportCsvUrl(selectedReportType, {
    equipmentId: selectedEquipment,
    status: selectedStatus,
  });

  const jsonUrl = getExportJsonUrl(selectedReportType, {
    equipmentId: selectedEquipment,
    status: selectedStatus,
  });

  const handlePrint = () => {
    window.print();
  };

  // Filter rows locally by text search
  const filteredRows = (previewData?.rows || []).filter((row) => {
    if (!searchFilter) return true;
    return row.some((cell) =>
      String(cell).toLowerCase().includes(searchFilter.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Mining Operations & Compliance Reports Export
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Audit Ready (CSV & JSON)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate and download official certified reports for regulatory safety audits, equipment warranty claims, and shift management
              </p>
            </div>
          </div>
        </div>

        {/* Global Export Actions */}
        <div className="flex items-center gap-2.5">
          <a
            href={csvUrl}
            download
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-emerald-600/20"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV</span>
          </a>

          <a
            href={jsonUrl}
            download
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
          >
            <FileCode className="w-4 h-4 text-sky-400" />
            <span>JSON</span>
          </a>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Report Type Selector Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {reportTypesList.map((item) => {
          const Icon = item.icon;
          const isSelected = selectedReportType === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setSelectedReportType(item.id)}
              className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/10'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`p-2 rounded-xl border ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                </div>
                <h3 className={`text-sm font-bold ${isSelected ? 'text-amber-300' : 'text-white'}`}>
                  {item.label}
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                <span className={isSelected ? 'text-amber-400 font-semibold' : 'text-slate-500'}>
                  {isSelected ? '● Selected Template' : 'Click to configure'}
                </span>
                {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Dynamic Summary Cards for Selected Report */}
      {previewData?.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(previewData.summary).map(([key, val]) => (
            <div key={key} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
              <span className="text-[11px] font-semibold text-slate-400 capitalize block truncate">
                {key.replace(/([A-Z])/g, ' $1')}
              </span>
              <div className="text-xl font-bold text-white mt-1 font-mono">{String(val)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search within report preview..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <select
            value={selectedEquipment}
            onChange={(e) => setSelectedEquipment(e.target.value)}
            className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-300 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="ALL">All Mining Assets</option>
            {equipments.map((e) => (
              <option key={e.equipmentId} value={e.equipmentId}>
                {e.equipmentId} - {e.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-300 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="ALL">All Statuses</option>
            <option value="Running">Running / Active</option>
            <option value="Scheduled">Scheduled</option>
            <option value="In-Progress">In-Progress</option>
            <option value="Completed">Completed</option>
            <option value="Maintenance">Under Maintenance</option>
          </select>

          <button
            onClick={fetchPreview}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh Preview"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Interactive Data Preview Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Live Data Preview
            </span>
            <span className="text-xs text-slate-400">
              ({filteredRows.length} {filteredRows.length === 1 ? 'row' : 'rows'} loaded)
            </span>
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            Generated: {previewData ? new Date(previewData.generatedAt).toLocaleTimeString() : '...'}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-2" />
            <span className="text-xs text-slate-400">Querying mining compliance records...</span>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-400 text-sm">No records match the current filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                  {previewData?.columns.map((col, idx) => (
                    <th key={idx} className="py-3 px-4 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="hover:bg-slate-800/40 transition group"
                  >
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-3 px-4 text-slate-300 font-mono whitespace-nowrap">
                        {String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Compliance Certification Note */}
      <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>
            Compliant with ISO 55001 Asset Management & Mine Safety & Health Administration (MSHA) record standards.
          </span>
        </div>
        <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
          RFC 4180 CSV / JSON UTF-8 Format
        </span>
      </div>
    </div>
  );
};
