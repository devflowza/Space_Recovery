import { useState } from 'react';

interface SignInFormProps {
  onSubmit: (email: string, password: string) => void | Promise<void>;
  onSwap: () => void;
  loading: boolean;
  error: string;
}

export function SignInForm({ onSubmit, onSwap, loading, error }: SignInFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [keep, setKeep] = useState(true);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    void onSubmit(email, password);
  };

  return (
    <form className="form-card" onSubmit={submit} noValidate>
      <div className="form-eyebrow">§ Operator sign-in · tenant Helix-Forensics</div>
      <h2 className="form-title">Open the<br /><em>day's ledger.</em></h2>
      <p className="form-sub">
        Sign in to <b>Helix Forensics</b>. Today's first event will be entered in your name.
      </p>

      <div className="fields">
        <div className="field">
          <label className="field-label" htmlFor="signin-email">Email</label>
          <input
            id="signin-email"
            className="field-input"
            type="email"
            autoComplete="username"
            placeholder="d.park@helix-forensics.co.uk"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <div className="field-label">
            <label htmlFor="signin-password">Passphrase</label>
            <span className="hint">Recover →</span>
          </div>
          <input
            id="signin-password"
            className="field-input mono"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="reveal-btn"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide passphrase' : 'Show passphrase'}
          >
            {show ? 'HIDE' : 'SHOW'}
          </button>
        </div>
      </div>

      {error && <div className="form-error" role="alert">{error}</div>}

      <button type="submit" className={`submit ${loading ? 'loading' : ''}`} disabled={loading}>
        {loading ? (
          <><span className="spinner" /> AUTHENTICATING…</>
        ) : (
          <>Sign in &amp; open today's ledger <span className="arrow">→</span></>
        )}
      </button>

      <div className="options-row">
        <span
          className={`keep ${keep ? 'on' : ''}`}
          onClick={() => setKeep((k) => !k)}
          role="checkbox"
          aria-checked={keep}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              setKeep((k) => !k);
            }
          }}
        >
          <span className="box" />Keep session 12h
        </span>
        <span>SSO · SAML · WebAuthn</span>
      </div>

      <div className="swap-bar">
        <span className="swap-text">First time? Provision a new tenant in 90s.</span>
        <button
          type="button"
          className="swap-btn"
          onClick={onSwap}
          aria-label="Switch to sign up"
        >
          Sign up <span className="swap-arrow">→</span>
        </button>
      </div>
    </form>
  );
}
