import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Briefcase } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabaseClient';
import { useToast } from '../../hooks/useToast';

interface ContactFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplierId: string;
  contact?: Record<string, unknown> | null;
}

export default function ContactFormModal({ isOpen, onClose, onSuccess, supplierId, contact }: ContactFormModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    email: '',
    phone: '',
    mobile: '',
    notes: '',
    is_primary: false,
  });

  useEffect(() => {
    if (isOpen && contact) {
      setFormData({
        name: contact.name || '',
        position: contact.position || '',
        email: contact.email || '',
        phone: contact.phone || '',
        mobile: contact.mobile || '',
        notes: contact.notes || '',
        is_primary: contact.is_primary || false,
      });
    } else if (isOpen) {
      setFormData({
        name: '',
        position: '',
        email: '',
        phone: '',
        mobile: '',
        notes: '',
        is_primary: false,
      });
    }
  }, [isOpen, contact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const contactData = {
        ...formData,
        supplier_id: supplierId,
        updated_at: new Date().toISOString(),
      };

      if (contact) {
        const { error } = await supabase
          .from('supplier_contacts')
          .update(contactData)
          .eq('id', contact.id);

        if (error) throw error;
        showToast('Contact updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('supplier_contacts')
          .insert([{ ...contactData, created_at: new Date().toISOString() }]);

        if (error) throw error;
        showToast('Contact added successfully', 'success');
      }

      onSuccess();
      onClose();
    } catch (error: unknown) {
      console.error('Error saving contact:', error);
      showToast(error instanceof Error ? error.message : 'Failed to save contact', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={contact ? 'Edit Contact' : 'Add New Contact'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <User className="inline w-4 h-4 mr-1" />
            Full Name *
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="John Doe"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Briefcase className="inline w-4 h-4 mr-1" />
            Position / Title
          </label>
          <Input
            value={formData.position}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            placeholder="Sales Manager"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Mail className="inline w-4 h-4 mr-1" />
              Email *
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Phone className="inline w-4 h-4 mr-1" />
              Phone
            </label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1234567890"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mobile
          </label>
          <Input
            value={formData.mobile}
            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
            placeholder="+1234567890"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            placeholder="Additional notes about this contact..."
          />
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_primary}
              onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Set as primary contact</span>
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : contact ? 'Update Contact' : 'Add Contact'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
