import React, { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../../server/models/User';
import { ShieldAlert, LogIn, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  onRequireLogin?: () => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  onRequireLogin,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
        <p className="text-sm font-medium">Verifying security token & role credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-lg mx-auto text-center my-12 shadow-xl">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 mb-4">
          <LogIn className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Authentication Required</h3>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          This system view is protected by JWT authentication. Please sign in with your mining crew credentials to access telemetry records.
        </p>
        <button
          onClick={onRequireLogin}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
        >
          <LogIn className="w-4 h-4" />
          <span>Go to Crew Sign In</span>
        </button>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role as UserRole)) {
    return (
      <div className="bg-slate-900 border border-rose-500/30 rounded-xl p-8 max-w-lg mx-auto text-center my-12 shadow-xl">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400 mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Access Restricted (403 Forbidden)</h3>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          Your current role (<span className="text-amber-400 font-semibold">{user.role}</span>) does not have authorization to modify or access this resource.
        </p>
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-400 mb-4">
          Required Role: <strong className="text-emerald-400">{allowedRoles.join(' or ')}</strong>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
