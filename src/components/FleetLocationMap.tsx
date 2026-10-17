import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MapPin,
  Navigation,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  AlertTriangle,
  Activity,
  Truck,
  Flame,
  Wrench,
  Clock,
  Shield,
  Compass,
  Radio,
  Eye,
  ChevronRight,
  Gauge,
  SlidersHorizontal,
} from 'lucide-react';
import {
  getFleetMapLocationsApi,
  FleetMapLocationsResponse,
  FleetMapEquipmentMarker,
  MineZoneItem,
} from '../services/api';

interface FleetLocationMapProps {
  onNavigateTab?: (tab: string) => void;
  onOpenAuth?: () => void;
}

export const FleetLocationMap: React.FC<FleetLocationMapProps> = ({ onNavigateTab }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mapData, setMapData] = useState<FleetMapLocationsResponse | null>(null);

  // Filters & State
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [selectedZone, setSelectedZone] = useState<string>('All');
  const [selectedMarker, setSelectedMarker] = useState<FleetMapEquipmentMarker | null>(null);

  // Map Display Controls
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showZones, setShowZones] = useState<boolean>(true);
  const [showHaulRoads, setShowHaulRoads] = useState<boolean>(true);
  const [showElevations, setShowElevations] = useState<boolean>(true);

  const fetchMapData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getFleetMapLocationsApi();
      setMapData(res);
      // Default to first active marker
      if (!selectedMarker && res.equipment && res.equipment.length > 0) {
        setSelectedMarker(res.equipment[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load tactical mine fleet locations.');
    } finally {
      setLoading(false);
    }
  }, [selectedMarker]);

  useEffect(() => {
    fetchMapData();
    // Auto-poll location tracking every 12 seconds
    const interval = setInterval(fetchMapData, 12000);
    return () => clearInterval(interval);
  }, [fetchMapData]);

  const equipmentList = mapData?.equipment || [];
  const zonesList = mapData?.zones || [];

  // Filter equipment markers
  const filteredMarkers = useMemo(() => {
    return equipmentList.filter((marker) => {
      if (statusFilter !== 'All' && marker.status !== statusFilter) return false;
      if (typeFilter !== 'All' && marker.type !== typeFilter) return false;
      if (selectedZone !== 'All' && marker.zoneName !== selectedZone) return false;
      return true;
    });
  }, [equipmentList, statusFilter, typeFilter, selectedZone]);

  // Color helper for equipment status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Running':
        return '#10b981'; // emerald
      case 'Idle':
        return '#38bdf8'; // sky blue
      case 'Maintenance':
        return '#f59e0b'; // amber
      case 'Breakdown':
        return '#f43f5e'; // rose/red
      default:
        return '#94a3b8'; // slate
    }
  };

  return (
    <div className="space-y-6 text-white pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Open-Pit Tactical Location Telemetry
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Compass className="w-6 h-6 text-emerald-400" />
            Tactical Mine Site Fleet Location Map
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            Real-time geospatial positioning across pit benches, haulage ramps, crusher hoppers, and service workshops.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-white">
              {mapData?.activeOnMapCount || 5} / {mapData?.fleetCount || 7} Assets Active
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Datum: WGS84 UTM 50S (IronRidge Pit)
            </div>
          </div>

          <button
            onClick={fetchMapData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sync GPS
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Map Filter Controls Bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            Filters:
          </span>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="All">All Operational Statuses</option>
            <option value="Running">Running (Active Haul/Dig)</option>
            <option value="Idle">Idle (Queue/Staged)</option>
            <option value="Maintenance">Maintenance (Workshop)</option>
            <option value="Breakdown">Breakdown (Field Outage)</option>
          </select>

          {/* Machinery Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="All">All Equipment Types</option>
            <option value="Excavator">Excavators & Shovels</option>
            <option value="Dump Truck">Ultra Haul Trucks</option>
            <option value="Loader">Wheel Loaders</option>
            <option value="Bulldozer">Bulldozers</option>
            <option value="Drilling Machine">Rotary Blast Drills</option>
          </select>

          {/* Mine Zone Filter */}
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="All">All Mining Sectors & Benches</option>
            {zonesList.map((z) => (
              <option key={z.id} value={z.name}>
                {z.name} ({z.code})
              </option>
            ))}
          </select>
        </div>

        {/* Map Layers & Zoom */}
        <div className="flex items-center gap-2">
          {/* Layer toggles */}
          <button
            onClick={() => setShowZones(!showZones)}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
              showZones
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            Zones
          </button>
          <button
            onClick={() => setShowHaulRoads(!showHaulRoads)}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
              showHaulRoads
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            Haul Roads
          </button>
          <button
            onClick={() => setShowElevations(!showElevations)}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
              showElevations
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            Contours
          </button>

          {/* Zoom buttons */}
          <div className="flex bg-slate-950 rounded-lg border border-slate-800 p-0.5 ml-2">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.2))}
              className="p-1 text-slate-400 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="px-1.5 text-[10px] font-mono text-slate-300"
              title="Reset Zoom"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.6, z + 0.2))}
              className="p-1 text-slate-400 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Map View & Tactical Inspector Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tactical SVG Map Canvas (2 columns on lg) */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-4 overflow-hidden relative shadow-2xl min-h-[500px]">
          {/* Map Top Bar Info */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-xs shadow-lg">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-white font-bold">IronRidge Pit Topography</span>
            <span className="text-slate-400 font-mono text-[10px]">· 3.2km x 2.4km Sector</span>
          </div>

          {/* Interactive SVG Canvas */}
          <div
            className="w-full h-full flex items-center justify-center transition-transform duration-300 select-none"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <svg
              viewBox="0 0 1000 650"
              className="w-full h-auto max-h-[550px] overflow-visible rounded-xl"
            >
              <defs>
                {/* Pit Benches Gradient */}
                <radialGradient id="pitGradient" cx="35%" cy="50%" r="45%">
                  <stop offset="0%" stopColor="#0b1329" />
                  <stop offset="60%" stopColor="#13203c" />
                  <stop offset="100%" stopColor="#0f172a" />
                </radialGradient>
                {/* Waste Dump Pattern */}
                <pattern id="dumpHatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="10" stroke="#f97316" strokeWidth="1" strokeOpacity="0.25" />
                </pattern>
                {/* Workshop Hatch */}
                <pattern id="workshopHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="8" stroke="#8b5cf6" strokeWidth="1" strokeOpacity="0.25" />
                </pattern>
              </defs>

              {/* Background Mine Surface */}
              <rect x="0" y="0" width="1000" height="650" fill="#090d16" />

              {/* Grid Lines */}
              <g stroke="#172033" strokeWidth="0.8" strokeDasharray="4 4">
                {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((x) => (
                  <line key={`x-${x}`} x1={x} y1="0" x2={x} y2="650" />
                ))}
                {[100, 200, 300, 400, 500, 600].map((y) => (
                  <line key={`y-${y}`} x1="0" y1={y} x2="1000" y2={y} />
                ))}
              </g>

              {/* Pit Excavation Ellipse Depressions (Elevation Contours) */}
              {showElevations && (
                <g>
                  {/* Bench 1 Outer Ring (-40m RL) */}
                  <ellipse cx="360" cy="340" rx="280" ry="210" fill="url(#pitGradient)" stroke="#1e293b" strokeWidth="1.5" />
                  <text x="360" y="145" fill="#475569" fontSize="10" textAnchor="middle" fontMono="true">Bench 1 (-40m RL)</text>

                  {/* Bench 2 Ring (-90m RL) */}
                  <ellipse cx="360" cy="340" rx="220" ry="160" fill="none" stroke="#26354d" strokeWidth="1.5" strokeDasharray="3 3" />
                  <text x="360" y="195" fill="#475569" fontSize="10" textAnchor="middle" fontMono="true">Bench 2 (-90m RL)</text>

                  {/* Bench 4 Ring (-140m RL) */}
                  <ellipse cx="350" cy="340" rx="160" ry="110" fill="none" stroke="#334155" strokeWidth="1.5" />
                  <text x="350" y="245" fill="#38bdf8" fontSize="10" textAnchor="middle" fontWeight="bold">Bench 4 (-140m RL)</text>

                  {/* Deep Pit Bottom (-220m RL) */}
                  <ellipse cx="350" cy="350" rx="90" ry="60" fill="#070c18" stroke="#38bdf8" strokeWidth="2" strokeOpacity="0.4" />
                  <text x="350" y="355" fill="#38bdf8" fontSize="10" textAnchor="middle" fontWeight="bold">Pit Sump (-220m)</text>
                </g>
              )}

              {/* Mining Zones Polygons */}
              {showZones && (
                <g>
                  {/* West Waste Dump */}
                  <polygon
                    points="50,280 200,280 200,530 50,530"
                    fill="url(#dumpHatch)"
                    stroke="#f97316"
                    strokeWidth="1.5"
                    strokeOpacity="0.6"
                  />
                  <text x="125" y="410" fill="#f97316" fontSize="11" fontWeight="bold" textAnchor="middle">
                    West Waste Dump (+60m)
                  </text>

                  {/* Primary Crusher Facility */}
                  <polygon
                    points="680,120 920,120 920,300 680,300"
                    fill="#1e1b4b"
                    fillOpacity="0.3"
                    stroke="#eab308"
                    strokeWidth="1.5"
                    strokeOpacity="0.6"
                  />
                  <rect x="740" y="170" width="70" height="50" fill="#eab308" fillOpacity="0.2" stroke="#eab308" strokeWidth="2" />
                  <text x="800" y="150" fill="#eab308" fontSize="11" fontWeight="bold" textAnchor="middle">
                    Primary Crusher & ROM
                  </text>
                  <text x="800" y="250" fill="#ca8a04" fontSize="9" textAnchor="middle">
                    Stockpile Pad (+80m Surface)
                  </text>

                  {/* Workshop Complex */}
                  <polygon
                    points="720,380 940,380 940,580 720,580"
                    fill="url(#workshopHatch)"
                    stroke="#8b5cf6"
                    strokeWidth="1.5"
                    strokeOpacity="0.6"
                  />
                  <text x="830" y="470" fill="#a78bfa" fontSize="11" fontWeight="bold" textAnchor="middle">
                    Heavy Workshop Bays 1-4
                  </text>
                  <text x="830" y="490" fill="#c4b5fd" fontSize="9" textAnchor="middle">
                    Mobile Maintenance & Wash Depot
                  </text>

                  {/* Central Staging Pad */}
                  <rect
                    x="480"
                    y="320"
                    width="140"
                    height="100"
                    fill="#1e293b"
                    fillOpacity="0.4"
                    stroke="#64748b"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <text x="550" y="375" fill="#94a3b8" fontSize="10" fontWeight="bold" textAnchor="middle">
                    Central Staging & Refuel Pad
                  </text>
                </g>
              )}

              {/* Haul Roads Network */}
              {showHaulRoads && (
                <g stroke="#10b981" strokeOpacity="0.5" strokeWidth="4" strokeLinecap="round" fill="none">
                  {/* Main Haul Ramp Alpha (Pit Deep to Surface Crusher) */}
                  <path d="M 350,350 Q 420,280 550,300 T 740,220" strokeDasharray="8 6" />
                  {/* Secondary Ramp to Waste Dump */}
                  <path d="M 350,350 Q 280,380 180,410" strokeDasharray="8 6" />
                  {/* Workshop Link */}
                  <path d="M 550,360 Q 640,420 740,450" strokeDasharray="8 6" />
                </g>
              )}

              {/* Equipment Markers Placed on Tactical Map */}
              {filteredMarkers.map((marker) => {
                const cx = marker.coordinates.x * 10;
                const cy = marker.coordinates.y * 6.5;
                const isSelected = selectedMarker?.equipmentId === marker.equipmentId;
                const statusColor = getStatusColor(marker.status);

                return (
                  <g
                    key={marker.equipmentId}
                    className="cursor-pointer transition-all duration-300 group"
                    onClick={() => setSelectedMarker(marker)}
                  >
                    {/* Pulsing Outer Radar Ring for Running/Breakdown */}
                    {marker.status === 'Breakdown' ? (
                      <circle
                        cx={cx}
                        cy={cy}
                        r="24"
                        fill="none"
                        stroke="#f43f5e"
                        strokeWidth="2"
                        className="animate-ping"
                      />
                    ) : marker.status === 'Running' ? (
                      <circle
                        cx={cx}
                        cy={cy}
                        r="18"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="1.5"
                        strokeOpacity="0.4"
                        className="animate-pulse"
                      />
                    ) : null}

                    {/* Selected Highlight Aura */}
                    {isSelected && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r="22"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="2.5"
                        strokeDasharray="4 2"
                      />
                    )}

                    {/* Machine Marker Base Circle */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r="14"
                      fill="#0f172a"
                      stroke={statusColor}
                      strokeWidth="2.5"
                    />

                    {/* Inner Type Indicator */}
                    <circle cx={cx} cy={cy} r="6" fill={statusColor} />

                    {/* Hover Machine ID Tag */}
                    <g className="transition-opacity opacity-90 group-hover:opacity-100">
                      <rect
                        x={cx - 38}
                        y={cy - 34}
                        width="76"
                        height="18"
                        rx="4"
                        fill="#090d16"
                        stroke={statusColor}
                        strokeWidth="1"
                      />
                      <text
                        x={cx}
                        y={cy - 22}
                        fill="#f8fafc"
                        fontSize="9.5"
                        fontWeight="bold"
                        textAnchor="middle"
                        fontFamily="monospace"
                      >
                        {marker.equipmentId}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Map Compass Rose */}
          <div className="absolute bottom-4 right-4 z-10 flex flex-col items-center bg-slate-900/90 border border-slate-800 p-2 rounded-xl text-[10px] font-mono text-slate-300">
            <span className="font-bold text-emerald-400">N ▲</span>
            <div className="flex items-center gap-2">
              <span>W</span>
              <Compass className="w-4 h-4 text-slate-500" />
              <span>E</span>
            </div>
            <span>S</span>
          </div>

          {/* Status Quick Legend */}
          <div className="absolute bottom-4 left-4 z-10 hidden sm:flex items-center gap-3 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl text-[10px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Running
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              Idle
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Workshop
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              Breakdown
            </span>
          </div>
        </div>

        {/* Selected Asset Tactical Inspector Drawer */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          {selectedMarker ? (
            <div className="space-y-4">
              {/* Asset Header */}
              <div className="border-b border-slate-800 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-black text-white">{selectedMarker.equipmentId}</span>
                    <span className="text-xs text-slate-400">· {selectedMarker.type}</span>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded text-[11px] font-bold border"
                    style={{
                      borderColor: getStatusColor(selectedMarker.status),
                      color: getStatusColor(selectedMarker.status),
                      backgroundColor: `${getStatusColor(selectedMarker.status)}15`,
                    }}
                  >
                    {selectedMarker.status}
                  </span>
                </div>
                <div className="text-sm font-semibold text-slate-200 mt-1">{selectedMarker.name}</div>
                <div className="text-xs text-slate-400">
                  {selectedMarker.manufacturer} · {selectedMarker.model}
                </div>
              </div>

              {/* Geospatial Sector Details */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  Tactical Geographic Position
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Sector Zone:</span>
                    <span className="font-semibold text-white">{selectedMarker.zoneName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Elevation RL:</span>
                    <span className="font-mono font-semibold text-cyan-400">{selectedMarker.elevation}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Current Velocity:</span>
                    <span className="font-mono font-semibold text-white">{selectedMarker.speedKmh} km/h</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Heading Bearing:</span>
                    <span className="font-mono font-semibold text-white">{selectedMarker.headingDeg}° NNE</span>
                  </div>
                </div>
              </div>

              {/* Live Telemetry Health Snapshot */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    Machine Telemetry & Fuel
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">
                    Ping: {selectedMarker.signalStrength}% Mesh
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Fuel Level</span>
                    <span className="font-mono font-bold text-amber-400 text-sm">
                      {selectedMarker.fuelLevel}%
                    </span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Engine Temp</span>
                    <span className="font-mono font-bold text-white text-sm">
                      {selectedMarker.temperature}°C
                    </span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Engine Hours</span>
                    <span className="font-mono font-bold text-white text-sm">
                      {selectedMarker.engineHours}h
                    </span>
                  </div>
                </div>
              </div>

              {/* Assigned Operator & Network */}
              <div className="text-xs text-slate-400 space-y-1 border-t border-slate-800 pt-3">
                <div className="flex justify-between">
                  <span>Assigned Operator:</span>
                  <strong className="text-slate-200">{selectedMarker.assignedOperator}</strong>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Network:</span>
                  <span>{selectedMarker.telemetryNetwork}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-500 text-xs">
              Click any equipment marker on the map to inspect its tactical telemetry and sector coordinates.
            </div>
          )}

          {/* Quick Action Navigation Buttons */}
          {selectedMarker && onNavigateTab && (
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <button
                onClick={() => onNavigateTab('telemetry')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold transition-all cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  Open Live Telemetry Gauges
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => onNavigateTab('maintenance')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-amber-400" />
                  Schedule Maintenance Task
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
