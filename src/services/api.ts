import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 25000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Authorization Bearer token to all outgoing requests if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mining_auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to format timeout and network errors cleanly
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED' || (error.message && error.message.toLowerCase().includes('timeout'))) {
      error.message = 'Request timed out. Server is processing; please retry.';
    }
    return Promise.reject(error);
  }
);

export interface SystemStatusResponse {
  system: string;
  version: string;
  status: string;
  timestamp: string;
  environment: string;
  port: number | string;
  database: {
    driver: string;
    isConnected: boolean;
    status: 'connected' | 'disconnected' | 'connecting' | 'error';
    host?: string;
    name?: string;
    message: string;
  };
  phase: {
    current: string;
    completedItems: string[];
    nextPhase: string;
  };
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Operator';
  department?: string;
  assignedEquipment?: string[];
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: UserProfile;
}

export type EquipmentType =
  | 'Excavator'
  | 'Dump Truck'
  | 'Loader'
  | 'Drilling Machine'
  | 'Bulldozer'
  | 'Haul Truck';

export type EquipmentStatus =
  | 'Running'
  | 'Idle'
  | 'Maintenance'
  | 'Breakdown'
  | 'Offline';

export type EquipmentHealthStatus = 'Good' | 'Warning' | 'Critical';

export interface EquipmentItem {
  _id?: string;
  equipmentId: string;
  name: string;
  type: EquipmentType;
  model: string;
  manufacturer: string;
  year: number;
  status: EquipmentStatus;
  location: string;
  engineHours: number;
  fuelCapacity: number;
  currentFuelLevel: number;
  temperature: number;
  utilization: number;
  assignedOperator: string;
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
  healthStatus: EquipmentHealthStatus;
  createdAt?: string;
  updatedAt?: string;
}

// System Health API
export const checkBackendHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

export const getSystemStatus = async (): Promise<SystemStatusResponse> => {
  const response = await api.get('/status');
  return response.data;
};

export const triggerDatabaseReconnect = async () => {
  const response = await api.post('/database/reconnect');
  return response.data;
};

// Auth APIs
export const loginApi = async (email: string, password: string): Promise<AuthResponse> => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const registerApi = async (userData: {
  name: string;
  email: string;
  password: string;
  role: 'Admin' | 'Manager' | 'Operator';
  department?: string;
}): Promise<AuthResponse> => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

export const getCurrentUserApi = async (): Promise<{ success: boolean; user: UserProfile }> => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const getAllUsersApi = async (): Promise<{ success: boolean; count: number; users: UserProfile[] }> => {
  const response = await api.get('/auth/users');
  return response.data;
};

// Equipment Management CRUD APIs (Phase 3)
export const getEquipmentListApi = async (params?: {
  search?: string;
  type?: string;
  status?: string;
  healthStatus?: string;
  sort?: string;
}): Promise<{ success: boolean; count: number; dataSource: string; data: EquipmentItem[] }> => {
  const response = await api.get('/equipment', { params });
  return response.data;
};

export const getEquipmentByIdApi = async (
  id: string
): Promise<{ success: boolean; data: EquipmentItem }> => {
  const response = await api.get(`/equipment/${id}`);
  return response.data;
};

export const createEquipmentApi = async (
  payload: Partial<EquipmentItem>
): Promise<{ success: boolean; message: string; data: EquipmentItem }> => {
  const response = await api.post('/equipment', payload);
  return response.data;
};

export const updateEquipmentApi = async (
  id: string,
  payload: Partial<EquipmentItem>
): Promise<{ success: boolean; message: string; data: EquipmentItem }> => {
  const response = await api.put(`/equipment/${id}`, payload);
  return response.data;
};

export const deleteEquipmentApi = async (
  id: string
): Promise<{ success: boolean; message: string; data: EquipmentItem }> => {
  const response = await api.delete(`/equipment/${id}`);
  return response.data;
};

// ==========================================
// Phase 4: Maintenance & Breakdown Types & APIs
// ==========================================

