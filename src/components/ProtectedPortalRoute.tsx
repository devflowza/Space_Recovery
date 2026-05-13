import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePortalAuth } from '../contexts/PortalAuthContext';

interface ProtectedPortalRouteProps {
  children: React.ReactNode;
}

export const ProtectedPortalRoute: React.FC<ProtectedPortalRouteProps> = ({ children }) => {
  const { customer, loading } = usePortalAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
          <p className="text-slate-500 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return <Navigate to="/portal/login" replace />;
  }

  return <>{children}</>;
};
