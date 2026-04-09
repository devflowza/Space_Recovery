import React, { useEffect, useState, useCallback } from 'react';
import { Clock, Mail, LogOut, RefreshCw, Shield, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/Button';

export const PendingApprovalScreen: React.FC = () => {
  const { user, signOut, refreshProfile } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  const checkStatus = useCallback(async () => {
    setIsChecking(true);
    try {
      if (refreshProfile) {
        await refreshProfile();
      } else {
        window.location.reload();
      }
    } finally {
      setIsChecking(false);
      setLastChecked(new Date());
    }
  }, [refreshProfile]);

  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      checkStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, checkStatus]);

  const formatLastChecked = () => {
    const seconds = Math.floor((new Date().getTime() - lastChecked.getTime()) / 1000);
    if (seconds < 5) return 'Just now';
    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-lg shadow-blue-500/25 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">xSuite</h2>
          <p className="text-sm text-gray-500">Data Recovery Management</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-8 py-6 border-b border-amber-100">
            <div className="flex items-center justify-center space-x-3">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div className="text-left">
                <h1 className="text-xl font-semibold text-gray-900">
                  Account Created Successfully
                </h1>
                <p className="text-sm text-amber-700">Awaiting administrator approval</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="text-center mb-6">
              <p className="text-gray-600 leading-relaxed">
                Your account has been created. An administrator will review your access rights
                and activate your account shortly. Please stay tuned.
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <Mail className="w-5 h-5 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Registered Email
                  </p>
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-100">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">What happens next?</p>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>An administrator will assign you the appropriate role</li>
                    <li>You'll gain access based on your assigned permissions</li>
                    <li>Most accounts are approved within 24 hours</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
              <span>Last checked: {formatLastChecked()}</span>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefreshEnabled}
                  onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                  className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span>Auto-refresh every 30s</span>
              </label>
            </div>

            <div className="space-y-3">
              <Button
                variant="primary"
                onClick={checkStatus}
                disabled={isChecking}
                className="w-full"
              >
                {isChecking ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Checking Status...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Check Approval Status
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                onClick={signOut}
                className="w-full text-gray-500 hover:text-gray-700"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Need help? Contact your system administrator for assistance.
        </p>
      </div>
    </div>
  );
};
