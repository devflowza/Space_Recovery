import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Lock, AlertCircle, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { userManagementService } from '../../lib/userManagementService';

interface PasswordChangeModalProps {
  isOpen: boolean;
  userName: string;
}

export const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({
  isOpen,
  userName,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validatePassword = (password: string): string | null => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const getPasswordStrength = (password: string): { label: string; color: string; width: string } => {
    if (password.length === 0) {
      return { label: '', color: '', width: '0%' };
    }

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) {
      return { label: 'Weak', color: 'bg-red-500', width: '33%' };
    } else if (strength <= 4) {
      return { label: 'Medium', color: 'bg-orange-500', width: '66%' };
    } else {
      return { label: 'Strong', color: 'bg-green-500', width: '100%' };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentPassword) {
      setError('Please enter your current password');
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from the current password');
      return;
    }

    setLoading(true);
    try {
      const result = await userManagementService.changePassword(currentPassword, newPassword);

      if (result.success) {
        window.location.reload();
      } else {
        throw new Error(result.error || 'Failed to change password');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(newPassword);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      title="Change Your Password"
      size="md"
      closeButton={false}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-orange-800 font-medium">
              Password Change Required
            </p>
            <p className="text-sm text-orange-700 mt-1">
              Hi {userName}, your password has been reset by an administrator. For security reasons,
              you must change it now before continuing.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Current Password
            </div>
          </label>
          <div className="relative">
            <Input
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter your current password"
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              New Password
            </div>
          </label>
          <div className="relative">
            <Input
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter your new password"
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {newPassword && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-600">Password Strength:</span>
                <span className={`text-xs font-medium ${
                  passwordStrength.label === 'Weak' ? 'text-red-600' :
                  passwordStrength.label === 'Medium' ? 'text-orange-600' :
                  'text-green-600'
                }`}>
                  {passwordStrength.label}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${passwordStrength.color} transition-all duration-300`}
                  style={{ width: passwordStrength.width }}
                />
              </div>
            </div>
          )}
          <ul className="mt-2 space-y-1 text-xs text-slate-600">
            <li className="flex items-center gap-2">
              <CheckCircle className={`w-3 h-3 ${newPassword.length >= 6 ? 'text-green-600' : 'text-slate-300'}`} />
              At least 6 characters
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className={`w-3 h-3 ${/[A-Z]/.test(newPassword) ? 'text-green-600' : 'text-slate-300'}`} />
              One uppercase letter
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className={`w-3 h-3 ${/[a-z]/.test(newPassword) ? 'text-green-600' : 'text-slate-300'}`} />
              One lowercase letter
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className={`w-3 h-3 ${/[0-9]/.test(newPassword) ? 'text-green-600' : 'text-slate-300'}`} />
              One number
            </li>
          </ul>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Confirm New Password
            </div>
          </label>
          <div className="relative">
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your new password"
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-200">
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Changing Password...' : 'Change Password'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
