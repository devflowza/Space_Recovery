import React, { useState, useEffect } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabaseClient';
import { useToast } from '../../hooks/useToast';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplierId: string;
}

export default function DocumentUploadModal({ isOpen, onClose, onSuccess, supplierId }: DocumentUploadModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    document_type: 'contract',
    description: '',
  });

  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setFormData({
        document_type: 'contract',
        description: '',
      });
    }
  }, [isOpen]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showToast('File size must be less than 10MB', 'error');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      showToast('Please select a file to upload', 'error');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${supplierId}/${Date.now()}_${selectedFile.name}`;
      const filePath = `supplier-documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('supplier_documents')
        .insert([{
          supplier_id: supplierId,
          document_type: formData.document_type,
          file_name: selectedFile.name,
          file_path: filePath,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          description: formData.description || null,
          uploaded_by: user.id,
          uploaded_at: new Date().toISOString(),
        }]);

      if (dbError) throw dbError;

      showToast('Document uploaded successfully', 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      showToast(error.message || 'Failed to upload document', 'error');
    } finally {
      setLoading(false);
    }
  };

  const documentTypes = [
    { value: 'contract', label: 'Contract' },
    { value: 'invoice', label: 'Invoice' },
    { value: 'quote', label: 'Quote' },
    { value: 'certification', label: 'Certification' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'compliance', label: 'Compliance Document' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Document">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Document Type *
          </label>
          <select
            value={formData.document_type}
            onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            {documentTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <Input
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of the document"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select File * (Max 10MB)
          </label>

          {!selectedFile ? (
            <label className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 hover:border-gray-400">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-10 h-10 mb-3 text-gray-400" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">PDF, DOC, DOCX, XLS, XLSX, or images</p>
              </div>
              <input
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              />
            </label>
          ) : (
            <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="text-red-600 hover:text-red-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !selectedFile}>
            {loading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
