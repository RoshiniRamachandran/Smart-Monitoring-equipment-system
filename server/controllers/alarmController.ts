import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Alarm, IAlarm, AlarmSeverity, AlarmStatus } from '../models/Alarm.js';
import { inMemoryEquipmentStore } from '../controllers/equipmentController.js';
import { inMemoryMaintenanceStore, inMemoryBreakdownStore } from '../controllers/maintenanceController.js';
import { inMemoryHandoverStore } from '../controllers/handoverController.js';
import { getLatestReadingsList } from '../services/telemetrySimulator.js';

// Pre-seeded Industrial Alarms
export let inMemoryAlarmStore: (IAlarm & { _id: string })[] = [
  {
    _id: 'ALM-101',
    equipmentId: 'BD-001',
    equipmentName: 'CAT D11T Track Bulldozer',
    equipmentType: 'Bulldozer',
    alarmCode: 'TRM-CRIT-992',
    severity: 'Critical',
    category: 'Transmission',
    title: 'Planetary Gear Torque Convertor Pressure Drop',
    description: 'Reverse planetary gear pressure collapsed to 18 PSI. Severe transmission slip detected under 95% engine load.',
    triggerValue: '18.2 PSI',
    threshold: '< 55.0 PSI',
    status: 'Active',
    audioSirenTriggered: true,
    timestamp: new Date('2026-09-14T06:45:00Z'),
  },
  {
    _id: 'ALM-102',
    equipmentId: 'DR-001',
    equipmentName: 'Epiroc Pit Viper 271 Rotary Drill',
    equipmentType: 'Drilling Machine',
    alarmCode: 'VIB-WARN-404',
    severity: 'Critical',
    category: 'Engine',
    title: 'Rotary Head Spindle Vibration Exceedance (ISO 10816 Class IV)',
    description: 'Rotary head main spindle vibration peak at 9.2 mm/s RMS. Severe bearing cage pitting imminent.',
    triggerValue: '9.2 mm/s',
    threshold: '> 7.1 mm/s',
    status: 'Active',
    audioSirenTriggered: true,
    timestamp: new Date('2026-09-14T07:10:00Z'),
  },
  {
    _id: 'ALM-103',
    equipmentId: 'EXC-001',
    equipmentName: 'CAT 390F Heavy Excavator',
    equipmentType: 'Excavator',
    alarmCode: 'HYD-WARN-201',
    severity: 'Warning',
    category: 'Hydraulics',
    title: 'Boom Cylinder Wiper Gland Leakage Alert',
    description: 'Hydraulic cylinder gland seepage reported during shift pre-start handover inspection.',
    triggerValue: 'Visual Seep',
    threshold: 'Zero Leakage',
    status: 'Acknowledged',
    acknowledgedBy: 'Marcus Vance (Shift Supervisor)',
    acknowledgedAt: new Date('2026-09-14T06:15:00Z'),
    audioSirenTriggered: false,
    timestamp: new Date('2026-09-14T06:05:00Z'),
  },
  {
    _id: 'ALM-104',
    equipmentId: 'DT-002',
    equipmentName: 'BelAZ 75710 Heavy Dump Truck',
    equipmentType: 'Dump Truck',
    alarmCode: 'ENG-WARN-108',
    severity: 'Caution',
    category: 'Engine',
    title: 'Dual Engine 2 Exhaust Gas Temp Delta Exceeds 8%',
    description: 'Bank B cylinder exhaust temp 690°C compared to Bank A 635°C during idle warm-up.',
    triggerValue: 'Delta 55°C',
    threshold: 'Delta < 35°C',
    status: 'Acknowledged',
    acknowledgedBy: 'Elena Rostova',
    acknowledgedAt: new Date('2026-09-14T05:30:00Z'),
    audioSirenTriggered: false,
    timestamp: new Date('2026-09-14T05:22:00Z'),
  },
  {
    _id: 'ALM-105',
    equipmentId: 'EXC-002',
    equipmentName: 'Komatsu PC2000-8 Mining Shovel',
    equipmentType: 'Excavator',
    alarmCode: 'SAF-INFO-001',
    severity: 'Info',
    category: 'Safety',
    title: 'Emergency Cab E-Stop Scheduled Self-Test Passed',
    description: 'Automated 7-day interlock continuity test passed. E-stop relays responsive.',
    triggerValue: 'Passed',
    threshold: 'Pass',
    status: 'Resolved',
    resolvedAt: new Date('2026-09-13T22:00:00Z'),
    resolutionNotes: 'Verified during workshop shift turnover.',
    audioSirenTriggered: false,
    timestamp: new Date('2026-09-13T21:55:00Z'),
  },
];

