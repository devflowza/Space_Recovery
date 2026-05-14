import { Ticker } from './Ticker';

type Mode = 'signin' | 'signup';

interface RegMarkProps {
  corner: 'tl' | 'tr' | 'bl' | 'br';
}

function RegMark({ corner }: RegMarkProps) {
  const top = corner.startsWith('t');
  const left = corner.endsWith('l');
  const style: React.CSSProperties = {
    top: top ? 16 : undefined,
    bottom: top ? undefined : 16,
    left: left ? 16 : undefined,
    right: left ? undefined : 16,
  };
  const d = left
    ? top ? 'M0 0h6 M0 0v6' : 'M0 14v-6 M0 14h6'
    : top ? 'M14 0h-6 M14 0v6' : 'M14 14v-6 M14 14h-6';
  return (
    <svg className="reg-mark" viewBox="0 0 14 14" style={style} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function BrandHeader({ statusLabel, timestamp }: { statusLabel: string; timestamp: string }) {
  return (
    <div className="header-row">
      <div className="brand">
        <div className="brand-mark">x</div>
        <span className="brand-name">xSuite</span>
        <span className="brand-by">BY FLOWZA AI</span>
      </div>
      <div className="status-strip">
        <span><span className="dot">●</span> {statusLabel}</span>
        <span>{timestamp}</span>
      </div>
    </div>
  );
}

const PERKS: ReadonlyArray<readonly [string, string]> = [
  ['ERP CORE',         'Cases · clients · devices · donors'],
  ['CHAIN OF CUSTODY', 'Immutable append-only ledger'],
  ['CLIENT PORTAL',    'Branded subdomain · NDA · reports'],
  ['BILLING & VAT',    'Quotes · invoices · payments · OMR/USD'],
  ['HR · PAYROLL',     'Employees · leave · timesheets'],
  ['ISOLATION',        'RESTRICTIVE RLS · enforced in Postgres'],
];

function SignInPromo({ timestamp }: { timestamp: string }) {
  return (
    <>
      <BrandHeader statusLabel="SYS · NOMINAL" timestamp={timestamp} />
      <span className="eyebrow">OPERATOR · TENANT HELIX-FORENSICS</span>
      <h1 className="display">
        The ledger has been<br /><em>waiting.</em>
      </h1>
      <p className="lede">
        While you were out, the lab ran <b>14 cases</b>, matched <b>3 donors</b>,
        and closed <b>5 reports</b>. Today's first event will be entered in your name.
      </p>
      <div className="ticker">
        <div className="ticker-head">
          <span className="ticker-tag">LIVE · GLOBAL CUSTODY FEED</span>
          <span className="ticker-meta">UTC · ANON · APPEND-ONLY</span>
        </div>
        <Ticker />
        <div className="legal">
          <span>SOC-2 IN EVIDENCE · POSTGRES · RLS-ENFORCED</span>
          <span>v1.1.0 · BUILD r92a</span>
        </div>
      </div>
    </>
  );
}

function SignUpPromo({ timestamp }: { timestamp: string }) {
  return (
    <>
      <BrandHeader statusLabel="PROVISIONER · ONLINE" timestamp={timestamp} />
      <span className="eyebrow">PROVISION · NEW TENANT</span>
      <h1 className="display">
        Open a new lab<br /><em>in 90 seconds.</em>
      </h1>
      <p className="lede">
        Choose a name, claim a subdomain, sign the first entry. xSuite spins up your
        tenant — <b>222 tables, isolated by Postgres RLS</b>, yours alone — before
        the kettle boils.
      </p>
      <div className="ticker" style={{ marginTop: 'auto' }}>
        <div className="ticker-head">
          <span className="ticker-tag" style={{ animation: 'none' }}>
            <span className="perks-tag-dot" />
            INSTANT TENANT · WHAT YOU GET
          </span>
          <span className="ticker-meta">FREE 30-DAY EVAL</span>
        </div>
        <div className="perks-grid">
          {PERKS.map(([k, v]) => (
            <div key={k} className="perk">
              <span className="perk-plus">+</span>
              <span>
                <span className="perk-label">{k}</span>
                {v}
              </span>
            </div>
          ))}
        </div>
        <div className="legal" style={{ marginTop: 14 }}>
          <span>SOC-2 IN EVIDENCE · NO CARD REQUIRED</span>
          <span>v1.1.0 · BUILD r92a</span>
        </div>
      </div>
    </>
  );
}

export function PromoPanel({ mode, timestamp }: { mode: Mode; timestamp: string }) {
  return (
    <div className="promo">
      <div className="promo-bg" />
      <div className="promo-grain" />
      <RegMark corner="tl" />
      <RegMark corner="tr" />
      <RegMark corner="bl" />
      <RegMark corner="br" />
      <div className="promo-inner">
        <div className="promo-content signin" aria-hidden={mode !== 'signin'}>
          <SignInPromo timestamp={timestamp} />
        </div>
        <div className="promo-content signup" aria-hidden={mode !== 'signup'}>
          <SignUpPromo timestamp={timestamp} />
        </div>
      </div>
    </div>
  );
}