export type MaintenanceType =
  | 'Preventive'
  | 'Corrective'
  | 'Inspection'
  | 'Overhaul'
  | 'Emergency';

export type MaintenancePriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type MaintenanceStatus =
  | 'Scheduled'
  | 'In-Progress'
  | 'Completed'
  | 'Cancelled';

export interface MaintenanceItem {
  _id?: string;
  maintenanceId: string;
  equipmentId: string;
  equipmentName: string;
  type: MaintenanceType;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  scheduledDate: string;
  completionDate?: string;
  assignedTechnician: string;
  description: string;
  actionTaken?: string;
  cost: number;
  downtimeHours: number;
  partsReplaced?: string[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type BreakdownSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type BreakdownStatus = 'Reported' | 'Assessed' | 'Repairing' | 'Resolved';

export interface BreakdownItem {
  _id?: string;
  breakdownId: string;
  equipmentId: string;
  equipmentName: string;
  reportedBy: string;
  reportedAt: string;
  severity: BreakdownSeverity;
  status: BreakdownStatus;
  faultCategory: string;
  location: string;
  symptoms: string;
  rootCause?: string;
  resolutionNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  estimatedCost?: number;
  downtimeHours?: number;
  createdAt?: string;
  updatedAt?: string;
}

export const getMaintenanceListApi = async (params?: {
  search?: string;
  status?: string;
  priority?: string;
  type?: string;
  equipmentId?: string;
}): Promise<{
  success: boolean;
  count: number;
  stats: {
    total: number;
    scheduled: number;
    inProgress: number;
    completed: number;
    critical: number;
    totalCost: number;
    totalDowntime: number;
  };
  dataSource: string;
  data: MaintenanceItem[];
}> => {
  const response = await api.get('/maintenance', { params });
  return response.data;
};

export const createMaintenanceApi = async (
  payload: Partial<MaintenanceItem>
): Promise<{ success: boolean; message: string; data: MaintenanceItem }> => {
  const response = await api.post('/maintenance', payload);
  return response.data;
};

export const updateMaintenanceApi = async (
  id: string,
  payload: Partial<MaintenanceItem>
): Promise<{ success: boolean; message: string; data: MaintenanceItem }> => {
  const response = await api.put(`/maintenance/${id}`, payload);
  return response.data;
};

export const getBreakdownsListApi = async (params?: {
  search?: string;
  status?: string;
  severity?: string;
  faultCategory?: string;
  equipmentId?: string;
}): Promise<{
  success: boolean;
  count: number;
  stats: {
    total: number;
    reported: number;
    repairing: number;
    resolved: number;
    critical: number;
    totalDowntime: number;
    totalEstimatedCost: number;
  };
  dataSource: string;
  data: BreakdownItem[];
}> => {
  const response = await api.get('/maintenance/breakdowns/all', { params });
  return response.data;
};

export const reportBreakdownApi = async (
  payload: Partial<BreakdownItem>
): Promise<{ success: boolean; message: string; data: BreakdownItem }> => {
  const response = await api.post('/maintenance/breakdowns/report', payload);
  return response.data;
};

export const updateBreakdownStatusApi = async (
  id: string,
  payload: Partial<BreakdownItem>
): Promise<{ success: boolean; message: string; data: BreakdownItem }> => {
  const response = await api.put(`/maintenance/breakdowns/${id}/status`, payload);
  return response.data;
};

// ==========================================
// PHASE 5: IOT TELEMETRY SIMULATOR & STREAM
// ==========================================

export interface TelemetryReading {
  equipmentId: string;
  equipmentName: string;
  equipmentType: string;
  timestamp: string;
  engineRpm: number;
  temperature: number; // Coolant °C
  oilPressure: number; // PSI
  vibration: number; // mm/s
  fuelLevel: number; // %
  fuelConsumptionRate: number; // L/h
  hydraulicPressure: number; // Bar
  batteryVoltage: number; // V
  engineLoad: number; // %
  operationalStatus: 'Running' | 'Idle' | 'Maintenance' | 'Breakdown' | 'Offline';
  anomalyDetected: boolean;
  anomalyReason?: string;
}

export const getLatestTelemetryApi = async (): Promise<{
  success: boolean;
  count: number;
  timestamp: string;
  data: TelemetryReading[];
}> => {
  const response = await api.get('/telemetry/latest');
  return response.data;
};

export const getEquipmentTelemetryHistoryApi = async (
  equipmentId: string
): Promise<{
  success: boolean;
  equipmentId: string;
  count: number;
  data: TelemetryReading[];
}> => {
  const response = await api.get(`/telemetry/history/${equipmentId}`);
  return response.data;
};

export const getTelemetryStatusApi = async (): Promise<{
  success: boolean;
  status: {
    isRunning: boolean;
    monitoredEquipments: number;
    activeSubscribers: number;
  };
}> => {
  const response = await api.get('/telemetry/status');
  return response.data;
};

export const injectAnomalyApi = async (payload: {
  equipmentId: string;
  anomalyType: 'temperature' | 'vibration' | 'pressure' | 'rpm';
}): Promise<{
  success: boolean;
  message: string;
  data: TelemetryReading;
}> => {
  const response = await api.post('/telemetry/anomaly', payload);
  return response.data;
};

// ==========================================
// PHASE 6: PREDICTIVE MAINTENANCE & AI SCORES
// ==========================================

export type HealthGrade = 'A' | 'B' | 'C' | 'D' | 'F';
export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical';

export interface PredictionAssessmentItem {
  equipmentId: string;
  equipmentName: string;
  equipmentType: string;
  healthScore: number;
  healthGrade: HealthGrade;
  failureProbability: number;
  remainingUsefulLifeDays: number;
  riskLevel: RiskLevel;
  primaryRiskFactor: string;
  recommendations: string[];
  anomalousSensors: string[];
  aiAnalysisSummary: string;
  componentBreakdown: {
    engine: number;
    hydraulics: number;
    transmission: number;
    coolingSystem: number;
    electrical: number;
  };
  sensorTelemetrySnapshot: {
    temperature: number;
    engineRpm: number;
    oilPressure: number;
    vibration: number;
    engineLoad: number;
    fuelConsumptionRate: number;
  };
  assessedAt: string;
  source: 'gemini-ai' | 'deterministic-rule-engine';
}

export const getEquipmentPredictionApi = async (
  equipmentId: string
): Promise<{
  success: boolean;
  data: PredictionAssessmentItem;
}> => {
  const response = await api.get(`/predictions/equipment/${equipmentId}`);
  return response.data;
};

export const getFleetPredictionsOverviewApi = async (): Promise<{
  success: boolean;
  stats: {
    totalEquipments: number;
    averageHealthScore: number;
    highRiskCount: number;
    totalActiveAnomalies: number;
  };
  data: PredictionAssessmentItem[];
}> => {
  const response = await api.get('/predictions/fleet-overview');
  return response.data;
};

export const getEquipmentPredictionHistoryApi = async (
  equipmentId: string
): Promise<{
  success: boolean;
  equipmentId: string;
  count: number;
  data: PredictionAssessmentItem[];
}> => {
  const response = await api.get(`/predictions/history/${equipmentId}`);
  return response.data;
};

// ==========================================
// PHASE 7: OPERATIONAL DASHBOARD & ANALYTICS
// ==========================================

export interface FleetKPIs {
  totalAssets: number;
  runningAssets: number;
  idleAssets: number;
  maintenanceAssets: number;
  breakdownAssets: number;
  fleetAvailabilityRate: number;
  fleetUtilizationRate: number;
  mtbfHours: number;
  mttrHours: number;
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

export interface AvailabilityTrendItem {
  day: string;
  availability: number;
  running: number;
  breakdown: number;
}

export interface AnalyticsFilterParams {
  equipmentId?: string;
  type?: string;
  status?: string;
  healthStatus?: string;
  search?: string;
  dateRange?: string;
}

export const getOperationalKPIsApi = async (params?: AnalyticsFilterParams): Promise<{
  success: boolean;
  timestamp: string;
  filteredAssetCount?: number;
  data: FleetKPIs;
}> => {
  const response = await api.get('/analytics/kpis', { params });
  return response.data;
};

export const getAnalyticsDistributionsApi = async (params?: AnalyticsFilterParams): Promise<{
  success: boolean;
  statusDistribution: StatusDistributionItem[];
  typeDistribution: TypeDistributionItem[];
  downtimeLeaderboard: MachineDowntimeLeaderboardItem[];
  availabilityTrend: AvailabilityTrendItem[];
}> => {
  const response = await api.get('/analytics/distributions', { params });
  return response.data;
};

// ==========================================
// PHASE 8: SHIFT HANDOVER & PRE-START LOGS
// ==========================================

export type ShiftType = 'Day Shift (06:00 - 18:00)' | 'Night Shift (18:00 - 06:00)';
export type InspectionResult = 'Passed' | 'Passed with Minor Defects' | 'Failed - Out of Service';

export interface InspectionItem {
  category: 'Fluid Levels' | 'Safety Systems' | 'Engine & Electrical' | 'Undercarriage / Tyres' | 'Controls & Hydraulics';
  itemName: string;
  status: 'Pass' | 'Fail' | 'N/A';
  notes?: string;
}

export interface ShiftHandoverItem {
  _id: string;
  equipmentId: string;
  equipmentName: string;
  equipmentType: string;
  shift: ShiftType;
  date: string;
  outgoingOperatorName: string;
  outgoingOperatorId?: string;
  incomingOperatorName: string;
  incomingOperatorId?: string;
  startingEngineHours: number;
  endingEngineHours: number;
  startingFuelLevel: number;
  endingFuelLevel: number;
  inspectionResult: InspectionResult;
  inspectionChecklist: InspectionItem[];
  criticalDefectsNoted?: string;
  operationalNotes?: string;
  safetyInterlockTested: boolean;
  fireSuppressionInspected: boolean;
  status: 'Completed' | 'Pending Review' | 'Flagged for Workshop';
  createdAt?: string;
}

export const getShiftHandoversApi = async (params?: {
  equipmentId?: string;
  status?: string;
  inspectionResult?: string;
}): Promise<{
  success: boolean;
  count: number;
  data: ShiftHandoverItem[];
}> => {
  const response = await api.get('/handovers', { params });
  return response.data;
};

export const getShiftHandoverByIdApi = async (
  id: string
): Promise<{
  success: boolean;
  data: ShiftHandoverItem;
}> => {
  const response = await api.get(`/handovers/${id}`);
  return response.data;
};

export const createShiftHandoverApi = async (payload: {
  equipmentId: string;
  shift: string;
  outgoingOperatorName: string;
  incomingOperatorName: string;
  startingEngineHours: number;
  endingEngineHours: number;
  startingFuelLevel: number;
  endingFuelLevel: number;
  inspectionResult: InspectionResult;
  inspectionChecklist: InspectionItem[];
  criticalDefectsNoted?: string;
  operationalNotes?: string;
  safetyInterlockTested?: boolean;
  fireSuppressionInspected?: boolean;
}): Promise<{
  success: boolean;
  message: string;
  data: ShiftHandoverItem;
}> => {
  const response = await api.post('/handovers', payload);
  return response.data;
};

// ==========================================
// PHASE 9: REAL-TIME INCIDENT ALARMS & REPORTS
// ==========================================

export type AlarmSeverity = 'Critical' | 'Warning' | 'Caution' | 'Info';
export type AlarmCategory = 'Engine' | 'Hydraulics' | 'Transmission' | 'Safety' | 'Fire Suppression' | 'Electrical';
export type AlarmStatus = 'Active' | 'Acknowledged' | 'Resolved' | 'Suppressed';

export interface AlarmItem {
  _id: string;
  equipmentId: string;
  equipmentName: string;
  equipmentType: string;
  alarmCode: string;
  severity: AlarmSeverity;
  category: AlarmCategory;
  title: string;
  description: string;
  triggerValue?: string;
  threshold?: string;
  status: AlarmStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  audioSirenTriggered: boolean;
  timestamp: string;
}

export const getAlarmsApi = async (params?: {
  severity?: string;
  status?: string;
  equipmentId?: string;
}): Promise<{
  success: boolean;
  count: number;
  activeCriticalCount: number;
  data: AlarmItem[];
}> => {
  const response = await api.get('/alarms', { params });
  return response.data;
};

export const acknowledgeAlarmApi = async (
  id: string,
  operatorName?: string
): Promise<{
  success: boolean;
  message: string;
  data: AlarmItem;
}> => {
  const response = await api.put(`/alarms/${id}/acknowledge`, { operatorName });
  return response.data;
};

export const resolveAlarmApi = async (
  id: string,
  resolutionNotes?: string
): Promise<{
  success: boolean;
  message: string;
  data: AlarmItem;
}> => {
  const response = await api.put(`/alarms/${id}/resolve`, { resolutionNotes });
  return response.data;
};

export const triggerAlarmApi = async (payload: {
  equipmentId: string;
  severity: AlarmSeverity;
  category?: string;
  title: string;
  description?: string;
  triggerValue?: string;
  threshold?: string;
}): Promise<{
  success: boolean;
  message: string;
  data: AlarmItem;
}> => {
  const response = await api.post('/alarms/trigger', payload);
  return response.data;
};

export type ReportType = 'fleet-status' | 'maintenance' | 'breakdowns' | 'handovers' | 'alarms' | 'telemetry';

export interface ReportPreviewData {
  success: boolean;
  reportType: ReportType;
  count: number;
  columns: string[];
  rows: (string | number)[][];
  summary: Record<string, any>;
  generatedAt: string;
}

export const getExportCsvUrl = (
  reportType: ReportType,
  params?: { equipmentId?: string; status?: string }
): string => {
  const query = new URLSearchParams({ reportType });
  if (params?.equipmentId && params.equipmentId !== 'ALL') query.set('equipmentId', params.equipmentId);
  if (params?.status && params.status !== 'ALL') query.set('status', params.status);
  return `/api/reports/export-csv?${query.toString()}`;
};

export const getExportJsonUrl = (
  reportType: ReportType,
  params?: { equipmentId?: string; status?: string }
): string => {
  const query = new URLSearchParams({ reportType });
  if (params?.equipmentId && params.equipmentId !== 'ALL') query.set('equipmentId', params.equipmentId);
  if (params?.status && params.status !== 'ALL') query.set('status', params.status);
  return `/api/reports/export-json?${query.toString()}`;
};

export const getReportPreviewApi = async (params: {
  reportType?: ReportType;
  equipmentId?: string;
  status?: string;
}): Promise<ReportPreviewData> => {
  const response = await api.get('/reports/preview', { params });
  return response.data;
};

// ==========================================
// FEATURE 1: EQUIPMENT HEALTH CONDITION HISTORY
// ==========================================

export interface HealthHistoryTimelinePoint {
  day: number;
  date: string;
  timestamp: string;
  conditionScore: number;
  vibration: number;
  temperature: number;
  hydraulicPressure: number;
  oilQualityScore: number;
  event: string | null;
  eventType: 'maintenance' | 'anomaly' | 'inspection' | null;
}

export interface EquipmentHealthHistoryResponse {
  success: boolean;
  equipmentId: string;
  timeframeDays: number;
  currentConditionScore: number;
  healthGrade: string;
  riskLevel: string;
  initialScore: number;
  netConditionChange: number;
  degradationRatePer100h: number;
  estimatedRemainingUsefulLifeHours: number;
  estimatedRemainingUsefulLifeDays: number;
  projectedFailureDate: string;
  componentScores: {
    engine: number;
    transmission: number;
    hydraulics: number;
    electrical: number;
    structural: number;
  };
  primaryRiskFactor: string;
  recommendations: string[];
  timeline: HealthHistoryTimelinePoint[];
}

export interface FleetHealthTimelineResponse {
  success: boolean;
  currentAverageScore: number;
  timeline: {
    date: string;
    avgHealthScore: number;
    criticalAssetsCount: number;
    warningAssetsCount: number;
    healthyAssetsCount: number;
  }[];
}

export const getEquipmentHealthHistoryApi = async (
  equipmentId: string,
  days: number = 30
): Promise<EquipmentHealthHistoryResponse> => {
  const response = await api.get(`/predictions/health-history/${equipmentId}`, {
    params: { days },
  });
  return response.data;
};

export const getFleetHealthTimelineApi = async (): Promise<FleetHealthTimelineResponse> => {
  const response = await api.get('/predictions/health-history-fleet');
  return response.data;
};

// ==========================================
// FEATURE 2: FUEL EFFICIENCY ANALYSIS
// ==========================================

export interface EquipmentFuelProfileItem {
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

export interface FuelEfficiencyResponse {
  success: boolean;
  timestamp: string;
  summary: {
    totalFleetAssets: number;
    activeMachinesCount: number;
    totalCurrentBurnRateLh: number;
    totalDailyFuelConsumedLiters: number;
    totalDailyFuelCostUsd: number;
    totalDailyIdleWastedLiters: number;
    totalDailyIdleCostUsd: number;
    potentialAnnualSavingsUsd: number;
    avgFleetEcoScore: number;
    fleetCo2HourlyKg: number;
    fleetCo2DailyTonnes: number;
    highestConsumer: {
      equipmentId: string;
      name: string;
      burnRate: number;
    };
    mostEfficient: {
      equipmentId: string;
      name: string;
      ecoScore: number;
    };
  };
  equipment: EquipmentFuelProfileItem[];
  hourlyFuelTrend: {
    hour: string;
    actualBurn: number;
    targetBurn: number;
    loadPct: number;
  }[];
}

export const getFuelEfficiencyAnalyticsApi = async (): Promise<FuelEfficiencyResponse> => {
  const response = await api.get('/analytics/fuel-efficiency');
  return response.data;
};

// ==========================================
// FEATURE 3: FLEET LOCATION & TACTICAL MAP
// ==========================================

export interface MineZoneItem {
  id: string;
  name: string;
  code: string;
  type: 'pit' | 'crusher' | 'haulroad' | 'workshop' | 'dump' | 'staging';
  polygonCoordinates: { x: number; y: number }[];
  color: string;
  speedLimitKmh: number;
}

export interface FleetMapEquipmentMarker {
  equipmentId: string;
  name: string;
  type: string;
  model: string;
  manufacturer: string;
  status: 'Running' | 'Idle' | 'Maintenance' | 'Breakdown' | 'Offline';
  healthStatus: 'Good' | 'Warning' | 'Critical';
  locationName: string;
  zoneName: string;
  elevation: string;
  coordinates: {
    x: number;
    y: number;
  };
  speedKmh: number;
  headingDeg: number;
  assignedOperator: string;
  fuelLevel: number;
  temperature: number;
  engineHours: number;
  utilization: number;
  signalStrength: number;
  telemetryNetwork: string;
  lastTelemetryPing: string;
}

export interface FleetMapLocationsResponse {
  success: boolean;
  timestamp: string;
  siteName: string;
  mineSiteDimensionsMeters: {
    width: number;
    height: number;
    datum: string;
  };
  zones: MineZoneItem[];
  fleetCount: number;
  activeOnMapCount: number;
  equipment: FleetMapEquipmentMarker[];
}

export const getFleetMapLocationsApi = async (): Promise<FleetMapLocationsResponse> => {
  const response = await api.get('/equipment/map/locations');
  return response.data;
};

export default api;


