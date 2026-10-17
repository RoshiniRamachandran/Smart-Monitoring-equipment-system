import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  User,
  Users,
  KeyRound,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Terminal,
  Send,
  Sparkles,
  Shield,
  FileCode2,
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { getAllUsersApi, UserProfile } from '../services/api';

interface Phase2AuthConsoleProps {
  onOpenAuth: (mode?: 'login' | 'register') => void;
}

export const Phase2AuthConsole: React.FC<Phase2AuthConsoleProps> = ({ onOpenAuth }) => {
  const { user, token, isAuthenticated, logout } = useAuth();
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [activeSubTab, setActiveSubTab] = useState<'matrix' | 'users' | 'jwt'>('matrix');

  const fetchUsers = async () => {
    setLoadingUsers(true);
    setUsersError(null);
    try {
      const res = await getAllUsersApi();
      if (res.success) {
        setUsersList(res.users);
      }
    } catch (err: any) {
      setUsersError(err.response?.data?.message || 'Access Denied: Admin role required for /api/auth/users.');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === 'Admin') {
      fetchUsers();
    } else {
      setUsersList([]);
    }
  }, [isAuthenticated, user?.role]);

  const roleCapabilities = [
    {
      role: 'Admin',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      description: 'Supervisory system administrator with unrestricted management access.',
      canAddEquipment: true,
      canEditEquipment: true,
      canDeleteEquipment: true,
      canManageMaintenance: true,
      canViewBreakdowns: true,
      canViewAnalytics: true,
      canManageUsers: true,
    },
    {
      role: 'Manager',
      badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      description: 'Fleet & maintenance manager overseeing equipment telemetry & repairs.',
      canAddEquipment: false,
      canEditEquipment: false,
      canDeleteEquipment: false,
      canManageMaintenance: true,
      canViewBreakdowns: true,
      canViewAnalytics: true,
      canManageUsers: false,
    },
    {
      role: 'Operator',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      description: 'Heavy machinery operator logging shifts & reporting immediate breakdowns.',
      canAddEquipment: false,
      canEditEquipment: false,
      canDeleteEquipment: false,
      canManageMaintenance: false,
      canViewBreakdowns: true,
      canViewAnalytics: false,
      canManageUsers: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/70 rounded-xl p-5 sm:p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Role-Based Access Control & JWT Security
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Mongoose User schema with pre-save bcrypt salt hashing, signed JWT token generation, role-gated middleware, and client authentication context are now operational.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isAuthenticated ? (
              <>
                <button
                  onClick={() => onOpenAuth('login')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-sm"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Sign In as Crew</span>
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Register Personnel</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs">
                  <span className="text-slate-400">Signed in: </span>
                  <strong className="text-white">{user?.name}</strong>{' '}
                  <span className="text-amber-400">({user?.role})</span>
                </div>
                <button
                  onClick={logout}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Session Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Current Session Status</h3>
          </div>
          <StatusBadge
            status={isAuthenticated ? 'online' : 'disconnected'}
            label={isAuthenticated ? `Authenticated (${user?.role})` : 'Guest / Unauthenticated'}
            size="md"
          />
        </div>

        {isAuthenticated && user ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/50">
              <span className="text-slate-400 block text-[11px]">User Name</span>
              <strong className="text-white text-sm">{user.name}</strong>
            </div>
            <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/50">
              <span className="text-slate-400 block text-[11px]">Email</span>
              <span className="text-amber-300 font-mono text-xs">{user.email}</span>
            </div>
            <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/50">
              <span className="text-slate-400 block text-[11px]">Assigned Role</span>
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {user.role}
              </span>
            </div>
            <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/50">
              <span className="text-slate-400 block text-[11px]">Department</span>
              <span className="text-slate-200">{user.department || 'Operations'}</span>
            </div>
          </div>
        ) : (
          <div className="bg-slate-950/80 rounded-xl p-5 border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-white mb-1">No Active Session</h4>
              <p className="text-[11px] text-slate-400">
                Click below to select any of the pre-configured mining crew roles with 1-click test credentials.
              </p>
            </div>
            <button
              onClick={() => onOpenAuth('login')}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0"
            >
              Sign In (Quick Fill Demo)
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('matrix')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeSubTab === 'matrix'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Role-Based Access Matrix
        </button>
        <button
          onClick={() => setActiveSubTab('jwt')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeSubTab === 'jwt'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          JWT Token & Security Diagnostics
        </button>
        <button
          onClick={() => setActiveSubTab('users')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeSubTab === 'users'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Admin User Registry (/api/auth/users)
        </button>
      </div>

      {/* TAB 1: ROLE MATRIX */}
      {activeSubTab === 'matrix' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Mining Equipment System Role Permissions</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Strictly enforced in backend via <code className="text-amber-300 font-mono">authorize('Admin', ...)</code> middleware and in frontend via <code className="text-amber-300 font-mono">&lt;ProtectedRoute&gt;</code>.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Permission / Action</th>
                  <th className="pb-3 font-semibold text-center text-amber-400">Admin</th>
                  <th className="pb-3 font-semibold text-center text-cyan-400">Manager</th>
                  <th className="pb-3 font-semibold text-center text-emerald-400">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                <tr>
                  <td className="py-2.5 font-medium">Add New Mining Equipment</td>
                  <td className="text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  <td className="text-center text-slate-600">—</td>
                  <td className="text-center text-slate-600">—</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-medium">Edit / Delete Equipment</td>
                  <td className="text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  <td className="text-center text-slate-600">—</td>
                  <td className="text-center text-slate-600">—</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-medium">Record / Schedule Maintenance</td>
                  <td className="text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  <td className="text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  <td className="text-center text-slate-600">—</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-medium">Log Breakdown Incidents</td>
                  <td className="text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  <td className="text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  <td className="text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-2.5 font-medium">View Telemetry Dashboard & KPIs</td>
                  <td className="text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  <td className="text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  <td className="text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-2.5 font-medium">View Fleet Analytics & MTBF/MTTR</td>
                  <td className="text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  <td className="text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  <td className="text-center text-slate-600">—</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-medium">System User Management (/api/auth/users)</td>
                  <td className="text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  <td className="text-center text-slate-600">—</td>
                  <td className="text-center text-slate-600">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: JWT TOKEN DIAGNOSTICS */}
      {activeSubTab === 'jwt' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-amber-400" />
              <span>JWT Authentication Mechanics</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Upon login or registration, the backend signs a JSON Web Token with HMAC-SHA256 containing user ID and role claims:
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[11px] mb-1">Header & Algorithm</span>
                <code className="text-cyan-300 font-mono text-[11px]">{'{ "alg": "HS256", "typ": "JWT" }'}</code>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[11px] mb-1">Decoded Payload Claims</span>
                <pre className="text-emerald-300 font-mono text-[11px]">
{JSON.stringify(
  user ? { id: user.id, email: user.email, role: user.role } : { id: 'usr-demo', email: 'guest@mining.com', role: 'Operator' },
  null,
  2
)}
                </pre>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[11px] mb-1">Password Hashing Mechanism</span>
                <p className="text-slate-300 text-[11px]">
                  bcryptjs 10-round salt generation via <code className="text-amber-300 font-mono">UserSchema.pre('save')</code> before document insertion.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>Active Stored Bearer Token</span>
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Automatically injected by Axios interceptor into <code className="text-amber-300 font-mono">Authorization: Bearer &lt;token&gt;</code>.
            </p>

            <div className="bg-slate-950 rounded-lg p-3.5 font-mono text-[11px] text-amber-300 border border-slate-800 break-all max-h-48 overflow-y-auto">
              {token ? token : 'No active token. Please log in using the button above.'}
            </div>

            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-300">
              <span className="font-semibold block mb-0.5">Protected Route Simulation</span>
              <span className="text-[11px] text-slate-300">
                Calls to <code className="text-emerald-300 font-mono">/api/auth/me</code> automatically authenticate against this token.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ADMIN USER REGISTRY */}
      {activeSubTab === 'users' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span>Personnel Directory (Role-Gated)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Requires <code className="text-amber-300 font-mono">role === 'Admin'</code> to access <code className="text-amber-300 font-mono">/api/auth/users</code>.
              </p>
            </div>
            {user?.role === 'Admin' && (
              <button
                onClick={fetchUsers}
                disabled={loadingUsers}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold"
              >
                {loadingUsers ? 'Refreshing...' : 'Refresh Users'}
              </button>
            )}
          </div>

          {user?.role !== 'Admin' ? (
            <div className="p-6 bg-slate-950 rounded-xl border border-rose-500/30 text-center">
              <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-white mb-1">Access Restricted (403 Forbidden)</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto mb-3">
                You are currently signed in with role <strong className="text-amber-300">"{user?.role || 'Guest'}"</strong>. Only users with the <strong className="text-emerald-400">"Admin"</strong> role can query the full system user registry.
              </p>
              <button
                onClick={() => onOpenAuth('login')}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                Sign In as Admin Demo User
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                    <th className="pb-3 font-semibold">User Name</th>
                    <th className="pb-3 font-semibold">Email</th>
                    <th className="pb-3 font-semibold">Role</th>
                    <th className="pb-3 font-semibold">Department</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 font-semibold text-white">{u.name}</td>
                      <td className="py-2.5 font-mono text-slate-400">{u.email}</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.role === 'Admin'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : u.role === 'Manager'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-400">{u.department || 'Operations'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
