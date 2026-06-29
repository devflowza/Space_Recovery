/**
 * Inventory item label document — Inventory V2 P7.
 *
 * Compact pdfmake label (approx. 100mm × 65mm) showing:
 *   - item_number (prominent, centre)
 *   - name / brand / device type / capacity / location
 *   - QR code  (left panel, from generateQrPngDataUrl)
 *   - Code128 barcode (right panel, from generateCode128DataUrl)
 *
 * Labels are print-neutral: no theming, fixed PDF_COLORS only.
 * Follows the same size/style/font conventions as StockLabelDocument.
 */

import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { PDF_COLORS, getStylesWithFont } from '../styles';

export interface InventoryLabelData {
  itemNumber: string;
  name: string;
  /** Resolved brand name, e.g. "Seagate" */
  brandName?: string | null;
  /** Resolved device type name, e.g. "HDD" */
  deviceTypeName?: string | null;
  /** Resolved capacity name, e.g. "2 TB" */
  capacityName?: string | null;
  /** Resolved storage location name, e.g. "Shelf A-3" */
  locationName?: string | null;
  /** Pre-generated QR PNG data URL (or null) */
  qrDataUrl?: string | null;
  /** Pre-generated Code128 PNG data URL (or null) */
  barcodeDataUrl?: string | null;
}

export function buildInventoryLabelDocument(
  data: InventoryLabelData,
  fontFamily = 'Roboto',
): TDocumentDefinitions {
  const {
    itemNumber,
    name,
    brandName,
    deviceTypeName,
    capacityName,
    locationName,
    qrDataUrl,
    barcodeDataUrl,
  } = data;

  // ── Header band: item number ──────────────────────────────────────────────
  const headerBand: Content = {
    stack: [
      {
        text: itemNumber,
        fontSize: 16,
        bold: true,
        color: PDF_COLORS.white,
        alignment: 'center',
        font: fontFamily,
      },
    ],
    fillColor: PDF_COLORS.primary,
    margin: [0, 0, 0, 0],
  };

  // ── Item name row ─────────────────────────────────────────────────────────
  const nameRow: Content = {
    text: name,
    fontSize: 10,
    bold: true,
    color: PDF_COLORS.text,
    margin: [0, 6, 0, 2],
    font: fontFamily,
  };

  // ── Detail fields ─────────────────────────────────────────────────────────
  const detailRows: Content[] = [];

  function addDetail(label: string, value: string | null | undefined) {
    if (!value) return;
    detailRows.push({
      columns: [
        {
          text: label,
          fontSize: 7,
          color: PDF_COLORS.textMuted,
          width: 52,
          font: fontFamily,
        },
        {
          text: value,
          fontSize: 8,
          bold: true,
          color: PDF_COLORS.text,
          width: '*',
          font: fontFamily,
        },
      ],
      margin: [0, 1, 0, 1],
    } as Content);
  }

  if (brandName) addDetail('Brand', brandName);
  if (deviceTypeName) addDetail('Type', deviceTypeName);
  if (capacityName) addDetail('Capacity', capacityName);
  if (locationName) addDetail('Location', locationName);

  // ── Divider ───────────────────────────────────────────────────────────────
  const divider: Content = {
    canvas: [
      {
        type: 'line',
        x1: 0,
        y1: 0,
        x2: 246,
        y2: 0,
        lineWidth: 0.5,
        lineColor: PDF_COLORS.border,
      },
    ],
    margin: [0, 4, 0, 4],
  };

  // ── Image row: QR (left) + barcode (right) ────────────────────────────────
  const qrNode: Content = qrDataUrl
    ? { image: qrDataUrl, width: 52, height: 52, alignment: 'center' }
    : {
        canvas: [
          {
            type: 'rect',
            x: 0,
            y: 0,
            w: 52,
            h: 52,
            lineColor: PDF_COLORS.border,
            lineWidth: 0.5,
          },
        ],
      };

  const barcodeNode: Content = barcodeDataUrl
    ? { image: barcodeDataUrl, width: 160, height: 40, alignment: 'center', margin: [0, 6, 0, 0] }
    : { text: itemNumber, fontSize: 8, font: 'Roboto', alignment: 'center', margin: [0, 16, 0, 0] };

  const imageRow: Content = {
    columns: [
      {
        stack: [
          qrNode,
          {
            text: 'Scan',
            fontSize: 6,
            color: PDF_COLORS.textMuted,
            alignment: 'center',
            margin: [0, 2, 0, 0],
            font: fontFamily,
          },
        ],
        width: 58,
      },
      {
        stack: [barcodeNode],
        width: '*',
        margin: [4, 0, 0, 0],
      },
    ],
  };

  // ── Content assembly ──────────────────────────────────────────────────────
  const allContent: Content[] = [
    headerBand,
    nameRow,
    ...(detailRows.length > 0 ? detailRows : []),
    divider,
    imageRow,
  ];

  return {
    // 100mm × 65mm in pts (1mm ≈ 2.835 pts)
    pageSize: { width: 283, height: 184 },
    pageMargins: [10, 10, 10, 10],
    defaultStyle: {
      font: fontFamily,
      fontSize: 8,
    },
    styles: getStylesWithFont(fontFamily),
    content: allContent,
  };
}
