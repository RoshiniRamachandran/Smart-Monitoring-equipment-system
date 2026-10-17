import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Phase1Console } from './components/Phase1Console';
import { Phase2AuthConsole } from './components/Phase2AuthConsole';
import { EquipmentList } from './components/EquipmentList';
import { MaintenanceConsole } from './components/MaintenanceConsole';
import { BreakdownConsole } from './components/BreakdownConsole';
import { TelemetryConsole } from './components/TelemetryConsole';
import { PredictiveConsole } from './components/PredictiveConsole';
import { OperationalDashboard } from './components/OperationalDashboard';
import { HandoverConsole } from './components/HandoverConsole';
import { IncidentAlarmsConsole } from './components/IncidentAlarmsConsole';
import { MaintenanceCalendar } from './components/MaintenanceCalendar';
import { ReportsExportCenter } from './components/ReportsExportCenter';
import { FleetLocationMap } from './components/FleetLocationMap';
import { FuelEfficiencyConsole } from './components/FuelEfficiencyConsole';
import { EquipmentHealthHistory } from './components/EquipmentHealthHistory';
import { AuthModal } from './components/AuthModal';
import { AuthProvider } from './context/AuthContext';
import { getSystemStatus, SystemStatusResponse } from './services/api';

function AppContent() {
  const [activeTab, setActiveTab] = useState<string>('equipment');
  const [statusData, setStatusData] = useState<SystemStatusResponse | null>(null);
  const [serverOnline, setServerOnline] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [latency, setLatency] = useState<number | null>(null);

  // Auth modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const handleOpenAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    const start = performance.now();
    try {
      const data = await getSystemStatus();
      const end = performance.now();
      setStatusData(data);
      setServerOnline(true);
      setLatency(Math.round(end - start));
    } catch (err) {
      console.warn('Backend status check failed:', err);
      setServerOnline(false);
      setLatency(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Poll every 20s to keep live status in sync
    const interval = setInterval(fetchStatus, 20000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const dbStatus = statusData?.database?.status || 'disconnected';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Industrial Top Navbar */}
      <Navbar
        serverOnline={serverOnline}
        dbStatus={dbStatus}
        onRefresh={fetchStatus}
        loading={loading}
        onOpenAuth={handleOpenAuth}
        activeTab={activeTab}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Module Sidebar */}
        <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

        {/* Dynamic Page Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'overview' && (
              <Phase1Console
                statusData={statusData}
                serverOnline={serverOnline}
                dbStatus={dbStatus}
                loading={loading}
                onRefresh={fetchStatus}
                latency={latency}
              />
            )}

            {activeTab === 'auth' && (
              <Phase2AuthConsole onOpenAuth={handleOpenAuth} />
            )}

            {activeTab === 'equipment' && (
              <EquipmentList onOpenAuth={handleOpenAuth} />
            )}

            {activeTab === 'calendar' && (
              <MaintenanceCalendar onOpenAuth={handleOpenAuth} />
            )}

            {activeTab === 'reports' && (
              <ReportsExportCenter onOpenAuth={handleOpenAuth} />
            )}

            {activeTab === 'maintenance' && (
              <MaintenanceConsole onOpenAuth={handleOpenAuth} />
            )}

            {activeTab === 'breakdowns' && (
              <BreakdownConsole onOpenAuth={handleOpenAuth} />
            )}

            {activeTab === 'telemetry' && (
              <TelemetryConsole onOpenAuth={handleOpenAuth} />
            )}

            {activeTab === 'fleetmap' && (
              <FleetLocationMap onNavigateTab={(tab) => setActiveTab(tab)} onOpenAuth={handleOpenAuth} />
            )}

            {activeTab === 'fuelefficiency' && (
              <FuelEfficiencyConsole onOpenAuth={handleOpenAuth} />
            )}

            {activeTab === 'healthhistory' && (
              <EquipmentHealthHistory onOpenAuth={handleOpenAuth} />
            )}

            {activeTab === 'predictions' && (
              <PredictiveConsole onOpenAuth={handleOpenAuth} />
            )}

            {activeTab === 'dashboard' && (
              <OperationalDashboard onNavigateTab={(tab) => setActiveTab(tab)} />
            )}

            {activeTab === 'handovers' && (
              <HandoverConsole onOpenAuth={handleOpenAuth} />
            )}

            {activeTab === 'alerts' && (
              <IncidentAlarmsConsole onOpenAuth={handleOpenAuth} />
            )}
          </div>
        </main>
      </div>

      {/* Reusable Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
