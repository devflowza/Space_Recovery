import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { usePortalAuth } from '../contexts/PortalAuthContext';
import { getPortalSettings } from '../lib/portalUrlService';
import { logger } from '../lib/logger';

interface ProtectedPortalRouteProps {
  children: React.ReactNode;
}

interface PortalGate {
  enabled: boolean;
  maintenance: boolean;
  maintenanceMessage: string | null;
}

const DEFAULT_GATE: PortalGate = {
  enabled: true,
  maintenance: false,
  maintenanceMessage: null,
};

export const ProtectedPortalRoute: React.FC<ProtectedPortalRouteProps> = ({ children }) => {
  const { customer, loading: authLoading } = usePortalAuth();
  const [gate, setGate] = useState<PortalGate | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const settings = await getPortalSettings();
        if (cancelled) return;
        setGate({
          enabled: settings?.portal_enabled ?? DEFAULT_GATE.enabled,
          maintenance: settings?.portal_maintenance_mode ?? DEFAULT_GATE.maintenance,
          maintenanceMessage:
            (settings as { portal_maintenance_message?: string } | null)
              ?.portal_maintenance_message ?? null,
        });
      } catch (err) {
        logger.error('Failed to load portal gate settings:', err);
        if (!cancelled) setGate(DEFAULT_GATE);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isLoading = authLoading || gate === null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
          <p className="text-slate-500 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!gate.enabled) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm max-w-md w-full p-8 text-center">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Portal Unavailable</h1>
          <p className="text-slate-600">
            The customer portal is currently disabled. Please contact support for assistance.
          </p>
        </div>
      </div>
    );
  }

  if (gate.maintenance) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm max-w-md w-full p-8 text-center">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Scheduled Maintenance</h1>
          <p className="text-slate-600 whitespace-pre-wrap">
            {gate.maintenanceMessage ||
              'The portal is currently undergoing maintenance. Please check back soon.'}
          </p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return <Navigate to="/portal/login" replace />;
  }

  return <>{children}</>;
};
