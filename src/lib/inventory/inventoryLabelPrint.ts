/**
 * printInventoryLabel — Inventory V2 P7.
 *
 * Resolves QR + Code128 images for an inventory item, builds the pdfmake
 * document, and opens or downloads the resulting PDF.
 *
 * pdfmake and bwip-js are both dynamically imported so this module does NOT
 * add to the main bundle when the page first loads.
 */

import type { InventoryItemWithDetails } from './inventoryLabelTypes';
export type { InventoryItemWithDetails };

/** Open (print) the inventory label PDF in a new tab. */
export async function printInventoryLabel(item: InventoryItemWithDetails): Promise<void> {
  await _generate(item, false);
}

/** Download the inventory label PDF. */
export async function downloadInventoryLabel(item: InventoryItemWithDetails): Promise<void> {
  await _generate(item, true);
}

async function _generate(
  item: InventoryItemWithDetails,
  download: boolean,
): Promise<void> {
  const value = item.barcode ?? item.item_number ?? item.name;

  const [{ initializePDFFonts, createPdfWithFonts }, { buildInventoryLabelDocument }, { generateQrPngDataUrl }, { generateCode128DataUrl }] =
    await Promise.all([
      import('../pdf/fonts'),
      import('../pdf/documents/InventoryLabelDocument'),
      import('../pdf/qrImage'),
      import('../pdf/barcodeImage'),
    ]);

  await initializePDFFonts();

  const [qrDataUrl, barcodeDataUrl] = await Promise.all([
    generateQrPngDataUrl(item.qr_value ?? item.item_number ?? value),
    generateCode128DataUrl(value),
  ]);

  const docDef = buildInventoryLabelDocument({
    itemNumber: item.item_number ?? item.name ?? 'ITEM',
    name: item.name ?? item.model ?? 'Inventory Item',
    brandName: item.brand?.name ?? null,
    deviceTypeName: item.device_type?.name ?? null,
    capacityName: item.capacity?.name ?? null,
    locationName: item.storage_location?.name ?? null,
    qrDataUrl,
    barcodeDataUrl,
  });

  const pdf = createPdfWithFonts(docDef);
  const filename = `inv-label-${item.item_number ?? item.id}.pdf`;

  if (download) {
    pdf.download(filename);
  } else {
    pdf.open();
  }
}
