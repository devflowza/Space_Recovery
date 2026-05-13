// Device icon SVG strings consumed by pdfmake PDF builders. The fixed
// stroke/fill hex values below (#4A5568 etc.) are intentionally NOT
// tokenized — PDFs render in a neutral palette regardless of tenant
// theme, so icons must stay the same color in every export. See the
// theme migration spec for the PDF-neutrality decision.
import {
  HardDrive,
  Database,
  Cpu,
  Zap,
  Usb,
  CreditCard,
  Smartphone,
  Tablet,
  Layers,
  HardDriveDownload,
  Server,
  Camera,
  type LucideIcon,
} from 'lucide-react';

export interface DeviceIconMapping {
  webIcon: LucideIcon;
  pdfSymbol: string;
  pdfSvg: string;
  category: 'hdd' | 'ssd' | 'removable' | 'mobile' | 'network' | 'specialized';
}

const SVG_ICONS = {
  monitor: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="3" width="20" height="14" rx="2" fill="none" stroke="#4A5568" stroke-width="2"/>
    <line x1="8" y1="21" x2="16" y2="21" stroke="#4A5568" stroke-width="2"/>
    <line x1="12" y1="17" x2="12" y2="21" stroke="#4A5568" stroke-width="2"/>
  </svg>`,

  database: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="12" cy="5" rx="9" ry="3" fill="none" stroke="#4A5568" stroke-width="2"/>
    <path d="M 3 5 L 3 19 C 3 21 7 22 12 22 C 17 22 21 21 21 19 L 21 5" fill="none" stroke="#4A5568" stroke-width="2"/>
    <path d="M 3 12 C 3 14 7 15 12 15 C 17 15 21 14 21 12" fill="none" stroke="#4A5568" stroke-width="2"/>
  </svg>`,

  chip: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="5" width="14" height="14" rx="2" fill="none" stroke="#4A5568" stroke-width="2"/>
    <rect x="9" y="9" width="6" height="6" fill="none" stroke="#4A5568" stroke-width="2"/>
    <line x1="1" y1="9" x2="5" y2="9" stroke="#4A5568" stroke-width="2"/>
    <line x1="1" y1="15" x2="5" y2="15" stroke="#4A5568" stroke-width="2"/>
    <line x1="19" y1="9" x2="23" y2="9" stroke="#4A5568" stroke-width="2"/>
    <line x1="19" y1="15" x2="23" y2="15" stroke="#4A5568" stroke-width="2"/>
    <line x1="9" y1="1" x2="9" y2="5" stroke="#4A5568" stroke-width="2"/>
    <line x1="15" y1="1" x2="15" y2="5" stroke="#4A5568" stroke-width="2"/>
    <line x1="9" y1="19" x2="9" y2="23" stroke="#4A5568" stroke-width="2"/>
    <line x1="15" y1="19" x2="15" y2="23" stroke="#4A5568" stroke-width="2"/>
  </svg>`,

  usb: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="2" width="12" height="20" rx="2" fill="none" stroke="#4A5568" stroke-width="2"/>
    <rect x="9" y="5" width="6" height="4" fill="#4A5568"/>
    <line x1="10" y1="18" x2="14" y2="18" stroke="#4A5568" stroke-width="2"/>
  </svg>`,

  sdCard: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M 6 2 L 18 2 L 18 8 L 22 12 L 22 22 L 2 22 L 2 6 Z" fill="none" stroke="#4A5568" stroke-width="2"/>
    <line x1="8" y1="4" x2="8" y2="8" stroke="#4A5568" stroke-width="2"/>
    <line x1="12" y1="4" x2="12" y2="8" stroke="#4A5568" stroke-width="2"/>
    <line x1="16" y1="4" x2="16" y2="8" stroke="#4A5568" stroke-width="2"/>
  </svg>`,

  smartphone: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="2" width="14" height="20" rx="2" fill="none" stroke="#4A5568" stroke-width="2"/>
    <circle cx="12" cy="18" r="1" fill="#4A5568"/>
  </svg>`,

  server: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="20" height="6" rx="2" fill="none" stroke="#4A5568" stroke-width="2"/>
    <rect x="2" y="9" width="20" height="6" rx="2" fill="none" stroke="#4A5568" stroke-width="2"/>
    <rect x="2" y="16" width="20" height="6" rx="2" fill="none" stroke="#4A5568" stroke-width="2"/>
    <circle cx="6" cy="5" r="1" fill="#4A5568"/>
    <circle cx="6" cy="12" r="1" fill="#4A5568"/>
    <circle cx="6" cy="19" r="1" fill="#4A5568"/>
  </svg>`,

  camera: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="6" width="20" height="14" rx="2" fill="none" stroke="#4A5568" stroke-width="2"/>
    <path d="M 7 6 L 9 2 L 15 2 L 17 6" fill="none" stroke="#4A5568" stroke-width="2"/>
    <circle cx="12" cy="13" r="4" fill="none" stroke="#4A5568" stroke-width="2"/>
  </svg>`,

  user: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="7" r="4" fill="none" stroke="#4A5568" stroke-width="2"/>
    <path d="M 5 20 C 5 16 8 14 12 14 C 16 14 19 16 19 20" fill="none" stroke="#4A5568" stroke-width="2"/>
  </svg>`,

  fileText: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M 14 2 L 6 2 C 4.9 2 4 2.9 4 4 L 4 20 C 4 21.1 4.9 22 6 22 L 18 22 C 19.1 22 20 21.1 20 20 L 20 8 Z" fill="none" stroke="#4A5568" stroke-width="2"/>
    <path d="M 14 2 L 14 8 L 20 8" fill="none" stroke="#4A5568" stroke-width="2"/>
    <line x1="8" y1="13" x2="16" y2="13" stroke="#4A5568" stroke-width="2"/>
    <line x1="8" y1="17" x2="16" y2="17" stroke="#4A5568" stroke-width="2"/>
  </svg>`,
};

