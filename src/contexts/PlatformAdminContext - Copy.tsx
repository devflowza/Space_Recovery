import React, { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCurrentPlatformAdmin } from '../lib/platformAdminService';
import { platformAdminKeys } from '../lib/queryKeys';

interface PlatformAdmin {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

interface PlatformAdminContextType {
  admin: PlatformAdmin | null;
  isLoading: boolean;
  error: Error | null;
}

const PlatformAdminContext = createContext<PlatformAdminContextType | undefined>(undefined);

export const PlatformAdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: admin, isLoading, error } = useQuery({
    queryKey: platformAdminKeys.currentPlatformAdmin(),
    queryFn: getCurrentPlatformAdmin,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <PlatformAdminContext.Provider value={{ admin: admin || null, isLoading, error: error as Error | null }}>
      {children}
    </PlatformAdminContext.Provider>
  );
};

export const usePlatformAdmin = () => {
  const context = useContext(PlatformAdminContext);
  if (context === undefined) {
    throw new Error('usePlatformAdmin must be used within PlatformAdminProvider');
  }
  return context;
};
