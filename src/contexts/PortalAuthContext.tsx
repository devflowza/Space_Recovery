import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface PortalCustomer {
  id: string;
  customer_number: string;
  customer_name: string;
  email: string | null;
  mobile_number: string | null;
  profile_photo_url: string | null;
}

interface PortalAuthContextType {
  customer: PortalCustomer | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
}

const PortalAuthContext = createContext<PortalAuthContextType | undefined>(undefined);

export const usePortalAuth = () => {
  const context = useContext(PortalAuthContext);
  if (!context) {
    throw new Error('usePortalAuth must be used within a PortalAuthProvider');
  }
  return context;
};

export const PortalAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customer, setCustomer] = useState<PortalCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkPortalSession();
  }, []);

  const checkPortalSession = async () => {
    try {
      const customerData = sessionStorage.getItem('portal_customer');
      if (customerData) {
        setCustomer(JSON.parse(customerData));
      }
    } catch (err) {
      console.error('Session check error:', err);
      sessionStorage.removeItem('portal_customer');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc('authenticate_portal_customer', {
        p_email: email,
        p_password: password,
      });

      if (error) {
        console.error('Authentication error:', error);
        setError('Invalid email or password');
        return false;
      }

      if (!data) {
        setError('Invalid email or password');
        return false;
      }

      const customerData = data as PortalCustomer;
      setCustomer(customerData);
      sessionStorage.setItem('portal_customer', JSON.stringify(customerData));
      setError(null);
      return true;
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to login. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    if (!customer?.id) {
      setError('Not authenticated');
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('change_portal_password', {
        p_customer_id: customer.id,
        p_current_password: currentPassword,
        p_new_password: newPassword,
      });

      if (error) {
        console.error('Password change error:', error);
        setError('Failed to change password');
        return false;
      }

      if (!data) {
        setError('Current password is incorrect');
        return false;
      }

      return true;
    } catch (err) {
      console.error('Password change error:', err);
      setError('Failed to change password');
      return false;
    }
  };

  const logout = () => {
    sessionStorage.removeItem('portal_customer');
    setCustomer(null);
    setError(null);
  };

  return (
    <PortalAuthContext.Provider value={{ customer, loading, error, login, logout, changePassword }}>
      {children}
    </PortalAuthContext.Provider>
  );
};
