import jsPDF from 'jspdf';
import { format } from 'date-fns';

// Category color configuration matching the report sections
export const SECTION_COLORS = {
  general: '#3b82f6',
  diagnostic: '#ef4444',
  solution: '#10b981',
  timeline: '#f59e0b',
  technical: '#6366f1',
  financial: '#a855f7',
  compliance: '#8b5cf6',
  risk: '#dc2626',
};

/**
 * Add professional bilingual header to PDF
 */
export function addBilingualHeader(
  doc: jsPDF,
  titleEn: string,
  titleAr: string,
  companyName?: string,
  logoUrl?: string
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 20;

  // Add logo if available
  if (logoUrl) {
    // Logo would be loaded async, skip for now or use placeholder
    // doc.addImage(logoUrl, 'PNG', 15, 10, 30, 30);
    currentY = 20;
  }

  // English Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#1e293b');
  doc.text(titleEn, pageWidth / 2, currentY, { align: 'center' });
  currentY += 10;

  // Arabic Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#64748b');
  doc.text(titleAr, pageWidth / 2, currentY, { align: 'center' });
  currentY += 12;

  // Company name if provided
  if (companyName) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#64748b');
    doc.text(companyName, pageWidth / 2, currentY, { align: 'center' });
    currentY += 8;
  }

  // Horizontal separator line
  doc.setDrawColor('#e2e8f0');
  doc.setLineWidth(0.5);
  doc.line(15, currentY, pageWidth - 15, currentY);
  currentY += 10;

  return currentY;
}

/**
 * Add information boxes (General Details, Case Details, Device Details)
 */
export function addInformationBoxes(
  doc: jsPDF,
  startY: number,
  generalDetails: Record<string, string>,
  caseDetails: Record<string, string>,
  deviceDetails?: Record<string, string>
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = startY;

  // Two-column layout for General and Case Details
  const boxWidth = (pageWidth - 40) / 2;
  const boxHeight = 45;

  // General Details Box (Left)
  addInfoBox(doc, 15, currentY, boxWidth, boxHeight, 'General Details', generalDetails, '#eff6ff');

  // Case Details Box (Right)
  addInfoBox(doc, 15 + boxWidth + 10, currentY, boxWidth, boxHeight, 'Case Details', caseDetails, '#f0fdf4');

  currentY += boxHeight + 10;

  // Device Details Box (Full Width) if provided
  if (deviceDetails && Object.keys(deviceDetails).length > 0) {
    const deviceBoxHeight = Math.max(35, Object.keys(deviceDetails).length * 5 + 15);
    addInfoBox(doc, 15, currentY, pageWidth - 30, deviceBoxHeight, 'Device Details', deviceDetails, '#fef2f2');
    currentY += deviceBoxHeight + 10;
  }

  return currentY;
}

/**
 * Helper to add a single info box
 */
function addInfoBox(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
  details: Record<string, string>,
  bgColor: string
) {
  // Convert hex to RGB
  const rgb = hexToRgb(bgColor);

  // Background
  doc.setFillColor(rgb.r, rgb.g, rgb.b);
  doc.roundedRect(x, y, width, height, 2, 2, 'F');

  // Border
  doc.setDrawColor('#cbd5e1');
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y, width, height, 2, 2, 'S');

  // Title
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#1e293b');
  doc.text(title, x + 5, y + 8);

  // Details
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor('#475569');

  let detailY = y + 15;
  const lineHeight = 5;

  for (const [label, value] of Object.entries(details)) {
    if (detailY + lineHeight > y + height - 3) break; // Prevent overflow

    doc.setFont('helvetica', 'bold');
    doc.text(`${label}`, x + 5, detailY);

    doc.setFont('helvetica', 'normal');
    const valueText = value || 'N/A';
    const truncated = doc.splitTextToSize(valueText, width - 35);
    doc.text(truncated[0], x + 35, detailY);

    detailY += lineHeight;
  }
}

/**
 * Add color-coded section with content
 */
