import { EquipmentType, EquipmentStatus, EquipmentHealthStatus } from '../models/Equipment.js';

export interface EquipmentRecord {
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

export const initialEquipmentFleet: EquipmentRecord[] = [
  {
    equipmentId: 'EXC-001',
    name: 'CAT 390F Heavy Excavator',
    type: 'Excavator',
    model: '390F L',
    manufacturer: 'Caterpillar',
    year: 2022,
    status: 'Running',
    location: 'North Pit - Bench 4',
    engineHours: 4280,
    fuelCapacity: 1220,
    currentFuelLevel: 68,
    temperature: 82,
    utilization: 88,
    assignedOperator: 'Tariq Al-Mansoor',
    lastMaintenanceDate: new Date(Date.now() - 14 * 86400000).toISOString(),
    nextMaintenanceDate: new Date(Date.now() + 16 * 86400000).toISOString(),
    healthStatus: 'Good',
  },
  {
    equipmentId: 'EXC-002',
    name: 'Komatsu PC2000-8 Mining Shovel',
    type: 'Excavator',
    model: 'PC2000-8',
    manufacturer: 'Komatsu',
    year: 2021,
    status: 'Running',
    location: 'South Pit - Sector B',
    engineHours: 6150,
    fuelCapacity: 3400,
    currentFuelLevel: 52,
    temperature: 88,
    utilization: 82,
    assignedOperator: 'Marcus Vance',
    lastMaintenanceDate: new Date(Date.now() - 25 * 86400000).toISOString(),
    nextMaintenanceDate: new Date(Date.now() + 5 * 86400000).toISOString(),
    healthStatus: 'Warning',
  },
  {
    equipmentId: 'DT-001',
    name: 'CAT 797F Ultra Haul Dump Truck',
    type: 'Dump Truck',
    model: '797F',
    manufacturer: 'Caterpillar',
    year: 2023,
    status: 'Running',
    location: 'Haul Road A - Inbound Crusher',
    engineHours: 3120,
    fuelCapacity: 3785,
    currentFuelLevel: 74,
    temperature: 79,
    utilization: 91,
    assignedOperator: 'Dmitri Volkov',
    lastMaintenanceDate: new Date(Date.now() - 10 * 86400000).toISOString(),
    nextMaintenanceDate: new Date(Date.now() + 20 * 86400000).toISOString(),
    healthStatus: 'Good',
  },
  {
    equipmentId: 'DT-002',
    name: 'BelAZ 75710 Heavy Dump Truck',
    type: 'Dump Truck',
    model: '75710',
    manufacturer: 'BelAZ',
    year: 2020,
    status: 'Idle',
    location: 'Central Staging Area',
    engineHours: 8400,
    fuelCapacity: 5600,
    currentFuelLevel: 31,
    temperature: 58,
    utilization: 45,
    assignedOperator: 'Elena Rostova',
    lastMaintenanceDate: new Date(Date.now() - 40 * 86400000).toISOString(),
    nextMaintenanceDate: new Date(Date.now() - 2 * 86400000).toISOString(), // Overdue
    healthStatus: 'Warning',
  },
  {
    equipmentId: 'LD-001',
    name: 'Komatsu WA900-8 Wheel Loader',
    type: 'Loader',
    model: 'WA900-8',
    manufacturer: 'Komatsu',
    year: 2021,
    status: 'Running',
    location: 'Crusher Stockpile 2',
    engineHours: 5320,
    fuelCapacity: 1530,
    currentFuelLevel: 85,
    temperature: 76,
    utilization: 84,
    assignedOperator: 'Kwame Mensah',
    lastMaintenanceDate: new Date(Date.now() - 18 * 86400000).toISOString(),
    nextMaintenanceDate: new Date(Date.now() + 12 * 86400000).toISOString(),
    healthStatus: 'Good',
  },
  {
    equipmentId: 'DR-001',
    name: 'Epiroc Pit Viper 271 Rotary Drill',
    type: 'Drilling Machine',
    model: 'PV-271',
    manufacturer: 'Epiroc',
    year: 2022,
    status: 'Maintenance',
    location: 'Workshop Bay 3',
    engineHours: 4890,
    fuelCapacity: 1400,
    currentFuelLevel: 19,
    temperature: 96,
    utilization: 0,
    assignedOperator: 'Chen Wei',
    lastMaintenanceDate: new Date(Date.now() - 3 * 86400000).toISOString(),
    nextMaintenanceDate: new Date(Date.now() + 27 * 86400000).toISOString(),
    healthStatus: 'Critical',
  },
  {
    equipmentId: 'BD-001',
    name: 'CAT D11T Track Bulldozer',
    type: 'Bulldozer',
    model: 'D11T',
    manufacturer: 'Caterpillar',
    year: 2020,
    status: 'Breakdown',
    location: 'West Waste Dump',
    engineHours: 9240,
    fuelCapacity: 1600,
    currentFuelLevel: 12,
    temperature: 104,
    utilization: 15,
    assignedOperator: 'Carlos Santana',
    lastMaintenanceDate: new Date(Date.now() - 60 * 86400000).toISOString(),
    nextMaintenanceDate: new Date(Date.now() - 15 * 86400000).toISOString(),
    healthStatus: 'Critical',
  },
  {
    equipmentId: 'HT-001',
    name: 'Liebherr T 284 Mining Haul Truck',
    type: 'Haul Truck',
    model: 'T 284',
    manufacturer: 'Liebherr',
    year: 2023,
    status: 'Running',
    location: 'East Pit - Haul Route 7',
    engineHours: 2450,
    fuelCapacity: 5350,
    currentFuelLevel: 79,
    temperature: 77,
    utilization: 93,
    assignedOperator: 'Mateo Rossi',
    lastMaintenanceDate: new Date(Date.now() - 8 * 86400000).toISOString(),
    nextMaintenanceDate: new Date(Date.now() + 22 * 86400000).toISOString(),
    healthStatus: 'Good',
  },
];
