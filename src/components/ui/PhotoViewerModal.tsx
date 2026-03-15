import { useEffect } from 'react';
import { X } from 'lucide-react';

interface PhotoViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  altText?: string;
}

export const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  altText = 'Full size photo',
}) => {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center animate-fadeIn">
      <div
        className="fixed inset-0 bg-black bg-opacity-90 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all backdrop-blur-sm group"
        aria-label="Close photo viewer"
      >
        <X className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
      </button>

      <div
        className="relative z-10 max-w-7xl max-h-[90vh] mx-4 animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={altText}
          className="w-full h-full object-contain rounded-lg shadow-2xl"
          style={{ maxHeight: '90vh' }}
        />
      </div>

      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10">
        <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full">
          <p className="text-white text-sm font-medium">
            Press <span className="font-bold">ESC</span> or click outside to close
          </p>
        </div>
      </div>
    </div>
  );
};
