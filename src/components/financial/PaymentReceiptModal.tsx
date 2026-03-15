import React from 'react';
import { Modal } from '../ui/Modal';
import { PDFDownloadButton } from '../shared/PDFDownloadButton';
import { PaymentReceiptDocument } from '../documents/PaymentReceiptDocument';
import { useCurrency } from '../../hooks/useCurrency';
import { usePDFDownload } from '../../hooks/usePDFDownload';

interface PaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: any;
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  isOpen,
  onClose,
  payment,
}) => {
  const { currencyFormat } = useCurrency();
  const {
    companySettings,
    isLoadingSettings,
    settingsReady,
    settingsError,
    isGenerating,
    translationsReady,
    translationsError,
    isLoadingTranslations,
    downloadPDF,
    t,
  } = usePDFDownload();

  if (!payment) return null;

  const customerName = payment.customer?.customer_name || 'Customer';

  const handleDownloadPDF = async () => {
    const fileName = `Payment_Receipt_${payment.payment_number || 'Draft'}_${customerName.replace(/\s+/g, '_')}.pdf`;
    await downloadPDF({
      elementId: 'receipt-print-frame',
      filename: fileName,
    });
  };

  const downloadButton = (
    <PDFDownloadButton
      onClick={handleDownloadPDF}
      isGenerating={isGenerating}
      disabled={isLoadingSettings || isLoadingTranslations || !translationsReady || !settingsReady || translationsError || settingsError}
      tooltip={
        !translationsReady || !settingsReady
          ? 'Waiting for resources to load...'
          : translationsError || settingsError
          ? 'Cannot generate PDF due to loading errors'
          : undefined
      }
    />
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="large" headerAction={downloadButton}>
      <style>{`
        #receipt-print-frame {
          position: relative;
          width: 210mm;
          min-width: 210mm;
          max-width: 210mm;
          min-height: 297mm;
          padding: 15mm;
          margin: 0 auto;
          background: #ffffff;
          box-sizing: border-box;
          transform: none;
          transform-origin: top left;
          font-size: 13px;
          line-height: 1.4;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          -webkit-text-size-adjust: 100%;
          text-rendering: optimizeLegibility;
        }

        .receipt-printable-content {
          width: 100%;
          height: 100%;
          position: relative;
          display: flex;
          flex-direction: column;
        }

        #receipt-print-frame *,
        .receipt-printable-content * {
          box-sizing: border-box;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
        }

        @media print {
          #receipt-print-frame {
            width: 210mm;
            height: 297mm;
            padding: 15mm;
            page-break-after: avoid;
          }

          .receipt-printable-content {
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="overflow-auto" style={{ maxHeight: '80vh' }}>
        <PaymentReceiptDocument
          payment={payment}
          companySettings={companySettings}
          currencyFormat={currencyFormat}
          t={t}
          elementId="receipt-print-frame"
        />
      </div>
    </Modal>
  );
};
