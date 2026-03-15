import jsPDF from 'jspdf';
import { ChainOfCustodyEntry, formatActionType } from './chainOfCustodyService';
import { formatDateTime } from './format';

export interface ExportOptions {
  includeMetadata?: boolean;
  includeHashes?: boolean;
  includeSignatures?: boolean;
  watermark?: string;
}

export function exportChainOfCustodyToPDF(
  entries: ChainOfCustodyEntry[],
  caseNumber: string,
  options: ExportOptions = {}
): void {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  const addNewPageIfNeeded = (requiredHeight: number) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
      addHeader();
    }
  };

  const addHeader = () => {
    pdf.setFillColor(14, 116, 144);
    pdf.rect(0, 0, pageWidth, 30, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('FORENSIC CHAIN OF CUSTODY REPORT', margin, 15);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Case Number: ${caseNumber}`, margin, 22);
    pdf.text(`Generated: ${formatDateTime(new Date().toISOString())}`, pageWidth - margin - 60, 22);

    yPosition = 40;
  };

  const addFooter = (pageNum: number) => {
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(
      `Page ${pageNum} | This document is a certified Chain of Custody record`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  };

  const addLegalNotice = () => {
    pdf.setFillColor(255, 243, 205);
    pdf.rect(margin, yPosition, contentWidth, 25, 'F');

    pdf.setDrawColor(252, 211, 77);
    pdf.setLineWidth(0.5);
    pdf.rect(margin, yPosition, contentWidth, 25);

    pdf.setTextColor(120, 53, 15);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('LEGAL NOTICE', margin + 3, yPosition + 5);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    const legalText =
      'This Chain of Custody record is maintained for forensic and legal purposes. All entries are immutable ' +
      'and cryptographically secured. Unauthorized modification or tampering with evidence may result in legal consequences.';

    const lines = pdf.splitTextToSize(legalText, contentWidth - 6);
    pdf.text(lines, margin + 3, yPosition + 10);

    yPosition += 30;
  };

  const addSummary = () => {
    pdf.setFillColor(239, 246, 255);
    pdf.rect(margin, yPosition, contentWidth, 20, 'F');

    pdf.setTextColor(30, 64, 175);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Summary', margin + 3, yPosition + 6);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(51, 65, 85);
    pdf.text(`Total Entries: ${entries.length}`, margin + 3, yPosition + 12);

    const categories = [...new Set(entries.map((e) => e.action_category))];
    pdf.text(`Action Categories: ${categories.length}`, margin + 3, yPosition + 17);

    const actors = [...new Set(entries.map((e) => e.actor_name))];
    pdf.text(`Unique Actors: ${actors.length}`, margin + contentWidth / 2, yPosition + 12);

    if (entries.length > 0) {
      const firstEntry = entries[entries.length - 1];
      const lastEntry = entries[0];
      pdf.text(`First: ${formatDateTime(firstEntry.occurred_at)}`, margin + contentWidth / 2, yPosition + 17);
    }

    yPosition += 25;
  };

  const addEntry = (entry: ChainOfCustodyEntry, index: number) => {
    const entryHeight = 40 + (options.includeMetadata ? 15 : 0);
    addNewPageIfNeeded(entryHeight);

    const categoryColors: Record<string, [number, number, number]> = {
      creation: [209, 250, 229],
      modification: [219, 234, 254],
      access: [233, 213, 255],
      transfer: [254, 215, 170],
      verification: [204, 251, 241],
      communication: [224, 231, 255],
      evidence_handling: [207, 250, 254],
      financial: [209, 250, 229],
      critical_event: [254, 202, 202],
    };

    const bgColor = categoryColors[entry.action_category] || [241, 245, 249];
    pdf.setFillColor(...bgColor);
    pdf.rect(margin, yPosition, contentWidth, entryHeight - 5, 'F');

    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.3);
    pdf.rect(margin, yPosition, contentWidth, entryHeight - 5);

    pdf.setTextColor(15, 23, 42);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`#${entry.entry_number.toString().padStart(4, '0')}`, margin + 2, yPosition + 5);

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(formatActionType(entry.action_type), margin + 15, yPosition + 5);

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(51, 65, 85);
    const descriptionLines = pdf.splitTextToSize(entry.action_description, contentWidth - 20);
    pdf.text(descriptionLines, margin + 2, yPosition + 11);

    const detailsY = yPosition + 11 + descriptionLines.length * 4;

    pdf.setFontSize(7);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Actor: ${entry.actor_name}${entry.actor_role ? ` (${entry.actor_role})` : ''}`, margin + 2, detailsY + 5);
    pdf.text(`Time: ${formatDateTime(entry.occurred_at)}`, margin + 2, detailsY + 9);

    if (entry.evidence_reference) {
      pdf.text(`Evidence: ${entry.evidence_reference}`, margin + 2, detailsY + 13);
    }

    if (options.includeHashes && entry.hash_value) {
      pdf.setFontSize(6);
      pdf.setFont('courier', 'normal');
      pdf.text(
        `Hash (${entry.hash_algorithm}): ${entry.hash_value.substring(0, 60)}...`,
        margin + 2,
        detailsY + 17
      );
    }

    if (options.includeSignatures && entry.digital_signature) {
      pdf.setFontSize(7);
      pdf.setTextColor(13, 148, 136);
      pdf.text('✓ Digitally Signed', pageWidth - margin - 30, yPosition + 5);
    }

    yPosition += entryHeight;
  };

  addHeader();
  addLegalNotice();
  addSummary();

  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Chain of Custody Entries', margin, yPosition);
  yPosition += 8;

  entries.forEach((entry, index) => {
    addEntry(entry, index);
  });

  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    addFooter(i);
  }

  pdf.save(`Chain_of_Custody_${caseNumber}_${Date.now()}.pdf`);
}

export function exportToCSV(entries: ChainOfCustodyEntry[], caseNumber: string): void {
  const headers = [
    'Entry Number',
    'Case Number',
    'Category',
    'Action Type',
    'Description',
    'Actor Name',
    'Actor Role',
    'Occurred At',
    'Evidence Reference',
    'Hash Value',
    'Digital Signature',
  ];

  const rows = entries.map((entry) => [
    entry.entry_number,
    caseNumber,
    entry.action_category,
    entry.action_type,
    entry.action_description,
    entry.actor_name,
    entry.actor_role || '',
    entry.occurred_at,
    entry.evidence_reference || '',
    entry.hash_value || '',
    entry.digital_signature ? 'Yes' : 'No',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `Chain_of_Custody_${caseNumber}_${Date.now()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToJSON(entries: ChainOfCustodyEntry[], caseNumber: string): void {
  const exportData = {
    caseNumber,
    exportedAt: new Date().toISOString(),
    totalEntries: entries.length,
    entries: entries.map((entry) => ({
      entryNumber: entry.entry_number,
      actionCategory: entry.action_category,
      actionType: entry.action_type,
      actionDescription: entry.action_description,
      actorName: entry.actor_name,
      actorRole: entry.actor_role,
      occurredAt: entry.occurred_at,
      evidenceReference: entry.evidence_reference,
      hashValue: entry.hash_value,
      digitalSignature: entry.digital_signature,
      beforeValues: entry.before_values,
      afterValues: entry.after_values,
      metadata: entry.metadata,
    })),
  };

  const jsonContent = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `Chain_of_Custody_${caseNumber}_${Date.now()}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
