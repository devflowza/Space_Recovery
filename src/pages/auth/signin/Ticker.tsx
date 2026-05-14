type TickerRow = readonly [string, string, string, string];

const TICKER: readonly TickerRow[] = [
  ['07:41:18', 'C-001286', 'Intake signed by reception',           'SIG'],
  ['07:40:55', 'C-001271', 'Disk 2/4 imaging complete',            'LOG'],
  ['07:39:02', 'C-001280', 'Donor matched · D-0398',               'REF'],
  ['07:38:44', 'C-001277', 'NDA executed · case unlocked',         'SIG'],
  ['07:36:12', 'C-001263', 'QA checklist 14/14 · ready',           'PASS'],
  ['07:35:01', 'C-001275', 'Transferred to clean room B',          'XFER'],
  ['07:33:47', 'C-001272', 'Quote Q-2026-0118 approved · $4,210',  'QUOTE'],
  ['07:32:11', 'C-001285', 'Diagnosis logged · D. Park',           'DOC'],
  ['07:31:29', 'C-001270', 'Invoice INV-2026-0091 settled',        'PAID'],
  ['07:30:08', 'C-001269', 'Recovery report v3 published',         'DOC'],
];

export function Ticker() {
  const rows = [...TICKER, ...TICKER];
  return (
    <div className="ticker-rows" aria-hidden="true">
      <div className="ticker-roller">
        {rows.map((row, i) => (
          <div className="ticker-row" key={i}>
            <span className="t">{row[0]}</span>
            <span className="c">{row[1]}</span>
            <span className="msg">{row[2]}</span>
            <span className="stamp">{row[3]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
