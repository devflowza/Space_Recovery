import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '../ui/Button';

interface PDFDownloadButtonProps {
  onClick: () => void;
  isGenerating: boolean;
  disabled?: boolean;
  tooltip?: string;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PDFDownloadButton: React.FC<PDFDownloadButtonProps> = ({
  onClick,
  isGenerating,
  disabled = false,
  tooltip,
  variant = 'primary',
  size = 'md',
  className = '',
}) => {
  const isDisabled = disabled || isGenerating;

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      style={variant === 'primary' ? { backgroundColor: isGenerating ? '#64748b' : '#10b981', color: 'white' } : undefined}
      variant={variant === 'secondary' ? 'secondary' : undefined}
      className={`${size === 'sm' ? 'text-sm' : ''} ${className}`}
      title={tooltip || (isGenerating ? 'Generating PDF...' : 'Download PDF')}
    >
      {isGenerating ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Generating...
        </>
      ) : (
        <>
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </>
      )}
    </Button>
  );
};
