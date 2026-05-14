import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { tenantService } from '../../../lib/tenantService';
import { useToast } from '../../../hooks/useToast';
import { logger } from '../../../lib/logger';
import type { Database } from '../../../types/database.types';

type Role = 'owner' | 'manager' | 'operator';
type SubscriptionPlan = Database['public']['Tables']['subscription_plans']['Row'];

interface GeoCountry {
  id: string;
  code: string;
  name: string;
}

const ROLES: ReadonlyArray<{ value: Role; label: string }> = [
  { value: 'owner',    label: 'Owner' },
  { value: 'manager',  label: 'Manager' },
  { value: 'operator', label: 'Operator' },
];

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

interface SignUpFormProps {
  onSwap: () => void;
}

export function SignUpForm({ onSwap }: SignUpFormProps) {
  const toast = useToast();
  const navigate = useNavigate();

  const [lab, setLab] = useState('');
  const [sub, setSub] = useState('');
  const [subTouched, setSubTouched] = useState(false);
  const [role, setRole] = useState<Role>('owner');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [planId, setPlanId] = useState<string>('');
  const [countries, setCountries] = useState<GeoCountry[]>([]);
  const [countryId, setCountryId] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await tenantService.listPlans();
        if (cancelled) return;
        setPlans(data);
        if (data.length > 0) {
          setPlanId(data[1]?.id ?? data[0].id);
        }
      } catch (err) {
        logger.error('Failed to load plans', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('geo_countries')
          .select('id, code, name')
          .eq('is_active', true)
          .order('name');
        if (error) throw error;
        if (cancelled) return;
        setCountries(data ?? []);
      } catch (err) {
        logger.error('Failed to load countries', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!subTouched) setSub(slugify(lab));
  }, [lab, subTouched]);

  const strength = Math.min(4, Math.floor(password.length / 3));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!lab.trim() || !sub.trim()) {
      toast.error('Lab name and subdomain are required');
      return;
    }
    if (!name.trim() || !email.trim()) {
      toast.error('Your name and work email are required');
      return;
    }
    if (password.length < 12) {
      toast.error('Passphrase must be at least 12 characters');
      return;
    }
    if (!planId) {
      toast.error('Please choose a plan');
      return;
    }
    if (!countryId) {
      toast.error('Please choose a country');
      return;
    }

    setLoading(true);
    try {
      await tenantService.createTenant({
        name: lab.trim(),
        slug: sub.trim(),
        adminEmail: email.trim(),
        adminPassword: password,
        adminFullName: name.trim(),
        planId,
        countryId,
      });
      toast.success('Tenant provisioned. Please sign in.');
      navigate('/login', { replace: true });
    } catch (err) {
      logger.error('Tenant provisioning failed', err);
      toast.error(err instanceof Error ? err.message : 'Failed to provision tenant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="form-card" onSubmit={submit} noValidate>
      <div className="form-eyebrow">§ Provision a new tenant · 90 seconds</div>
      <h2 className="form-title">Sign the<br /><em>first entry.</em></h2>
      <p className="form-sub">
        Name your lab and we'll spin up an isolated tenant. You become the first
        operator on its ledger.
      </p>

      <div className="fields">
        <div className="field">
          <label className="field-label" htmlFor="signup-lab">Lab name</label>
          <input
            id="signup-lab"
            className="field-input"
            type="text"
            placeholder="e.g. Helix Forensics"
            value={lab}
            onChange={(e) => setLab(e.target.value)}
            required
          />
        </div>

        <div className="field with-suffix">
          <div className="field-label">
            <label htmlFor="signup-sub">Subdomain</label>
            <span
              className="hint"
              style={{
                color: sub ? 'var(--accent-deep)' : 'var(--ink)',
                opacity: sub ? 1 : 0.5,
              }}
            >
              {sub ? '✓ AVAILABLE' : 'AUTO'}
            </span>
          </div>
          <input
            id="signup-sub"
            className="field-input mono"
            type="text"
            placeholder="helix-forensics"
            value={sub}
            onChange={(e) => {
              setSubTouched(true);
              setSub(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
            }}
            required
          />
          <span className="field-suffix">.xsuite.io</span>
        </div>

        <div className="field">
          <div className="field-label">Your role</div>
          <div className="chips" role="radiogroup" aria-label="Your role">
            {ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                role="radio"
                aria-checked={role === r.value}
                className={`chip ${role === r.value ? 'active' : ''}`}
                onClick={() => setRole(r.value)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label className="field-label" htmlFor="signup-name">Your name</label>
            <input
              id="signup-name"
              className="field-input"
              type="text"
              autoComplete="name"
              placeholder="D. Park"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="signup-email">Work email</label>
            <input
              id="signup-email"
              className="field-input"
              type="email"
              autoComplete="email"
              placeholder="you@lab.example"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="field">
          <div className="field-label">
            <label htmlFor="signup-password">Set passphrase</label>
            <span className="hint" style={{ opacity: 0.6, fontWeight: 500 }}>min 12 chars</span>
          </div>
          <input
            id="signup-password"
            className="field-input mono"
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={12}
          />
          <button
            type="button"
            className="reveal-btn"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide passphrase' : 'Show passphrase'}
          >
            {show ? 'HIDE' : 'SHOW'}
          </button>
          <div className="strength" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`strength-bar ${i < strength ? 'on' : ''}`} />
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="signup-country">Country</label>
          <select
            id="signup-country"
            className="field-select"
            value={countryId}
            onChange={(e) => setCountryId(e.target.value)}
            required
          >
            <option value="" disabled>Select a country…</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {plans.length > 0 && (
          <div className="field">
            <div className="field-label">Plan</div>
            <div className="plan-chips" role="radiogroup" aria-label="Subscription plan">
              {plans.slice(0, 3).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={planId === p.id}
                  className={`plan-chip ${planId === p.id ? 'active' : ''}`}
                  onClick={() => setPlanId(p.id)}
                >
                  <span className="plan-name">{p.name}</span>
                  <span className="plan-price">${p.price_monthly}</span>
                  <span className="plan-per">per month</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <button type="submit" className={`submit ${loading ? 'loading' : ''}`} disabled={loading}>
        {loading ? (
          <><span className="spinner" /> PROVISIONING TENANT…</>
        ) : (
          <>Provision tenant &amp; sign the first entry <span className="arrow">→</span></>
        )}
      </button>

      <div className="options-row">
        <span>By proceeding you agree to the tenant ToS</span>
        <span>SOC-2 · GDPR · NO CARD</span>
      </div>

      <div className="swap-bar">
        <span className="swap-text">Already operating an xSuite tenant?</span>
        <button
          type="button"
          className="swap-btn"
          onClick={onSwap}
          aria-label="Switch to sign in"
        >
          <span className="swap-arrow">←</span> Sign in
        </button>
      </div>
    </form>
  );
}