// @desc    Get incident alarms list with optional severity, status, equipment filters
// @route   GET /api/alarms
// @access  Public
export const getAlarms = async (req: Request, res: Response) => {
  try {
    const { severity, status, equipmentId } = req.query;
    let filtered = [...inMemoryAlarmStore];

    if (severity && severity !== 'ALL') {
      filtered = filtered.filter((a) => a.severity === severity);
    }
    if (status && status !== 'ALL') {
      filtered = filtered.filter((a) => a.status === status);
    }
    if (equipmentId) {
      filtered = filtered.filter(
        (a) => a.equipmentId.toUpperCase() === String(equipmentId).toUpperCase()
      );
    }

    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const activeCriticalCount = inMemoryAlarmStore.filter(
      (a) => a.status === 'Active' && a.severity === 'Critical'
    ).length;

    res.json({
      success: true,
      count: filtered.length,
      activeCriticalCount,
      data: filtered,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Acknowledge an active alarm
// @route   PUT /api/alarms/:id/acknowledge
// @access  Public / Authenticated
export const acknowledgeAlarm = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { operatorName } = req.body;

    const alarm = inMemoryAlarmStore.find((a) => a._id === id);
    if (!alarm) {
      return res.status(404).json({ success: false, message: 'Alarm not found' });
    }

    alarm.status = 'Acknowledged';
    alarm.acknowledgedBy = operatorName || 'Shift Dispatcher';
    alarm.acknowledgedAt = new Date();
    alarm.audioSirenTriggered = false; // silence siren upon acknowledgement

    if (mongoose.connection.readyState === 1) {
      try {
        await Alarm.findByIdAndUpdate(id, {
          status: 'Acknowledged',
          acknowledgedBy: alarm.acknowledgedBy,
          acknowledgedAt: alarm.acknowledgedAt,
          audioSirenTriggered: false,
        });
      } catch {
        // offline mongo fallback
      }
    }

    res.json({
      success: true,
      message: `Alarm ${alarm.alarmCode} acknowledged by ${alarm.acknowledgedBy}`,
      data: alarm,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Resolve an alarm
// @route   PUT /api/alarms/:id/resolve
// @access  Public / Authenticated
export const resolveAlarm = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { resolutionNotes } = req.body;

    const alarm = inMemoryAlarmStore.find((a) => a._id === id);
    if (!alarm) {
      return res.status(404).json({ success: false, message: 'Alarm not found' });
    }

    alarm.status = 'Resolved';
    alarm.resolvedAt = new Date();
    alarm.resolutionNotes = resolutionNotes || 'Repaired and cleared in workshop';
    alarm.audioSirenTriggered = false;

    if (mongoose.connection.readyState === 1) {
      try {
        await Alarm.findByIdAndUpdate(id, {
          status: 'Resolved',
          resolvedAt: alarm.resolvedAt,
          resolutionNotes: alarm.resolutionNotes,
        });
      } catch {
        // offline mongo fallback
      }
    }

    res.json({
      success: true,
      message: `Alarm ${alarm.alarmCode} marked as resolved`,
      data: alarm,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Trigger a manual or simulated incident alarm
// @route   POST /api/alarms/trigger
// @access  Public / Authenticated
export const triggerAlarm = async (req: Request, res: Response) => {
  try {
    const {
      equipmentId,
      severity,
      category,
      title,
      description,
      triggerValue,
      threshold,
      alarmCode,
    } = req.body;

    if (!equipmentId || !severity || !title) {
      return res.status(400).json({
        success: false,
        message: 'Please provide equipmentId, severity, and title',
      });
    }

    const eq = inMemoryEquipmentStore.find(
      (e) => e.equipmentId.toUpperCase() === equipmentId.toUpperCase()
    );

    const newAlarm: IAlarm & { _id: string } = {
      _id: `ALM-${String(inMemoryAlarmStore.length + 101)}`,
      equipmentId: equipmentId.toUpperCase(),
      equipmentName: eq ? eq.name : `Machinery ${equipmentId}`,
      equipmentType: eq ? eq.type : 'Mining Equipment',
      alarmCode: alarmCode || `ALM-${Math.floor(100 + Math.random() * 900)}`,
      severity: (severity as AlarmSeverity) || 'Critical',
      category: category || 'Engine',
      title,
      description: description || 'Threshold exceedance detected by telemetry monitor.',
      triggerValue,
      threshold,
      status: 'Active',
      audioSirenTriggered: severity === 'Critical',
      timestamp: new Date(),
    };

    inMemoryAlarmStore.unshift(newAlarm);

    if (mongoose.connection.readyState === 1) {
      try {
        await Alarm.create(newAlarm);
      } catch {
        // offline mongo fallback
      }
    }

    res.status(201).json({
      success: true,
      message: 'Incident alarm triggered successfully',
      data: newAlarm,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate and download compliance reports (CSV format)
// @route   GET /api/reports/export-csv
// @access  Public
export const exportComplianceReportCsv = async (req: Request, res: Response) => {
  try {
    const { reportType, equipmentId, status } = req.query; // 'fleet-status' | 'maintenance' | 'breakdowns' | 'handovers' | 'alarms' | 'telemetry'

    let csvContent = '';
    let filename = `mining_report_${Date.now()}.csv`;

    if (reportType === 'maintenance') {
      filename = `maintenance_workorders_${new Date().toISOString().slice(0, 10)}.csv`;
      csvContent = 'Work Order ID,Equipment ID,Equipment Name,Type,Priority,Status,Scheduled Date,Assigned Technician,Cost ($),Downtime (Hours),Description\n';
      let items = [...inMemoryMaintenanceStore];
      if (equipmentId && equipmentId !== 'ALL') {
        items = items.filter((m) => m.equipmentId?.toUpperCase() === String(equipmentId).toUpperCase());
      }
      if (status && status !== 'ALL') {
        items = items.filter((m) => m.status === status);
      }
      items.forEach((m) => {
        const sched = m.scheduledDate ? new Date(m.scheduledDate).toISOString().slice(0, 10) : '';
        const desc = (m.description || '').replace(/"/g, '""');
        csvContent += `"${m.maintenanceId || m._id}","${m.equipmentId}","${m.equipmentName}","${m.type}","${m.priority}","${m.status}","${sched}","${m.assignedTechnician}",${m.cost || 0},${m.downtimeHours || 0},"${desc}"\n`;
      });
    } else if (reportType === 'telemetry') {
      filename = `live_telemetry_snapshot_${new Date().toISOString().slice(0, 10)}.csv`;
      csvContent = 'Equipment ID,Equipment Name,Type,Status,RPM,Engine Temp (°C),Oil Pressure (PSI),Vibration (mm/s),Hydraulic Pressure (PSI),Fuel Level (%),Timestamp\n';
      let telemetryReadings = getLatestReadingsList();
      if (equipmentId && equipmentId !== 'ALL') {
        telemetryReadings = telemetryReadings.filter((t) => t.equipmentId?.toUpperCase() === String(equipmentId).toUpperCase());
      }
      telemetryReadings.forEach((t) => {
        csvContent += `"${t.equipmentId}","${t.equipmentName}","${t.equipmentType}","${t.operationalStatus}",${t.engineRpm},${t.temperature},${t.oilPressure},${t.vibration},${t.hydraulicPressure},${t.fuelLevel},"${t.timestamp}"\n`;
      });
    } else if (reportType === 'breakdowns') {
      filename = `breakdowns_incidents_${new Date().toISOString().slice(0, 10)}.csv`;
      csvContent = 'Breakdown ID,Equipment ID,Equipment Name,Fault Category,Severity,Downtime Hours,Est. Cost ($),Status,Reported At\n';
      let items = [...inMemoryBreakdownStore];
      if (equipmentId && equipmentId !== 'ALL') {
        items = items.filter((b) => b.equipmentId?.toUpperCase() === String(equipmentId).toUpperCase());
      }
      if (status && status !== 'ALL') {
        items = items.filter((b) => b.status === status);
      }
      items.forEach((b) => {
        csvContent += `"${b.breakdownId || b._id}","${b.equipmentId}","${b.equipmentName}","${b.faultCategory || 'Mechanical'}","${b.severity}",${b.downtimeHours || 0},${b.estimatedCost || 0},"${b.status}","${b.createdAt}"\n`;
      });
    } else if (reportType === 'handovers') {
      filename = `shift_prestart_inspections_${new Date().toISOString().slice(0, 10)}.csv`;
      csvContent = 'Handover ID,Equipment ID,Equipment Name,Shift,Outgoing Operator,Incoming Operator,Start Hours,End Hours,Inspection Result,Status,Date\n';
      let items = [...inMemoryHandoverStore];
      if (equipmentId && equipmentId !== 'ALL') {
        items = items.filter((h) => h.equipmentId?.toUpperCase() === String(equipmentId).toUpperCase());
      }
      items.forEach((h) => {
        csvContent += `"${h._id}","${h.equipmentId}","${h.equipmentName}","${h.shift}","${h.outgoingOperatorName}","${h.incomingOperatorName}",${h.startingEngineHours},${h.endingEngineHours},"${h.inspectionResult}","${h.status}","${h.date}"\n`;
      });
    } else if (reportType === 'alarms') {
      filename = `incident_alarms_${new Date().toISOString().slice(0, 10)}.csv`;
      csvContent = 'Alarm ID,Code,Equipment ID,Equipment Name,Severity,Category,Title,Status,Trigger Value,Acknowledged By,Timestamp\n';
      let items = [...inMemoryAlarmStore];
      if (equipmentId && equipmentId !== 'ALL') {
        items = items.filter((a) => a.equipmentId?.toUpperCase() === String(equipmentId).toUpperCase());
      }
      if (status && status !== 'ALL') {
        items = items.filter((a) => a.status === status);
      }
      items.forEach((a) => {
        csvContent += `"${a._id}","${a.alarmCode}","${a.equipmentId}","${a.equipmentName}","${a.severity}","${a.category}","${a.title}","${a.status}","${a.triggerValue || ''}","${a.acknowledgedBy || 'Unacknowledged'}","${a.timestamp}"\n`;
      });
    } else {
      // Default: Comprehensive fleet status & availability
      filename = `fleet_registry_compliance_${new Date().toISOString().slice(0, 10)}.csv`;
      csvContent = 'Equipment ID,Name,Type,Model,Status,Engine Hours,Fuel (%),Temperature (°C),Health Status,Location\n';
      let items = [...inMemoryEquipmentStore];
      if (equipmentId && equipmentId !== 'ALL') {
        items = items.filter((e) => e.equipmentId?.toUpperCase() === String(equipmentId).toUpperCase());
      }
      items.forEach((e) => {
        csvContent += `"${e.equipmentId}","${e.name}","${e.type}","${e.model}","${e.status}",${e.engineHours},${e.currentFuelLevel},${e.temperature},"${e.healthStatus}","${e.location || 'Pit Site'}"\n`;
      });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export compliance reports as JSON payload
// @route   GET /api/reports/export-json
// @access  Public
export const exportReportJson = async (req: Request, res: Response) => {
  try {
    const { reportType, equipmentId, status } = req.query;
    let data: any[] = [];
    let filename = `mining_${reportType || 'report'}_${Date.now()}.json`;

    if (reportType === 'maintenance') {
      data = [...inMemoryMaintenanceStore];
      if (equipmentId && equipmentId !== 'ALL') {
        data = data.filter((m) => m.equipmentId?.toUpperCase() === String(equipmentId).toUpperCase());
      }
      if (status && status !== 'ALL') {
        data = data.filter((m) => m.status === status);
      }
    } else if (reportType === 'telemetry') {
      data = getLatestReadingsList();
      if (equipmentId && equipmentId !== 'ALL') {
        data = data.filter((t) => t.equipmentId?.toUpperCase() === String(equipmentId).toUpperCase());
      }
    } else if (reportType === 'breakdowns') {
      data = [...inMemoryBreakdownStore];
      if (equipmentId && equipmentId !== 'ALL') {
        data = data.filter((b) => b.equipmentId?.toUpperCase() === String(equipmentId).toUpperCase());
      }
      if (status && status !== 'ALL') {
        data = data.filter((b) => b.status === status);
      }
    } else if (reportType === 'handovers') {
      data = [...inMemoryHandoverStore];
      if (equipmentId && equipmentId !== 'ALL') {
        data = data.filter((h) => h.equipmentId?.toUpperCase() === String(equipmentId).toUpperCase());
      }
    } else if (reportType === 'alarms') {
      data = [...inMemoryAlarmStore];
      if (equipmentId && equipmentId !== 'ALL') {
        data = data.filter((a) => a.equipmentId?.toUpperCase() === String(equipmentId).toUpperCase());
      }
      if (status && status !== 'ALL') {
        data = data.filter((a) => a.status === status);
      }
    } else {
      data = [...inMemoryEquipmentStore];
      if (equipmentId && equipmentId !== 'ALL') {
        data = data.filter((e) => e.equipmentId?.toUpperCase() === String(equipmentId).toUpperCase());
      }
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(JSON.stringify(data, null, 2));
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get report preview data for UI inspection and printable reports
// @route   GET /api/reports/preview
// @access  Public
export const getReportPreview = async (req: Request, res: Response) => {
  try {
    const { reportType = 'fleet-status', equipmentId, status } = req.query;

    let columns: string[] = [];
    let rows: any[] = [];
    let summary: Record<string, any> = {};

    if (reportType === 'maintenance') {
      columns = ['Work Order', 'Equipment', 'Type', 'Priority', 'Status', 'Technician', 'Date', 'Cost ($)', 'Downtime (h)'];
      let list = [...inMemoryMaintenanceStore];
      if (equipmentId && equipmentId !== 'ALL') {
        list = list.filter((m) => m.equipmentId?.toUpperCase() === String(equipmentId).toUpperCase());
      }
      if (status && status !== 'ALL') {
        list = list.filter((m) => m.status === status);
      }
      const totalCost = list.reduce((acc, cur) => acc + (cur.cost || 0), 0);
      const totalDowntime = list.reduce((acc, cur) => acc + (cur.downtimeHours || 0), 0);

      rows = list.map((m) => [
        m.maintenanceId || m._id,
        `${m.equipmentId} - ${m.equipmentName}`,
        m.type,
        m.priority,
        m.status,
        m.assignedTechnician,
        m.scheduledDate ? new Date(m.scheduledDate).toISOString().slice(0, 10) : 'N/A',
        `$${(m.cost || 0).toLocaleString()}`,
        `${m.downtimeHours || 0} hrs`,
      ]);

      summary = {
        totalRecords: list.length,
        totalCost: `$${totalCost.toLocaleString()}`,
        totalDowntimeHours: `${totalDowntime} hrs`,
        scheduledCount: list.filter((m) => m.status === 'Scheduled').length,
        inProgressCount: list.filter((m) => m.status === 'In-Progress').length,
        completedCount: list.filter((m) => m.status === 'Completed').length,
      };
    } else if (reportType === 'telemetry') {
      columns = ['Equipment ID', 'Name', 'Status', 'RPM', 'Temp (°C)', 'Oil Press (PSI)', 'Vibration (mm/s)', 'Hydraulic (PSI)', 'Fuel (%)'];
      let list = getLatestReadingsList();
      if (equipmentId && equipmentId !== 'ALL') {
        list = list.filter((t) => t.equipmentId?.toUpperCase() === String(equipmentId).toUpperCase());
      }
      rows = list.map((t) => [
        t.equipmentId,
        t.equipmentName,
        t.operationalStatus,
        t.engineRpm,
        `${t.temperature}°C`,
        `${t.oilPressure} PSI`,
        `${t.vibration} mm/s`,
        `${t.hydraulicPressure} PSI`,
        `${t.fuelLevel}%`,
      ]);

      summary = {
        totalUnits: list.length,
        averageTemp: `${(list.reduce((acc, t) => acc + t.temperature, 0) / (list.length || 1)).toFixed(1)}°C`,
        averageFuel: `${(list.reduce((acc, t) => acc + t.fuelLevel, 0) / (list.length || 1)).toFixed(1)}%`,
        activeUnits: list.filter((t) => t.operationalStatus === 'Running').length,
      };
    } else if (reportType === 'breakdowns') {
      columns = ['Breakdown ID', 'Equipment', 'Category', 'Severity', 'Status', 'Downtime (h)', 'Estimated Cost ($)', 'Reported At'];
      let list = [...inMemoryBreakdownStore];
      if (equipmentId && equipmentId !== 'ALL') {
        list = list.filter((b) => b.equipmentId?.toUpperCase() === String(equipmentId).toUpperCase());
      }
      if (status && status !== 'ALL') {
        list = list.filter((b) => b.status === status);
      }
      const totalCost = list.reduce((acc, cur) => acc + (cur.estimatedCost || 0), 0);
      const totalDowntime = list.reduce((acc, cur) => acc + (cur.downtimeHours || 0), 0);

      rows = list.map((b) => [
        b.breakdownId || b._id,
        `${b.equipmentId} - ${b.equipmentName}`,
        b.faultCategory || 'Mechanical',
        b.severity,
        b.status,
        `${b.downtimeHours || 0} hrs`,
        `$${(b.estimatedCost || 0).toLocaleString()}`,
        new Date(b.createdAt).toLocaleDateString(),
      ]);

      summary = {
        totalBreakdowns: list.length,
        totalCost: `$${totalCost.toLocaleString()}`,
        totalDowntimeHours: `${totalDowntime} hrs`,
        criticalCount: list.filter((b) => b.severity === 'Critical').length,
      };
    } else if (reportType === 'handovers') {
      columns = ['Handover ID', 'Equipment', 'Shift', 'Outgoing Op', 'Incoming Op', 'Start Hours', 'End Hours', 'Result'];
      let list = [...inMemoryHandoverStore];
      if (equipmentId && equipmentId !== 'ALL') {
        list = list.filter((h) => h.equipmentId?.toUpperCase() === String(equipmentId).toUpperCase());
      }
      rows = list.map((h) => [
        h._id,
        `${h.equipmentId} - ${h.equipmentName}`,
        h.shift,
        h.outgoingOperatorName,
        h.incomingOperatorName,
        `${h.startingEngineHours} hrs`,
        `${h.endingEngineHours} hrs`,
        h.inspectionResult,
      ]);

      summary = {
        totalHandovers: list.length,
        passedInspections: list.filter((h) => h.inspectionResult === 'Passed').length,
        failedInspections: list.filter((h) => h.inspectionResult === 'Failed - Out of Service').length,
      };
    } else if (reportType === 'alarms') {
      columns = ['Alarm ID', 'Code', 'Equipment', 'Severity', 'Category', 'Title', 'Status', 'Trigger Value', 'Ack By'];
      let list = [...inMemoryAlarmStore];
      if (equipmentId && equipmentId !== 'ALL') {
        list = list.filter((a) => a.equipmentId?.toUpperCase() === String(equipmentId).toUpperCase());
      }
      if (status && status !== 'ALL') {
        list = list.filter((a) => a.status === status);
      }
      rows = list.map((a) => [
        a._id,
        a.alarmCode,
        `${a.equipmentId} - ${a.equipmentName}`,
        a.severity,
        a.category,
        a.title,
        a.status,
        a.triggerValue || 'N/A',
        a.acknowledgedBy || 'Unacknowledged',
      ]);

      summary = {
        totalAlarms: list.length,
        criticalCount: list.filter((a) => a.severity === 'Critical').length,
        activeCount: list.filter((a) => a.status === 'Active').length,
      };
    } else {
      columns = ['Equipment ID', 'Name', 'Type', 'Model', 'Status', 'Engine Hours', 'Fuel (%)', 'Temp (°C)', 'Health'];
      let list = [...inMemoryEquipmentStore];
      if (equipmentId && equipmentId !== 'ALL') {
        list = list.filter((e) => e.equipmentId?.toUpperCase() === String(equipmentId).toUpperCase());
      }
      rows = list.map((e) => [
        e.equipmentId,
        e.name,
        e.type,
        e.model,
        e.status,
        `${e.engineHours} hrs`,
        `${e.currentFuelLevel}%`,
        `${e.temperature}°C`,
        e.healthStatus,
      ]);

      summary = {
        totalFleet: list.length,
        runningCount: list.filter((e) => e.status === 'Running').length,
        maintenanceCount: list.filter((e) => e.status === 'Maintenance').length,
        goodHealthCount: list.filter((e) => e.healthStatus === 'Good').length,
      };
    }

    res.json({
      success: true,
      reportType,
      count: rows.length,
      columns,
      rows,
      summary,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

