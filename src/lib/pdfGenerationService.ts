import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { checkRateLimit, RATE_LIMITS } from './rateLimiter';

const PDF_GENERATION_TIMEOUT = 30000;
const IMAGE_LOAD_TIMEOUT = 10000;
const MAX_IMAGE_RETRIES = 3;
const IMAGE_RETRY_DELAY = 3000;

// A4 dimensions
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

export interface PDFGenerationOptions {
  elementId: string;
  filename: string;
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'letter';
  onClone?: (clonedDoc: Document) => void;
}

export interface PDFGenerationResult {
  success: boolean;
  error?: string;
}

async function loadImageWithRetry(url: string, retryCount = 0): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timeout = setTimeout(() => {
      img.src = '';
      resolve(false);
    }, IMAGE_LOAD_TIMEOUT);

    img.onload = () => {
      clearTimeout(timeout);
      resolve(true);
    };

    img.onerror = async () => {
      clearTimeout(timeout);
      if (retryCount < MAX_IMAGE_RETRIES) {
        await new Promise(r => setTimeout(r, IMAGE_RETRY_DELAY));
        const result = await loadImageWithRetry(url, retryCount + 1);
        resolve(result);
      } else {
        resolve(false);
      }
    };

    img.src = url;
  });
}

export async function generatePDF(options: PDFGenerationOptions): Promise<PDFGenerationResult> {
  const rl = checkRateLimit(RATE_LIMITS.PDF_GENERATION);
  if (!rl.allowed) {
    return { success: false, error: rl.message };
  }

  const pdfGenerationStartTime = Date.now();

  const checkTimeout = () => {
    const elapsed = Date.now() - pdfGenerationStartTime;
    if (elapsed > PDF_GENERATION_TIMEOUT) {
      throw new Error('PDF generation timeout after 30 seconds. Please try again.');
    }
  };

  try {
    const element = document.getElementById(options.elementId) as HTMLElement;
    if (!element) {
      throw new Error('Unable to find printable content');
    }

    checkTimeout();

    const images = element.querySelectorAll('img');
    const imageLoadPromises = Array.from(images).map(async (img) => {
      checkTimeout();
      if (img.complete && img.naturalHeight !== 0) return true;
      return loadImageWithRetry(img.src);
    });

    const imageResults = await Promise.all(imageLoadPromises);
    const allImagesLoaded = imageResults.every(result => result);

    checkTimeout();

    if (!allImagesLoaded) {
      throw new Error('Failed to load all images. Please check your internet connection and try again.');
    }

    checkTimeout();

    // Use a consistent high-quality scale for rendering
    const scale = 2;

    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: scale,
      width: element.offsetWidth,
      height: element.offsetHeight,
      useCORS: true,
      allowTaint: false,
      scrollX: 0,
      scrollY: 0,
      logging: false,
      imageTimeout: 15000,
      removeContainer: true,
      letterRendering: true,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById(options.elementId) as HTMLElement;
        if (clonedElement) {
          // Set exact A4 dimensions with optimized minimal margins
          // Top: 8mm (minimal), Right: 10mm (minimal), Bottom: 12mm (QR code space), Left: 10mm (minimal)
          clonedElement.style.width = '210mm';
          clonedElement.style.height = '297mm';
          clonedElement.style.maxHeight = '297mm';
          clonedElement.style.paddingTop = '8mm';
          clonedElement.style.paddingRight = '10mm';
          clonedElement.style.paddingBottom = '12mm';
          clonedElement.style.paddingLeft = '10mm';
          clonedElement.style.boxSizing = 'border-box';
          clonedElement.style.overflow = 'hidden';
          clonedElement.style.transform = 'none';
          clonedElement.style.transformOrigin = 'top left';
        }

        clonedDoc.documentElement.style.webkitFontSmoothing = 'antialiased';
        clonedDoc.documentElement.style.textRendering = 'optimizeLegibility';

        const allElements = clonedDoc.querySelectorAll('*');
        allElements.forEach((el: any) => {
          el.style.boxSizing = 'border-box';
        });

        const sectionTitles = clonedDoc.querySelectorAll('.section-title');
        sectionTitles.forEach((title: any) => {
          title.style.display = 'flex';
          title.style.alignItems = 'center';
          title.style.height = '16px';
          title.style.lineHeight = '1';
          title.style.margin = '0';
          title.style.padding = '0';
          title.style.marginBottom = '8px';
          title.style.gap = '4px';

          const svg = title.querySelector('svg');
          if (svg) {
            svg.style.width = '12px';
            svg.style.height = '12px';
            svg.style.margin = '0';
            svg.style.padding = '0';
            svg.style.flexShrink = '0';
            svg.style.verticalAlign = 'middle';
          }

          const h3 = title.querySelector('h3');
          if (h3) {
            h3.style.lineHeight = '1';
            h3.style.height = '12px';
            h3.style.margin = '0';
            h3.style.padding = '0';
            h3.style.transform = 'none';
            h3.style.display = 'flex';
            h3.style.alignItems = 'center';
            h3.style.verticalAlign = 'middle';
          }
        });

        const tableHeaders = clonedDoc.querySelectorAll('.quote-table thead th, .invoice-table thead th');
        tableHeaders.forEach((th: any) => {
          th.style.height = 'auto';
          th.style.minHeight = '32px';
          th.style.padding = '8px';
          th.style.margin = '0';
          th.style.verticalAlign = 'middle';
          th.style.textAlign = 'center';
          th.style.boxSizing = 'border-box';
          th.style.background = '#f1f5f9';
          th.style.color = '#0f172a';
          th.style.fontWeight = '700';
          th.style.fontSize = '13px';
        });

        const totalBandInner = clonedDoc.querySelector('.total-row-band-inner') as HTMLElement;
        if (totalBandInner) {
          totalBandInner.style.display = 'flex';
          totalBandInner.style.alignItems = 'center';
          totalBandInner.style.justifyContent = 'space-between';
          totalBandInner.style.padding = '8px 12px';
          totalBandInner.style.margin = '0';
          totalBandInner.style.boxSizing = 'border-box';

          const totalLabel = totalBandInner.querySelector('.total-label') as HTMLElement;
          if (totalLabel) {
            totalLabel.style.display = 'flex';
            totalLabel.style.alignItems = 'center';
            totalLabel.style.justifyContent = 'flex-start';
            totalLabel.style.lineHeight = '1';
            totalLabel.style.fontSize = '14px';
            totalLabel.style.fontWeight = '600';
            totalLabel.style.margin = '0';
            totalLabel.style.padding = '0';
            totalLabel.style.boxSizing = 'border-box';
          }

          const totalAmount = totalBandInner.querySelector('.total-amount') as HTMLElement;
          if (totalAmount) {
            totalAmount.style.display = 'flex';
            totalAmount.style.alignItems = 'center';
            totalAmount.style.justifyContent = 'flex-end';
            totalAmount.style.lineHeight = '1';
            totalAmount.style.fontSize = '16px';
            totalAmount.style.fontWeight = '800';
            totalAmount.style.letterSpacing = '0.025em';
            totalAmount.style.margin = '0';
            totalAmount.style.padding = '0';
            totalAmount.style.boxSizing = 'border-box';
          }
        }

        const termsContentElements = clonedDoc.querySelectorAll('.terms-content');
        termsContentElements.forEach((el: any) => {
          el.style.whiteSpace = 'pre-wrap';
          el.style.wordWrap = 'break-word';
          el.style.overflowWrap = 'break-word';
          el.style.lineHeight = '1.5';
        });

        if (options.onClone) {
          options.onClone(clonedDoc);
        }
      }
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    const pdf = new jsPDF({
      orientation: options.orientation || 'portrait',
      unit: 'mm',
      format: options.format || 'a4',
      compress: true,
      precision: 16
    });

    // Add the image to fill the entire A4 page
    pdf.addImage(imgData, 'PNG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, undefined, 'FAST');
    pdf.save(options.filename);

    return { success: true };
  } catch (error) {
    console.error('Error generating PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate PDF. Please try again.';
    return { success: false, error: errorMessage };
  }
}