export function addColorCodedSection(
  doc: jsPDF,
  startY: number,
  sectionTitle: string,
  sectionTitleAr: string | undefined,
  content: string,
  category: string,
  maxY: number = 270
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const color = SECTION_COLORS[category as keyof typeof SECTION_COLORS] || '#3b82f6';
  const rgb = hexToRgb(color);
  let currentY = startY;

  // Check if we need a new page
  if (currentY > maxY - 30) {
    doc.addPage();
    currentY = 20;
  }

  // Section header background
  doc.setFillColor(rgb.r, rgb.g, rgb.b);
  doc.roundedRect(15, currentY, pageWidth - 30, 10, 1, 1, 'F');

  // Section title in English
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#ffffff');
  doc.text(sectionTitle, 18, currentY + 7);

  currentY += 12;

  // Arabic title if provided
  if (sectionTitleAr) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#64748b');
    doc.text(sectionTitleAr, pageWidth - 18, currentY, { align: 'right' });
    currentY += 6;
  }

  // Content box with left border
  const contentStartY = currentY;
  doc.setDrawColor(rgb.r, rgb.g, rgb.b);
  doc.setLineWidth(3);
  doc.line(15, contentStartY, 15, contentStartY + 2); // Initial line, will extend

  // Content
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor('#1e293b');

  // Clean HTML tags if present
  const cleanContent = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');

  // Split text to fit width
  const lines = doc.splitTextToSize(cleanContent, pageWidth - 50);
  const lineHeight = 5;

  for (let i = 0; i < lines.length; i++) {
    if (currentY + lineHeight > maxY) {
      // Extend left border before page break
      doc.setLineWidth(3);
      doc.line(15, contentStartY, 15, currentY);

      doc.addPage();
      currentY = 20;

      // Continue left border on new page
      const newContentStartY = currentY;
      doc.line(15, newContentStartY, 15, newContentStartY + 2);
    }

    doc.text(lines[i], 22, currentY);
    currentY += lineHeight;
  }

  // Complete left border
  doc.setLineWidth(3);
  doc.line(15, contentStartY, 15, currentY - lineHeight + 3);

  currentY += 8;

  return currentY;
}

/**
 * Add professional footer to each page
 */
export function addFooter(
  doc: jsPDF,
  disclaimer: string,
  reportId: string,
  companyName?: string
) {
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    const footerY = pageHeight - 20;

    // Separator line
    doc.setDrawColor('#e2e8f0');
    doc.setLineWidth(0.5);
    doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);

    // Disclaimer (first page only)
    if (i === 1 && disclaimer) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor('#64748b');
      const disclaimerLines = doc.splitTextToSize(disclaimer, pageWidth - 30);
      doc.text(disclaimerLines[0], 15, footerY);
    }

    // Report ID and timestamp
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#94a3b8');
    doc.text(`Report ID: ${reportId} | Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 15, footerY + 5);

    // Company copyright
    if (companyName) {
      doc.text(`© ${new Date().getFullYear()} ${companyName}`, pageWidth / 2, footerY + 5, { align: 'center' });
    }

    // Page number
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 15, footerY + 5, { align: 'right' });
  }
}

/**
 * Helper to convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

/**
 * Get section category from section key
 */
export function getSectionCategory(sectionKey: string): string {
  const categoryMap: Record<string, string> = {
    general_details: 'general',
    case_details: 'general',
    device_details: 'technical',
    diagnostic_findings: 'diagnostic',
    failure_analysis: 'diagnostic',
    data_assessment: 'diagnostic',
    proposed_solution: 'solution',
    recovery_strategy: 'solution',
    technical_procedures: 'technical',
    estimated_recovery_time: 'timeline',
    recovery_probability: 'diagnostic',
    cost_estimate: 'financial',
    risk_assessment: 'risk',
    important_notes: 'general',
    recommendations: 'solution',
    work_performed: 'technical',
    parts_materials: 'technical',
    lab_environment: 'technical',
    chain_of_custody: 'compliance',
    legal_compliance: 'compliance',
    examiner_certification: 'compliance',
  };

  return categoryMap[sectionKey] || 'general';
}