const DEVICE_ICON_MAP: Record<string, DeviceIconMapping> = {
  '2.5" hdd': {
    webIcon: HardDrive,
    pdfSymbol: '■',
    pdfSvg: SVG_ICONS.database,
    category: 'hdd',
  },
  '3.5" hdd': {
    webIcon: HardDrive,
    pdfSymbol: '■',
    pdfSvg: SVG_ICONS.database,
    category: 'hdd',
  },
  '2.5" ssd': {
    webIcon: Database,
    pdfSymbol: '▲',
    pdfSvg: SVG_ICONS.database,
    category: 'ssd',
  },
  'm.2 ssd': {
    webIcon: Cpu,
    pdfSymbol: '▲',
    pdfSvg: SVG_ICONS.chip,
    category: 'ssd',
  },
  'nvme ssd': {
    webIcon: Zap,
    pdfSymbol: '▲',
    pdfSvg: SVG_ICONS.chip,
    category: 'ssd',
  },
  'usb drive': {
    webIcon: Usb,
    pdfSymbol: '►',
    pdfSvg: SVG_ICONS.usb,
    category: 'removable',
  },
  'sd card': {
    webIcon: CreditCard,
    pdfSymbol: '▼',
    pdfSvg: SVG_ICONS.sdCard,
    category: 'removable',
  },
  'microsd card': {
    webIcon: CreditCard,
    pdfSymbol: '▼',
    pdfSvg: SVG_ICONS.sdCard,
    category: 'removable',
  },
  'cf card': {
    webIcon: CreditCard,
    pdfSymbol: '▼',
    pdfSvg: SVG_ICONS.sdCard,
    category: 'removable',
  },
  'memory stick': {
    webIcon: CreditCard,
    pdfSymbol: '►',
    pdfSvg: SVG_ICONS.usb,
    category: 'removable',
  },
  'mobile phone': {
    webIcon: Smartphone,
    pdfSymbol: '♦',
    pdfSvg: SVG_ICONS.smartphone,
    category: 'mobile',
  },
  'tablet': {
    webIcon: Tablet,
    pdfSymbol: '♦',
    pdfSvg: SVG_ICONS.smartphone,
    category: 'mobile',
  },
  'raid array': {
    webIcon: Layers,
    pdfSymbol: '●',
    pdfSvg: SVG_ICONS.server,
    category: 'network',
  },
  'nas device': {
    webIcon: HardDriveDownload,
    pdfSymbol: '●',
    pdfSvg: SVG_ICONS.server,
    category: 'network',
  },
  'server': {
    webIcon: Server,
    pdfSymbol: '●',
    pdfSvg: SVG_ICONS.server,
    category: 'network',
  },
  'dvr/camera': {
    webIcon: Camera,
    pdfSymbol: '◆',
    pdfSvg: SVG_ICONS.camera,
    category: 'specialized',
  },
  'ssd external': {
    webIcon: Database,
    pdfSymbol: '▲',
    pdfSvg: SVG_ICONS.database,
    category: 'ssd',
  },
  'hybrid drive': {
    webIcon: HardDrive,
    pdfSymbol: '■',
    pdfSvg: SVG_ICONS.database,
    category: 'hdd',
  },
};

const DEFAULT_ICON: DeviceIconMapping = {
  webIcon: HardDrive,
  pdfSymbol: '◆',
  pdfSvg: SVG_ICONS.database,
  category: 'hdd',
};

export function getDeviceIconComponent(deviceType: string | null | undefined): LucideIcon {
  if (!deviceType) return DEFAULT_ICON.webIcon;

  const normalizedType = deviceType.toLowerCase().trim();
  const mapping = DEVICE_ICON_MAP[normalizedType];

  return mapping ? mapping.webIcon : DEFAULT_ICON.webIcon;
}

export function getDeviceIconUnicode(deviceType: string | null | undefined): string {
  if (!deviceType) return DEFAULT_ICON.pdfSymbol;

  const normalizedType = deviceType.toLowerCase().trim();
  const mapping = DEVICE_ICON_MAP[normalizedType];

  return mapping ? mapping.pdfSymbol : DEFAULT_ICON.pdfSymbol;
}

export function getDeviceIconSvg(deviceType: string | null | undefined): string {
  if (!deviceType) return DEFAULT_ICON.pdfSvg;

  const normalizedType = deviceType.toLowerCase().trim();
  const mapping = DEVICE_ICON_MAP[normalizedType];

  return mapping ? mapping.pdfSvg : DEFAULT_ICON.pdfSvg;
}

export function getDeviceIconCategory(deviceType: string | null | undefined): string {
  if (!deviceType) return DEFAULT_ICON.category;

  const normalizedType = deviceType.toLowerCase().trim();
  const mapping = DEVICE_ICON_MAP[normalizedType];

  return mapping ? mapping.category : DEFAULT_ICON.category;
}

export function getAllDeviceTypes(): string[] {
  return Object.keys(DEVICE_ICON_MAP);
}

export function getGeneralIconSvg(iconName: 'user' | 'fileText'): string {
  return SVG_ICONS[iconName] || '';
}
