import React, { useState, useEffect } from 'react';
import { MessageSquare, Mail, Phone, Video, Calendar } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabaseClient';
import { useToast } from '../../hooks/useToast';
import { logger } from '../../lib/logger';

interface CommunicationData {
  id?: string;
  type?: string;
  subject?: string;
  notes?: string;
  communication_date?: string;
  follow_up_required?: boolean;
  follow_up_date?: string;
}

interface CommunicationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplierId: string;
  communication?: CommunicationData | null;
}

export default function CommunicationFormModal({ isOpen, onClose, onSuccess, supplierId, communication }: CommunicationFormModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'email',
    subject: '',
    notes: '',
    communication_date: new Date().toISOString().split('T')[0],
    follow_up_required: false,
    follow_up_date: '',
  });

  useEffect(() => {
    if (isOpen && communication) {
      setFormData({
        type: communication.type || 'email',
        subject: communication.subject || '',
        notes: communication.notes || '',
        communication_date: communication.communication_date?.split('T')[0] || new Date().toISOString().split('T')[0],
        follow_up_required: communication.follow_up_required || false,
        follow_up_date: communication.follow_up_date?.split('T')[0] || '',
      });
    } else if (isOpen) {
      setFormData({
        type: 'email',
        subject: '',
        notes: '',
        communication_date: new Date().toISOString().split('T')[0],
        follow_up_required: false,
        follow_up_date: '',
      });
    }
  }, [isOpen, communication]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const commData = {
        ...formData,
        supplier_id: supplierId,
        created_by: user.id,
        follow_up_date: formData.follow_up_required && formData.follow_up_date ? formData.follow_up_date : null,
      };

      if (communication) {
        const { error } = await supabase
          .from('supplier_communications')
          .update(commData)
          .eq('id', communication.id);

        if (error) throw error;
        showToast('Communication updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('supplier_communications')
          .insert([commData]);

        if (error) throw error;
        showToast('Communication logged successfully', 'success');
      }

      onSuccess();
      onClose();
    } catch (error: unknown) {
      logger.error('Error saving communication:', error);
      showToast(error instanceof Error ? error.message : 'Failed to save communication', 'error');
    } finally {
      setLoading(false);
    }
  };

  const communicationTypes = [
    { value: 'email', label: 'Email', icon: Mail },
    { value: 'phone', label: 'Phone Call', icon: Phone },
    { value: 'meeting', label: 'Meeting', icon: Video },
    { value: 'other', label: 'Other', icon: MessageSquare },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={communication ? 'Edit Communication' : 'Log Communication'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Communication Type *
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {communicationTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: type.value })}
                  className={`
                    flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all
                    ${formData.type === type.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subject / Topic *
          </label>
          <Input
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            required
            placeholder="Brief description of the communication"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Calendar className="inline w-4 h-4 mr-1" />
            Communication Date *
          </label>
          <Input
            type="date"
            value={formData.communication_date}
            onChange={(e) => setFormData({ ...formData, communication_date: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes / Details *
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
            required
            placeholder="Detailed notes about the communication..."
          />
        </div>

        <div className="border-t pt-4">
          <label className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              checked={formData.follow_up_required}
              onChange={(e) => setFormData({ ...formData, follow_up_required: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Follow-up required</span>
          </label>

          {formData.follow_up_required && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Follow-up Date
              </label>
              <Input
                type="date"
                value={formData.follow_up_date}
                onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : communication ? 'Update Communication' : 'Log Communication'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
