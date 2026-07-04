import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ResetPassword } from './ResetPassword';
import { useAuth } from '../../contexts/AuthContext';
import { userManagementService } from '../../lib/userManagementService';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../lib/supabaseClient', () => ({
  supabase: { auth: { resetPasswordForEmail: vi.fn(async () => ({ error: null })) } },
}));
vi.mock('../../lib/userManagementService', () => ({
  userManagementService: { changePassword: vi.fn(async () => ({ success: true })) },
}));

const DEFAULTS = {
  user: { id: 'u1' },
  profile: null,
  session: null,
  loading: false,
  profileStatus: 'approved',
  passwordResetRequired: false,
  mfaPending: false,
  recoveryPending: true,
  signIn: vi.fn(),
  signOut: vi.fn(),
  refreshProfile: vi.fn(),
  completeMFAChallenge: vi.fn(),
  completePasswordRecovery: vi.fn(),
};

function setAuth(over: Record<string, unknown> = {}) {
  vi.mocked(useAuth).mockReturnValue({ ...DEFAULTS, ...over } as unknown as ReturnType<typeof useAuth>);
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/reset-password']}>
      <ResetPassword />
    </MemoryRouter>,
  );
}

// GoTrue's error path leaves the hash intact; the page parses it at mount.
const EXPIRED_HASH = '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired';

describe('ResetPassword', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReset();
    vi.mocked(userManagementService.changePassword).mockClear();
    vi.mocked(supabase.auth.resetPasswordForEmail).mockClear();
    window.location.hash = '';
  });

  afterEach(() => {
    window.location.hash = '';
  });

  it('shows the invalid-link state when mounted with an expired-link error hash', () => {
    window.location.hash = EXPIRED_HASH;
    setAuth({ user: { id: 'u1' } });
    renderPage();
    expect(screen.getByText('This link is invalid or has expired')).toBeInTheDocument();
    expect(screen.queryByText('Set a new password')).not.toBeInTheDocument();
  });

  it('shows the invalid-link state on direct navigation with no session', () => {
    setAuth({ user: null });
    renderPage();
    expect(screen.getByText('This link is invalid or has expired')).toBeInTheDocument();
  });

  it('lets the user request a new link from the invalid-link state', async () => {
    setAuth({ user: null });
    renderPage();
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'tech@lab.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Request a new link' }));
    await waitFor(() => {
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'tech@lab.com',
        { redirectTo: `${window.location.origin}/reset-password` },
      );
    });
    expect(await screen.findByText(/a reset link is on its way/)).toBeInTheDocument();
  });

  it('renders the new-password form when a recovery session exists', () => {
    setAuth();
    renderPage();
    expect(screen.getByText('Set a new password')).toBeInTheDocument();
    expect(screen.getByLabelText('New password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm new password')).toBeInTheDocument();
  });

  it('blocks submit when the password fails the shared policy', async () => {
    setAuth();
    renderPage();
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
    expect(await screen.findByText('Password must be at least 6 characters long')).toBeInTheDocument();
    expect(userManagementService.changePassword).not.toHaveBeenCalled();
  });

  it('blocks submit when the passwords do not match', async () => {
    setAuth();
    renderPage();
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Passw0rd' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'Passw0rd!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
    expect(await screen.findAllByText('Passwords do not match')).not.toHaveLength(0);
    expect(userManagementService.changePassword).not.toHaveBeenCalled();
  });

  it('updates the password, completes the recovery flow, and shows success', async () => {
    const completePasswordRecovery = vi.fn();
    setAuth({ completePasswordRecovery });
    renderPage();
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Passw0rd' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'Passw0rd' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
    await waitFor(() => {
      expect(userManagementService.changePassword).toHaveBeenCalledWith('', 'Passw0rd');
    });
    expect(completePasswordRecovery).toHaveBeenCalled();
    expect(await screen.findByText(/Password updated/)).toBeInTheDocument();
  });

  it('surfaces a changePassword failure without completing the flow', async () => {
    vi.mocked(userManagementService.changePassword).mockResolvedValueOnce({
      success: false,
      error: 'New password should be different from the old password.',
    });
    const completePasswordRecovery = vi.fn();
    setAuth({ completePasswordRecovery });
    renderPage();
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Passw0rd' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'Passw0rd' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
    expect(await screen.findByText('New password should be different from the old password.')).toBeInTheDocument();
    expect(completePasswordRecovery).not.toHaveBeenCalled();
  });

  it('renders the MFA challenge before the password form for aal1 MFA-enrolled sessions', () => {
    setAuth({ mfaPending: true });
    renderPage();
    expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
    expect(screen.queryByText('Set a new password')).not.toBeInTheDocument();
  });
});
