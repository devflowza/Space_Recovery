import { useEffect, useMemo, useState } from 'react';
import type { Theme } from '../../../types/tenantConfig';
import { DEFAULT_THEME, THEMES } from '../../../types/tenantConfig';
import { PromoPanel } from './PromoPanel';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';
import './signin.css';

type Mode = 'signin' | 'signup';

const THEME_HINT_KEY = 'xsuite_theme_hint';

function readPersistedTheme(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    const hint = window.localStorage.getItem(THEME_HINT_KEY);
    if (hint && (THEMES as readonly string[]).includes(hint)) return hint as Theme;
  } catch {
    // localStorage might be unavailable in private mode; fall back silently.
  }
  const docTheme = document.documentElement.dataset.theme;
  if (docTheme && (THEMES as readonly string[]).includes(docTheme)) return docTheme as Theme;
  return DEFAULT_THEME;
}

function formatTimestamp(now: Date): string {
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const d = now.getUTCDate().toString().padStart(2, '0');
  const m = months[now.getUTCMonth()];
  const y = now.getUTCFullYear();
  const hh = now.getUTCHours().toString().padStart(2, '0');
  const mm = now.getUTCMinutes().toString().padStart(2, '0');
  return `${d} ${m} ${y} · ${hh}:${mm} UTC`;
}

interface SignInStageProps {
  initialMode?: Mode;
  onSignIn: (email: string, password: string) => void | Promise<void>;
  signInLoading: boolean;
  signInError: string;
}

export function SignInStage({
  initialMode = 'signin',
  onSignIn,
  signInLoading,
  signInError,
}: SignInStageProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [theme] = useState<Theme>(readPersistedTheme);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const timestamp = useMemo(() => formatTimestamp(now), [now]);

  const toggle = () => setMode((m) => (m === 'signin' ? 'signup' : 'signin'));

  const topStampLeft = mode === 'signin'
    ? 'FILE No. xS-2026-0001 · FORM 09c · OPERATOR SIGN-IN'
    : 'FILE No. xS-2026-0001 · FORM 11a · TENANT PROVISIONING';

  return (
    <div className="xsuite-auth-stage" data-mode={mode} data-theme={theme}>
      <div className="top-bar">
        <span className="stamp">{topStampLeft}</span>
        <span className="stamp">HELD IN CONFIDENCE</span>
      </div>

      <div className="form-half left form-signin">
        <SignInForm
          onSubmit={onSignIn}
          onSwap={toggle}
          loading={signInLoading}
          error={signInError}
        />
      </div>

      <div className="form-half right form-signup">
        <SignUpForm onSwap={toggle} />
      </div>

      <PromoPanel mode={mode} timestamp={timestamp} />

      <div className="bottom-bar">
        <span>v1.1.0 · BUILD r92a</span>
        <span>SOC-2 IN EVIDENCE · POSTGRES · RLS-ENFORCED · 99.99% UPTIME</span>
        <span>© 2026 FLOWZA AI</span>
      </div>
    </div>
  );
}
