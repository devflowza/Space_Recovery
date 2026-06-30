// src/lib/inventory/donorParts.ts
//
// Device-family donor-part vocabulary.
// Keys are stable snake_case identifiers — they become `part_type` in
// the inventory_donor_parts table.  Labels are human-readable UI text.
//
// Inventory V2 P4.

import type { DeviceFamily } from '../devices/deviceFamily';

export interface DonorPartDef {
  key: string;
  label: string;
}

export const DONOR_PARTS: Record<DeviceFamily, DonorPartDef[]> = {
  // Lab-used donor parts only (per owner): the other HDD parts (platters, motor,
  // covers, magnets, voice coil) are never harvested as inventory in practice.
  hdd: [
    { key: 'heads',     label: 'R/W Heads' },
    { key: 'pcb',       label: 'PCB' },
    { key: 'enclosure', label: 'Enclosure' },
  ],
  // Lab-used SSD donor parts only (per owner): controller chip + power IC.
  ssd: [
    { key: 'controller', label: 'Controller Chip' },
    { key: 'power_ic',   label: 'Power IC' },
  ],
  nvme: [
    { key: 'controller', label: 'Controller Chip' },
    { key: 'nand',       label: 'NAND Flash' },
    { key: 'dram',       label: 'DRAM Cache' },
    { key: 'pcb',        label: 'PCB' },
    { key: 'power_ic',   label: 'Power IC' },
  ],
  usb_flash: [
    { key: 'controller', label: 'Controller' },
    { key: 'nand',       label: 'NAND Flash' },
    { key: 'pcb',        label: 'PCB' },
  ],
  memory_card: [
    { key: 'controller', label: 'Controller' },
    { key: 'nand',       label: 'NAND Flash' },
    { key: 'pcb',        label: 'PCB' },
  ],
  mobile: [
    { key: 'pcb',          label: 'Logic Board (PCB)' },
    { key: 'storage_chip', label: 'Storage Chip (eMMC/UFS)' },
    { key: 'battery',      label: 'Battery' },
    { key: 'display',      label: 'Display Assembly' },
  ],
  raid: [
    { key: 'drive_caddy',  label: 'Drive Caddy' },
    { key: 'controller',   label: 'RAID Controller' },
    { key: 'psu',          label: 'Power Supply (PSU)' },
    { key: 'fan',          label: 'Cooling Fan' },
    { key: 'backplane',    label: 'Backplane' },
  ],
  nas: [
    { key: 'drive_caddy',  label: 'Drive Caddy' },
    { key: 'controller',   label: 'Controller Board' },
    { key: 'psu',          label: 'Power Supply (PSU)' },
    { key: 'fan',          label: 'Cooling Fan' },
    { key: 'backplane',    label: 'Backplane' },
  ],
  pcb: [
    { key: 'rom_chip',    label: 'ROM Chip' },
    { key: 'controller',  label: 'Controller IC' },
  ],
  head_stack: [
    { key: 'heads',  label: 'Read/Write Heads' },
    { key: 'preamp', label: 'Preamp (Preamplifier)' },
  ],
  other: [],
};

/**
 * Returns the donor-part definitions for a given device family.
 * Always returns an array (empty for `other` or unknown families).
 */
export function getDonorParts(family: DeviceFamily): DonorPartDef[] {
  return DONOR_PARTS[family] ?? [];
}
