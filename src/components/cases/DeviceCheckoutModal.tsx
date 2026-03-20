import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Package, User, Phone, CreditCard, Printer } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { logger } from '../../lib/logger';

interface Device {
  id: string;
  device_type: { name: string } | null;
  brand: { name: string } | null;
  model: string | null;
  serial_no: string | null;
}

interface DeviceCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  caseNumber: string;
  devices: Device[];
  customerName: string;
  customerMobileNumber?: string;
  onCheckoutComplete: () => void;
  onShowCheckoutPreview?: () => void;
}

export const DeviceCheckoutModal: React.FC<DeviceCheckoutModalProps> = ({
  isOpen,
  onClose,
  caseId,
  caseNumber,
  devices,
  customerName,
  customerMobileNumber,
  onCheckoutComplete,
  onShowCheckoutPreview,
}) => {
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [collectorName, setCollectorName] = useState(customerName);
  const [collectorMobile, setCollectorMobile] = useState(customerMobileNumber || '');
  const [collectorId, setCollectorId] = useState('');
  const [recoveryOutcome, setRecoveryOutcome] = useState<string>('full');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleDeviceToggle = (deviceId: string) => {
    setSelectedDevices((prev) =>
      prev.includes(deviceId)
        ? prev.filter((id) => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const handleSubmit = async () => {
    if (selectedDevices.length === 0) {
      setError('Please select at least one device');
      return;
    }

    if (!collectorName.trim() || !collectorMobile.trim()) {
      setError('Collector name and mobile number are required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const { error: dbError } = await supabase.rpc('log_case_checkout', {
        p_case_id: caseId,
        p_collector_name: collectorName.trim(),
        p_collector_mobile: collectorMobile.trim(),
        p_collector_id: collectorId.trim() || null,
        p_recovery_outcome: recoveryOutcome,
      });

      if (dbError) throw dbError;

      onCheckoutComplete();
      onClose();

      setTimeout(() => {
        if (onShowCheckoutPreview) {
          onShowCheckoutPreview();
        } else {
          window.open(`/print/checkout/${caseId}`, '_blank');
        }
      }, 500);
    } catch (err) {
      logger.error('Error during checkout:', err);
      setError('Failed to complete checkout. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedDevices([]);
      setCollectorName(customerName);
      setCollectorMobile(customerMobileNumber || '');
      setCollectorId('');
      setRecoveryOutcome('full');
      setError('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Device Checkout">
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-900 font-semibold mb-2">
            <Package className="w-5 h-5" />
            <span>Select Devices to Checkout</span>
          </div>
          <div className="space-y-2">
            {devices.map((device, index) => (
              <label
                key={device.id}
                className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-blue-400 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedDevices.includes(device.id)}
                  onChange={() => handleDeviceToggle(device.id)}
                  className="mt-1 w-4 h-4 text-blue-600"
                />
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">
                    {device.device_type?.name || 'Unknown Device'}{' '}
                    {device.brand?.name && `- ${device.brand.name}`}
                    {index === 0 && (
                      <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                        Patient
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-600">
                    {device.serial_no && (
                      <span className="font-mono">S/N: {device.serial_no}</span>
                    )}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-900 font-semibold mb-4">
            <User className="w-5 h-5" />
            <span>Collector Information</span>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                <User className="w-4 h-4 inline mr-1" />
                Collector Name *
              </label>
              <Input
                value={collectorName}
                onChange={(e) => setCollectorName(e.target.value)}
                placeholder="Enter collector name"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                <Phone className="w-4 h-4 inline mr-1" />
                Mobile Number *
              </label>
              <Input
                value={collectorMobile}
                onChange={(e) => setCollectorMobile(e.target.value)}
                placeholder="Enter mobile number"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                <CreditCard className="w-4 h-4 inline mr-1" />
                National ID, Passport, etc. (Optional)
              </label>
              <Input
                value={collectorId}
                onChange={(e) => setCollectorId(e.target.value)}
                placeholder="Enter ID number (optional)"
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-purple-900 mb-2">
            Recovery Outcome
          </label>
          <select
            value={recoveryOutcome}
            onChange={(e) => setRecoveryOutcome(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="full">Full Recovery - All data recovered successfully</option>
            <option value="partial">Partial Recovery - Some data recovered</option>
            <option value="unrecoverable">Unrecoverable - Data could not be recovered</option>
            <option value="declined">Declined - Customer declined service</option>
          </select>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{ backgroundColor: '#8b5cf6' }}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Printer className="w-4 h-4" />
                Print Checkout Form
              </span>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
