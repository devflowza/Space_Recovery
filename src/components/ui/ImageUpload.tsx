import { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { ImageCropModal } from './ImageCropModal';
import { logger } from '../../lib/logger';

interface ImageUploadProps {
  value?: string;
  onChange: (file: File | null, previewUrl: string | null) => void;
  onUploadComplete?: (url: string, filePath: string) => void;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  label?: string;
  description?: string;
  aspectRatio?: string;
  recommendedDimensions?: string;
  bucketName?: 'company-assets' | 'company-qrcodes';
  className?: string;
  enableCrop?: boolean;
  cropAspectRatio?: number;
  cropShape?: 'rect' | 'round';
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  onUploadComplete,
  maxSizeMB = 5,
  acceptedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'],
  label,
  description,
  aspectRatio,
  recommendedDimensions,
  bucketName = 'company-assets',
  className = '',
  enableCrop = false,
  cropAspectRatio = 1,
  cropShape = 'round',
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [fileMetadata, setFileMetadata] = useState<{
    name: string;
    size: number;
    dimensions?: { width: number; height: number };
  } | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
  const [originalFileName, setOriginalFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): { valid: boolean; error?: string } => {
      if (!acceptedTypes.includes(file.type)) {
        return {
          valid: false,
          error: `Invalid file type. Accepted: ${acceptedTypes.join(', ')}`,
        };
      }

      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        return {
          valid: false,
          error: `File too large. Maximum size: ${maxSizeMB}MB`,
        };
      }

      return { valid: true };
    },
    [acceptedTypes, maxSizeMB]
  );

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({ width: img.width, height: img.height });
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image'));
      };

      img.src = objectUrl;
    });
  };

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setUploadSuccess(false);

      const validation = validateFile(file);
      if (!validation.valid) {
        setError(validation.error || 'Invalid file');
        return;
      }

      try {
        const url = URL.createObjectURL(file);
        setOriginalFileName(file.name);

        if (enableCrop) {
          setTempImageUrl(url);
          setIsCropModalOpen(true);
        } else {
          const dimensions = await getImageDimensions(file);
          setPreviewUrl(url);
          setFileMetadata({
            name: file.name,
            size: file.size,
            dimensions,
          });
          onChange(file, url);
        }
      } catch (err) {
        setError('Failed to process image');
        logger.error('Image processing error:', err);
      }
    },
    [validateFile, onChange, enableCrop]
  );

  const handleCropComplete = useCallback(
    async (croppedBlob: Blob, croppedUrl: string) => {
      try {
        const croppedFile = new File([croppedBlob], originalFileName, {
          type: 'image/jpeg',
        });

        const dimensions = await getImageDimensions(croppedFile);
        setPreviewUrl(croppedUrl);
        setFileMetadata({
          name: croppedFile.name,
          size: croppedFile.size,
          dimensions,
        });

        onChange(croppedFile, croppedUrl);

        if (tempImageUrl) {
          URL.revokeObjectURL(tempImageUrl);
          setTempImageUrl(null);
        }
      } catch (err) {
        setError('Failed to process cropped image');
        logger.error('Crop processing error:', err);
      }
    },
    [onChange, originalFileName, tempImageUrl]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleRemove = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setPreviewUrl(null);
    setFileMetadata(null);
    setError(null);
    setUploadSuccess(false);
    onChange(null, null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <>
      <div className={`space-y-3 ${className}`}>
        {label && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">{label}</label>
            {description && <p className="text-xs text-slate-500">{description}</p>}
          </div>
        )}

      {previewUrl ? (
        <div className="space-y-3">
          <div className="relative group rounded-xl border-2 border-slate-200 overflow-hidden bg-slate-50">
            <img
              src={previewUrl}
              alt="Preview"
              className={`w-full object-contain p-4 ${className.includes('compact-upload') ? 'h-32' : 'h-48'}`}
              style={aspectRatio ? { aspectRatio } : undefined}
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRemove(e);
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
                size="sm"
              >
                <X className="w-4 h-4 mr-2" />
                Remove
              </Button>
            </div>
            {uploadSuccess && (
              <div className="absolute top-3 right-3 bg-green-600 text-white rounded-full p-2 shadow-lg">
                <Check className="w-4 h-4" />
              </div>
            )}
          </div>

          {fileMetadata && (
            <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">File:</span>
                <span className="text-slate-900 truncate ml-2 max-w-[200px]">
                  {fileMetadata.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Size:</span>
                <span className="text-slate-900">{formatFileSize(fileMetadata.size)}</span>
              </div>
              {fileMetadata.dimensions && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Dimensions:</span>
                  <span className="text-slate-900">
                    {fileMetadata.dimensions.width} × {fileMetadata.dimensions.height}px
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div
          className={`relative border-2 border-dashed rounded-xl transition-all ${
            className.includes('compact-upload') ? 'p-4' : 'p-8'
          } ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes.join(',')}
            onChange={handleFileInput}
            className="hidden"
          />

          <div className={`text-center ${className.includes('compact-upload') ? 'space-y-2' : 'space-y-3'}`}>
            <div className="flex justify-center">
              <div className={`rounded-full bg-slate-200 flex items-center justify-center ${
                className.includes('compact-upload') ? 'w-10 h-10' : 'w-14 h-14'
              }`}>
                {uploading ? (
                  <Loader2 className={`text-slate-600 animate-spin ${
                    className.includes('compact-upload') ? 'w-5 h-5' : 'w-7 h-7'
                  }`} />
                ) : (
                  <ImageIcon className={`text-slate-600 ${
                    className.includes('compact-upload') ? 'w-5 h-5' : 'w-7 h-7'
                  }`} />
                )}
              </div>
            </div>

            <div>
              <p className={`font-medium text-slate-900 mb-1 ${
                className.includes('compact-upload') ? 'text-xs' : 'text-sm'
              }`}>
                Drag and drop your image here, or
              </p>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <Upload className="w-4 h-4 mr-2" />
                Browse Files
              </Button>
            </div>

            <div className="text-xs text-slate-500 space-y-1">
              <p>Accepted: {acceptedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')}</p>
              <p>Maximum size: {maxSizeMB}MB</p>
              {recommendedDimensions && <p>Recommended: {recommendedDimensions}</p>}
            </div>
          </div>
        </div>
      )}

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
      </div>

      {tempImageUrl && (
        <ImageCropModal
          isOpen={isCropModalOpen}
          onClose={() => {
            setIsCropModalOpen(false);
            if (tempImageUrl) {
              URL.revokeObjectURL(tempImageUrl);
              setTempImageUrl(null);
            }
          }}
          imageUrl={tempImageUrl}
          onCropComplete={handleCropComplete}
          aspectRatio={cropAspectRatio}
          cropShape={cropShape}
        />
      )}
    </>
  );
};
