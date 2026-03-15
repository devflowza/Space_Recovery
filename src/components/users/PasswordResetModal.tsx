import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AlertCircle, Mail, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { generateSecurePassword, copyToClipboard } from '../../lib/passwordUtils';

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (temporaryPassword: string) => Promise<void>;
  userName: string;
  userEmail: string;
}

export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  userName,
  userEmail,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [passwordGenerated, setPasswordGenerated] = useState(false);

  useEffect(() => {
    if (isOpen && !passwordGenerated) {
      const newPassword = generateSecurePassword(12);
      setTemporaryPassword(newPassword);
      setPasswordGenerated(true);
      setError('');
      setCopied(false);
      setShowPassword(false);
    }
    if (!isOpen) {
      setPasswordGenerated(false);
      setTemporaryPassword('');
    }
  }, [isOpen, passwordGenerated]);

  const handleCopy = async () => {
    const success = await copyToClipboard(temporaryPassword);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConfirm = async () => {
    setError('');
    setLoading(true);
    try {
      await onConfirm(temporaryPassword);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reset User Password" size="md">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-orange-800 font-medium">
              Password Reset Confirmation
            </p>
            <p className="text-sm text-orange-700 mt-1">
              A temporary password has been generated. Copy it and share it securely with the user.
              They will be required to change it on their next login.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-slate-700">User:</span>
            <span className="text-slate-900">{userName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600">{userEmail}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Temporary Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={temporaryPassword}
              readOnly
              className="w-full px-3 py-2 pr-20 border border-slate-300 rounded-lg bg-slate-50 font-mono text-sm"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Copy to clipboard"
              >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Make sure to copy this password before confirming. You won't be able to see it again.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>Important:</strong> Share this password securely with the user through a private channel.
            The user will be prompted to change it immediately upon their next login.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={loading}>
            {loading ? 'Resetting...' : 'Confirm Reset'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
