import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PasswordChangeModal } from '../../components/users/PasswordChangeModal';
import { MFAChallenge } from '../../components/auth/MFAChallenge';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, passwordResetRequired, profile, profileStatus, mfaPending, completeMFAChallenge, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (passwordResetRequired && profile) {
      setShowPasswordChangeModal(true);
    }
  }, [passwordResetRequired, profile]);

  useEffect(() => {
    if (!profile) {
      hasRedirected.current = false;
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile && !passwordResetRequired && !mfaPending && !hasRedirected.current && profileStatus === 'approved') {
      hasRedirected.current = true;
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [profile, passwordResetRequired, mfaPending, navigate, location, profileStatus]);

  if (mfaPending) {
    return (
      <MFAChallenge
        onVerified={completeMFAChallenge}
        onCancel={() => signOut()}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">xSuite</h1>
            <p className="text-slate-600">Sign in to access your cases and customers</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In to xSuite'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            New to xSuite?{' '}
            <Link to="/signup/tenant" className="text-blue-600 hover:text-blue-700 font-medium">
              Create your lab
            </Link>
          </div>
        </div>
      </div>

      {showPasswordChangeModal && profile && (
        <PasswordChangeModal
          isOpen={showPasswordChangeModal}
          userName={profile.full_name}
        />
      )}
    </div>
  );
};
