// Canonical chart palette used across xSuite recharts visualizations.
// Charts intentionally do NOT follow the active tenant theme — they
// use neutral data-vis hues so financial dashboards stay comparable
// across tenants and themes. Constants only; no runtime CSS-var read.

export const chartCategorical = [
  '#0891b2', // cyan-600
  '#0d9488', // teal-600
  '#65a30d', // lime-600
  '#ca8a04', // yellow-600
  '#ea580c', // orange-600
  '#be185d', // pink-700
  '#1e40af', // blue-800
  '#475569', // slate-600
] as const;

export const chartAxis = '#64748b';
export const chartGrid = '#e2e8f0';
export const chartTooltipBorder = '#e2e8f0';
