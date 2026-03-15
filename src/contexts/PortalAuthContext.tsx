import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { checkRateLimit, RATE_LIMITS } from '../lib/rateLimiter';

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

  const isValidPortalCustomer = (data: unknown): data is PortalCustomer => {
    if (!data || typeof data !== 'object') return false;
    const obj = data as Record<string, unknown>;
    return (
      typeof obj.id === 'string' &&
      typeof obj.customer_number === 'string' &&
      typeof obj.customer_name === 'string' &&
      (obj.email === null || typeof obj.email === 'string') &&
      (obj.mobile_number === null || typeof obj.mobile_number === 'string') &&
      (obj.profile_photo_url === null || typeof obj.profile_photo_url === 'string')
    );
  };

  const checkPortalSession = async () => {
    try {
      const customerData = sessionStorage.getItem('portal_customer');
      if (customerData) {
        const parsed = JSON.parse(customerData);
        if (isValidPortalCustomer(parsed)) {
          setCustomer(parsed);
        } else {
          console.error('Invalid portal customer data in session, clearing');
          sessionStorage.removeItem('portal_customer');
        }
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

    // Check lockout from failed attempts
    const lockoutKey = `portal_lockout_${email}`;
    const lockoutData = sessionStorage.getItem(lockoutKey);
    if (lockoutData) {
      const { lockedUntil } = JSON.parse(lockoutData);
      if (Date.now() < lockedUntil) {
        const minutesLeft = Math.ceil((lockedUntil - Date.now()) / 60_000);
        setError(`Account temporarily locked. Please try again in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.`);
        setLoading(false);
        return false;
      }
      sessionStorage.removeItem(lockoutKey);
    }

    // Rate limit check
    const rl = checkRateLimit({ ...RATE_LIMITS.PORTAL_LOGIN, key: `portal_login:${email}` });
    if (!rl.allowed) {
      setError(rl.message);
      setLoading(false);
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('authenticate_portal_customer', {
        p_email: email,
        p_password: password,
      });

      if (error || !data) {
        console.error('Authentication error:', error);
        // Track failed attempts
        const failKey = `portal_fails_${email}`;
        const fails = parseInt(sessionStorage.getItem(failKey) || '0') + 1;
        sessionStorage.setItem(failKey, String(fails));

        if (fails >= 5) {
          const lockedUntil = Date.now() + 15 * 60_000; // 15 minutes
          sessionStorage.setItem(lockoutKey, JSON.stringify({ lockedUntil }));
          sessionStorage.removeItem(failKey);
          setError('Too many failed attempts. Account locked for 15 minutes.');
        } else {
          setError('Invalid email or password');
        }
        return false;
      }

      // Successful login — clear failed attempts
      sessionStorage.removeItem(`portal_fails_${email}`);
      sessionStorage.removeItem(lockoutKey);

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
