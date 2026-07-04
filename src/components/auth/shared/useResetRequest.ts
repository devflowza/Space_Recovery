import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

const RESEND_COOLDOWN_SECONDS = 60;

export type ResetRequestStatus = 'idle' | 'sending' | 'sent';

/**
 * Shared state machine for "send me a password-reset link" — used by the
 * login card's forgot-password sub-view and the reset page's invalid-link
 * re-request form. Always resolves to `sent` on 2xx regardless of whether the
 * account exists (GoTrue is deliberately non-enumerating); surfaces rate-limit
 * and network errors; enforces a resend cooldown.
 */
export const useResetRequest = () => {
  const [status, setStatus] = useState<ResetRequestStatus>('idle');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const startCooldown = useCallback(() => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  const send = useCallback(async (email: string) => {
    setError('');
    setStatus('sending');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (resetError) {
      setStatus('idle');
      setError(resetError.message);
      return false;
    }
    setStatus('sent');
    startCooldown();
    return true;
  }, [startCooldown]);

  const reset = useCallback(() => {
    setStatus('idle');
    setError('');
  }, []);

  return { status, error, cooldown, send, reset };
};
