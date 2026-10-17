import { Request, Response } from 'express';
import { inMemoryEquipmentStore } from '../controllers/equipmentController.js';
import { inMemoryMaintenanceStore, inMemoryBreakdownStore } from '../controllers/maintenanceController.js';
import { getLatestReadingsList } from '../services/telemetrySimulator.js';

export interface FleetKPIs {
  totalAssets: number;
  runningAssets: number;
  idleAssets: number;
  maintenanceAssets: number;
  breakdownAssets: number;
  fleetAvailabilityRate: number; // percentage (e.g. 87.5%)
  fleetUtilizationRate: number; // percentage (e.g. 75.0%)
  mtbfHours: number; // Mean Time Between Failures
  mttrHours: number; // Mean Time To Repair
  totalDowntimeHours: number;
  totalMaintenanceCost: number;
  fleetAvgFuelBurnLh: number;
  avgEngineLoad: number;
}

export interface TypeDistributionItem {
  type: string;
  count: number;
  running: number;
  avgHours: number;
}

export interface StatusDistributionItem {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

export interface MachineDowntimeLeaderboardItem {
  equipmentId: string;
  equipmentName: string;
  equipmentType: string;
  downtimeHours: number;
  incidentCount: number;
  status: string;
}

// @desc    Get aggregate operational KPIs & analytics with advanced multi-filter support
// @route   GET /api/analytics/kpis
// @access  Public
export const getOperationalKPIs = async (req: Request, res: Response) => {
  try {
    const { equipmentId, type, status, healthStatus, search } = req.query;
    let fleet = [...inMemoryEquipmentStore];

    if (equipmentId && equipmentId !== 'All') {
      fleet = fleet.filter(e => e.equipmentId.toUpperCase() === String(equipmentId).toUpperCase());
    }
    if (type && type !== 'All') {
      fleet = fleet.filter(e => e.type === type);
    }
    if (status && status !== 'All') {
      fleet = fleet.filter(e => e.status === status);
    }
    if (healthStatus && healthStatus !== 'All') {
      fleet = fleet.filter(e => e.healthStatus === healthStatus);
    }
    if (search) {
      const s = String(search).toLowerCase();
      fleet = fleet.filter(e =>
        e.equipmentId.toLowerCase().includes(s) ||
        e.name.toLowerCase().includes(s) ||
        e.location.toLowerCase().includes(s) ||
        (e.assignedOperator && e.assignedOperator.toLowerCase().includes(s))
      );
    }

    const totalAssets = fleet.length;

    const runningAssets = fleet.filter((e) => e.status === 'Running').length;
    const idleAssets = fleet.filter((e) => e.status === 'Idle').length;
    const maintenanceAssets = fleet.filter((e) => e.status === 'Maintenance').length;
    const breakdownAssets = fleet.filter((e) => e.status === 'Breakdown').length;

    // Availability = (Total Assets - Unplanned Breakdown Assets) / Total Assets * 100
    const fleetAvailabilityRate =
      totalAssets > 0
        ? Number((((totalAssets - breakdownAssets) / totalAssets) * 100).toFixed(1))
        : 100;

    // Utilization = Running / Total Assets * 100
    const fleetUtilizationRate =
      totalAssets > 0
        ? Number(((runningAssets / totalAssets) * 100).toFixed(1))
        : 0;

    // Filter relevant maintenance & breakdown records by equipment in slice
    const allowedIds = new Set(fleet.map(e => e.equipmentId.toUpperCase()));
    const relevantMaintenance = inMemoryMaintenanceStore.filter(m => allowedIds.has(m.equipmentId.toUpperCase()));
    const relevantBreakdown = inMemoryBreakdownStore.filter(b => allowedIds.has(b.equipmentId.toUpperCase()));

    const mntDowntime = relevantMaintenance.reduce((acc, m) => acc + (m.downtimeHours || 0), 0);
    const brkDowntime = relevantBreakdown.reduce((acc, b) => acc + (b.downtimeHours || 0), 0);
    const totalDowntimeHours = mntDowntime + brkDowntime;

    const mntCost = relevantMaintenance.reduce((acc, m) => acc + (m.cost || 0), 0);
    const brkCost = relevantBreakdown.reduce((acc, b) => acc + (b.estimatedCost || 0), 0);
    const totalMaintenanceCost = mntCost + brkCost;

    // MTTR = Total Breakdown Downtime Hours / Number of Breakdown Incidents
    const resolvedBreakdowns = relevantBreakdown.filter((b) => b.status === 'Resolved').length;
    const mttrHours =
      resolvedBreakdowns > 0
        ? Number((brkDowntime / resolvedBreakdowns).toFixed(1))
        : 18.5; // industry standard mining baseline

    // MTBF = Total Operating Hours / Number of Breakdowns
    const totalOperatingHours = fleet.reduce((acc, e) => acc + (e.engineHours || 0), 0);
    const totalBreakdownCount = relevantBreakdown.length;
    const mtbfHours =
      totalBreakdownCount > 0
        ? Math.round(totalOperatingHours / totalBreakdownCount)
        : 450;

    // Live Telemetry aggregations
    const allTelemetry = getLatestReadingsList();
    const relevantTelemetry = allTelemetry.filter(t => allowedIds.has(t.equipmentId.toUpperCase()));

    const fleetAvgFuelBurnLh =
      relevantTelemetry.length > 0
        ? Math.round(
            relevantTelemetry.reduce((acc, t) => acc + t.fuelConsumptionRate, 0)
          )
        : 0;
    const avgEngineLoad =
      relevantTelemetry.length > 0
        ? Math.round(
            relevantTelemetry.reduce((acc, t) => acc + t.engineLoad, 0) / relevantTelemetry.length
          )
        : 0;

    const kpis: FleetKPIs = {
      totalAssets,
      runningAssets,
      idleAssets,
      maintenanceAssets,
      breakdownAssets,
      fleetAvailabilityRate,
      fleetUtilizationRate,
      mtbfHours,
      mttrHours,
      totalDowntimeHours,
      totalMaintenanceCost,
      fleetAvgFuelBurnLh,
      avgEngineLoad,
    };

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      filteredAssetCount: totalAssets,
      data: kpis,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get equipment type and status distributions for analytical charts with filter support
// @route   GET /api/analytics/distributions
// @access  Public
export const getAnalyticsDistributions = async (req: Request, res: Response) => {
  try {
    const { equipmentId, type, status, healthStatus, search } = req.query;
    let fleet = [...inMemoryEquipmentStore];

    if (equipmentId && equipmentId !== 'All') {
      fleet = fleet.filter(e => e.equipmentId.toUpperCase() === String(equipmentId).toUpperCase());
    }
    if (type && type !== 'All') {
      fleet = fleet.filter(e => e.type === type);
    }
    if (status && status !== 'All') {
      fleet = fleet.filter(e => e.status === status);
    }
    if (healthStatus && healthStatus !== 'All') {
      fleet = fleet.filter(e => e.healthStatus === healthStatus);
    }
    if (search) {
      const s = String(search).toLowerCase();
      fleet = fleet.filter(e =>
        e.equipmentId.toLowerCase().includes(s) ||
        e.name.toLowerCase().includes(s) ||
        e.location.toLowerCase().includes(s) ||
        (e.assignedOperator && e.assignedOperator.toLowerCase().includes(s))
      );
    }

    const total = fleet.length;

    // Status breakdown
    const statusCounts: Record<string, number> = {
      Running: 0,
      Idle: 0,
      Maintenance: 0,
      Breakdown: 0,
      Offline: 0,
    };
    fleet.forEach((e) => {
      if (statusCounts[e.status] !== undefined) statusCounts[e.status]++;
    });

    const statusColors: Record<string, string> = {
      Running: '#10b981', // emerald
      Idle: '#0ea5e9', // sky
      Maintenance: '#f59e0b', // amber
      Breakdown: '#f43f5e', // rose
      Offline: '#64748b', // slate
    };

    const statusDistribution: StatusDistributionItem[] = Object.keys(statusCounts).map((status) => ({
      status,
      count: statusCounts[status],
      percentage: total > 0 ? Number(((statusCounts[status] / total) * 100).toFixed(1)) : 0,
      color: statusColors[status] || '#94a3b8',
    }));

    // Type breakdown
    const typeMap = new Map<string, { count: number; running: number; totalHours: number }>();
    fleet.forEach((e) => {
      const current = typeMap.get(e.type) || { count: 0, running: 0, totalHours: 0 };
      current.count++;
      if (e.status === 'Running') current.running++;
      current.totalHours += e.engineHours || 0;
      typeMap.set(e.type, current);
    });

    const typeDistribution: TypeDistributionItem[] = Array.from(typeMap.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      running: data.running,
      avgHours: Math.round(data.totalHours / data.count),
    }));

    // Downtime leaderboard per machine
    const allowedIds = new Set(fleet.map(e => e.equipmentId.toUpperCase()));
    const downtimeMap = new Map<string, { downtime: number; incidents: number }>();

    inMemoryMaintenanceStore
      .filter(m => allowedIds.has(m.equipmentId.toUpperCase()))
      .forEach((m) => {
        const cur = downtimeMap.get(m.equipmentId) || { downtime: 0, incidents: 0 };
        cur.downtime += m.downtimeHours || 0;
        cur.incidents += 1;
        downtimeMap.set(m.equipmentId, cur);
      });

    inMemoryBreakdownStore
      .filter(b => allowedIds.has(b.equipmentId.toUpperCase()))
      .forEach((b) => {
        const cur = downtimeMap.get(b.equipmentId) || { downtime: 0, incidents: 0 };
        cur.downtime += b.downtimeHours || 0;
        cur.incidents += 1;
        downtimeMap.set(b.equipmentId, cur);
      });

    const downtimeLeaderboard: MachineDowntimeLeaderboardItem[] = fleet.map((e) => {
      const dtInfo = downtimeMap.get(e.equipmentId) || { downtime: 0, incidents: 0 };
      return {
        equipmentId: e.equipmentId,
        equipmentName: e.name,
        equipmentType: e.type,
        downtimeHours: dtInfo.downtime,
        incidentCount: dtInfo.incidents,
        status: e.status,
      };
    }).sort((a, b) => b.downtimeHours - a.downtimeHours);

    // 7-day operational availability historical trend (simulated for continuous charts)
    const availabilityTrend = [
      { day: 'Mon', availability: 94.2, running: 6, breakdown: 0 },
      { day: 'Tue', availability: 91.5, running: 5, breakdown: 1 },
      { day: 'Wed', availability: 88.0, running: 5, breakdown: 1 },
      { day: 'Thu', availability: 92.4, running: 6, breakdown: 1 },
      { day: 'Fri', availability: 89.1, running: 5, breakdown: 1 },
      { day: 'Sat', availability: 87.5, running: 5, breakdown: 1 },
      { day: 'Sun', availability: 87.5, running: 5, breakdown: 1 },
    ];

    res.json({
      success: true,
      statusDistribution,
      typeDistribution,
      downtimeLeaderboard,
      availabilityTrend,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// FUEL EFFICIENCY & ECO-METRICS ANALYTICS
// ==========================================

export interface EquipmentFuelProfile {
  equipmentId: string;
  name: string;
  type: string;
  model: string;
  status: string;
  location: string;
  assignedOperator: string;
  fuelCapacity: number;
  currentFuelLevel: number;
  currentFuelLiters: number;
  currentBurnRateLh: number;
  nominalBurnRateLh: number;
  engineLoad: number;
  engineRpm: number;
  ecoScore: number;
  ecoGrade: string;
  idlePercentage: number;
  idleWastedLitersPerShift: number;
  idleCostPerShiftUsd: number;
  co2EmissionsHourlyKg: number;
  estimatedRemainingHours: number;
  optimizationRecommendation: string;
}

// @desc    Get detailed mining fuel efficiency analysis & eco-benchmarks
// @route   GET /api/analytics/fuel-efficiency
// @access  Public
export const getFuelEfficiencyAnalytics = async (req: Request, res: Response) => {
  try {
    const fleet = inMemoryEquipmentStore;
    const telemetry = getLatestReadingsList();

    const nominalMap: Record<string, number> = {
      'Excavator': 68.0,
      'Dump Truck': 112.0,
      'Loader': 46.0,
      'Bulldozer': 82.0,
      'Drilling Machine': 54.0,
    };

    const DIESEL_COST_PER_LITER = 1.28; // USD/L
    const CO2_KG_PER_LITER = 2.68; // Standard EPA/ISO diesel factor

    const equipmentProfiles: EquipmentFuelProfile[] = fleet.map((e) => {
      const tel = telemetry.find((t) => t.equipmentId.toUpperCase() === e.equipmentId.toUpperCase());
      const nominal = nominalMap[e.type] || 60.0;
      const burnRate = tel ? tel.fuelConsumptionRate : (e.status === 'Running' ? nominal * 0.95 : e.status === 'Idle' ? 14.5 : 0);
      const engineLoad = tel ? tel.engineLoad : (e.status === 'Running' ? 72 : e.status === 'Idle' ? 18 : 0);
      const engineRpm = tel ? tel.engineRpm : (e.status === 'Running' ? 1650 : e.status === 'Idle' ? 800 : 0);

      // Expected burn rate adjusted for load
      const expectedBurnForLoad = nominal * (0.25 + 0.75 * (engineLoad / 100));
      const burnRatio = expectedBurnForLoad > 0 ? burnRate / expectedBurnForLoad : 1.0;

      // Eco score 0 - 100
      let ecoScore = Math.round(100 - Math.max(0, (burnRatio - 0.9) * 80));
      if (e.status === 'Idle') ecoScore = Math.max(45, Math.min(75, ecoScore - 15)); // Penalize idling
      if (e.status === 'Breakdown' || e.status === 'Maintenance') ecoScore = 90; // Inactive
      ecoScore = Math.max(30, Math.min(99, ecoScore));

      let ecoGrade = 'A';
      if (ecoScore >= 90) ecoGrade = 'A+';
      else if (ecoScore >= 82) ecoGrade = 'A';
      else if (ecoScore >= 72) ecoGrade = 'B';
      else if (ecoScore >= 60) ecoGrade = 'C';
      else if (ecoScore >= 45) ecoGrade = 'D';
      else ecoGrade = 'F';

      // Estimated idle stats (approx 12-hour mining shift)
      const idlePercentage = e.status === 'Idle' ? 65 : e.type === 'Dump Truck' ? 24 : e.type === 'Excavator' ? 18 : 22;
      const idleHours = Number((12 * (idlePercentage / 100)).toFixed(1));
      const idleWastedLiters = Number((idleHours * 13.5).toFixed(1)); // 13.5 L/h typical idle burn
      const idleCost = Number((idleWastedLiters * DIESEL_COST_PER_LITER).toFixed(1));

      const currentLiters = Math.round((e.fuelCapacity || 1500) * ((tel ? tel.fuelLevel : e.currentFuelLevel) / 100));
      const remainingHours = burnRate > 0 ? Number((currentLiters / burnRate).toFixed(1)) : 48.0;
      const co2Hourly = Number((burnRate * CO2_KG_PER_LITER).toFixed(1));

      let recommendation = 'Burn profile within optimal manufacturer load curve.';
      if (e.status === 'Idle' && idlePercentage > 30) {
        recommendation = 'Excessive idle time detected at staging point. Activate 5-min auto-engine shutdown to conserve ~45 L/shift.';
      } else if (burnRate > nominal * 1.25) {
        recommendation = 'Elevated specific burn under moderate load. Inspect fuel injection timing, charge air cooler, and turbo pressure.';
      } else if (e.type === 'Dump Truck' && engineLoad > 85) {
        recommendation = 'Heavy haul ramp gradient burn rate. Consider payload weight distribution optimization to smooth fuel peaks.';
      } else if (tel && tel.temperature > 92) {
        recommendation = 'Thermal cooling fan drag increasing auxiliary fuel load. Clean radiator matrix.';
      }

      return {
        equipmentId: e.equipmentId,
        name: e.name,
        type: e.type,
        model: e.model,
        status: e.status,
        location: e.location,
        assignedOperator: e.assignedOperator || 'Unassigned',
        fuelCapacity: e.fuelCapacity || 1500,
        currentFuelLevel: tel ? tel.fuelLevel : e.currentFuelLevel,
        currentFuelLiters: currentLiters,
        currentBurnRateLh: burnRate,
        nominalBurnRateLh: nominal,
        engineLoad,
        engineRpm,
        ecoScore,
        ecoGrade,
        idlePercentage,
        idleWastedLitersPerShift: idleWastedLiters,
        idleCostPerShiftUsd: idleCost,
        co2EmissionsHourlyKg: co2Hourly,
        estimatedRemainingHours: remainingHours,
        optimizationRecommendation: recommendation,
      };
    });

    // Fleet Totals
    const activeMachines = equipmentProfiles.filter(p => p.status === 'Running' || p.status === 'Idle');
    const totalCurrentBurnRateLh = activeMachines.reduce((sum, p) => sum + p.currentBurnRateLh, 0);
    const totalDailyFuelConsumedLiters = Math.round(totalCurrentBurnRateLh * 16); // 16 active operating hours/day
    const totalDailyFuelCostUsd = Math.round(totalDailyFuelConsumedLiters * DIESEL_COST_PER_LITER);

    const totalDailyIdleWastedLiters = Math.round(equipmentProfiles.reduce((sum, p) => sum + p.idleWastedLitersPerShift, 0) * 1.5);
    const totalDailyIdleCostUsd = Math.round(totalDailyIdleWastedLiters * DIESEL_COST_PER_LITER);
    const potentialAnnualSavingsUsd = Math.round(totalDailyIdleCostUsd * 365 * 0.55); // 55% idle reduction potential

    const avgFleetEcoScore = Math.round(
      equipmentProfiles.reduce((sum, p) => sum + p.ecoScore, 0) / (equipmentProfiles.length || 1)
    );
    const fleetCo2HourlyKg = Math.round(totalCurrentBurnRateLh * CO2_KG_PER_LITER);
    const fleetCo2DailyTonnes = Number(((totalDailyFuelConsumedLiters * CO2_KG_PER_LITER) / 1000).toFixed(2));

    // Sorted comparisons
    const sortedByBurn = [...equipmentProfiles].sort((a, b) => b.currentBurnRateLh - a.currentBurnRateLh);
    const highestConsumer = sortedByBurn[0];
    const mostEfficient = [...equipmentProfiles].sort((a, b) => b.ecoScore - a.ecoScore)[0];

    // 24-Hour simulated fuel burn profile (Actual vs. Eco Target)
    const hourlyFuelTrend = [
      { hour: '06:00', actualBurn: 320, targetBurn: 290, loadPct: 62 },
      { hour: '08:00', actualBurn: 440, targetBurn: 380, loadPct: 82 },
      { hour: '10:00', actualBurn: 495, targetBurn: 410, loadPct: 88 },
      { hour: '12:00', actualBurn: 280, targetBurn: 240, loadPct: 45 }, // shift change
      { hour: '14:00', actualBurn: 480, targetBurn: 415, loadPct: 85 },
      { hour: '16:00', actualBurn: 460, targetBurn: 395, loadPct: 80 },
      { hour: '18:00', actualBurn: 310, targetBurn: 270, loadPct: 55 },
      { hour: '20:00', actualBurn: 425, targetBurn: 365, loadPct: 75 },
      { hour: '22:00', actualBurn: 390, targetBurn: 340, loadPct: 70 },
      { hour: '00:00', actualBurn: 260, targetBurn: 230, loadPct: 42 },
      { hour: '02:00', actualBurn: 340, targetBurn: 300, loadPct: 60 },
      { hour: '04:00', actualBurn: 380, targetBurn: 330, loadPct: 68 },
    ];

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalFleetAssets: equipmentProfiles.length,
        activeMachinesCount: activeMachines.length,
        totalCurrentBurnRateLh: Math.round(totalCurrentBurnRateLh),
        totalDailyFuelConsumedLiters,
        totalDailyFuelCostUsd,
        totalDailyIdleWastedLiters,
        totalDailyIdleCostUsd,
        potentialAnnualSavingsUsd,
        avgFleetEcoScore,
        fleetCo2HourlyKg,
        fleetCo2DailyTonnes,
        highestConsumer: {
          equipmentId: highestConsumer.equipmentId,
          name: highestConsumer.name,
          burnRate: highestConsumer.currentBurnRateLh,
        },
        mostEfficient: {
          equipmentId: mostEfficient.equipmentId,
          name: mostEfficient.name,
          ecoScore: mostEfficient.ecoScore,
        },
      },
      equipment: equipmentProfiles,
      hourlyFuelTrend,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
