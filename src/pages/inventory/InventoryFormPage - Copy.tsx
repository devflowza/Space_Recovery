import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  createInventoryItem,
  getInventoryCategories,
  getInventoryStatusTypes,
  getInventoryConditionTypes,
  type InventoryItem,
  type InventoryItemCategory,
  type InventoryStatusType,
  type InventoryConditionType,
} from '../../lib/inventoryService';
import { supabase } from '../../lib/supabaseClient';
import { logger } from '../../lib/logger';

export default function InventoryFormPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<InventoryItemCategory[]>([]);
  const [statusTypes, setStatusTypes] = useState<InventoryStatusType[]>([]);
  const [conditionTypes, setConditionTypes] = useState<InventoryConditionType[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<any[]>([]);
  const [capacities, setCapacities] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    name: '',
    category_id: null,
    item_type: 'donor_part',
    status_type_id: null,
    condition_type_id: null,
    quantity_available: 0,
    quantity_in_use: 0,
    acquisition_cost: 0,
    is_active: true,
  });

  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    try {
      const [
        categoriesData,
        statusTypesData,
        conditionTypesData,
        brandsData,
        deviceTypesData,
        capacitiesData,
        locationsData,
      ] = await Promise.all([
        getInventoryCategories(),
        getInventoryStatusTypes(),
        getInventoryConditionTypes(),
        supabase.from('catalog_device_brands').select('*').eq('is_active', true).order('name'),
        supabase.from('catalog_device_types').select('*').eq('is_active', true).order('name'),
        supabase.from('catalog_device_capacities').select('*').eq('is_active', true).order('gb_value'),
        supabase.from('inventory_locations').select('*').eq('is_active', true).order('name'),
      ]);

      setCategories(categoriesData);
      setStatusTypes(statusTypesData);
      setConditionTypes(conditionTypesData);
      setBrands(brandsData.data || []);
      setDeviceTypes(deviceTypesData.data || []);
      setCapacities(capacitiesData.data || []);
      setLocations(locationsData.data || []);
    } catch (error) {
      logger.error('Error loading master data:', error);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: user } = await supabase.auth.getUser();

      await createInventoryItem({
        ...formData,
        created_by: user?.user?.id,
      });

      toast.success('Item saved successfully');
      navigate('/inventory');
    } catch (error) {
      logger.error('Error saving item:', error);
      toast.error('Failed to save item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (
    field: keyof InventoryItem,
    value: string | number | boolean | null
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => navigate('/inventory')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Add Inventory Item
          </h1>
          <p className="text-slate-600 mt-1">
            Add a new item to your inventory
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Item Name *
              </label>
              <Input
                type="text"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                required
                placeholder="Enter item name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Category *
              </label>
              <select
                value={formData.category_id || ''}
                onChange={(e) =>
                  handleChange('category_id', e.target.value ? Number(e.target.value) : null)
                }
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Item Type
              </label>
              <select
                value={formData.item_type || 'donor_part'}
                onChange={(e) => handleChange('item_type', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="donor_part">Donor Part</option>
                <option value="clone_drive">Clone Drive</option>
                <option value="spare_device">Spare Device</option>
                <option value="tool">Tool</option>
                <option value="supply">Supply</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Status
              </label>
              <select
                value={formData.status_type_id || ''}
                onChange={(e) =>
                  handleChange('status_type_id', e.target.value ? Number(e.target.value) : null)
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Status</option>
                {statusTypes.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Condition
              </label>
              <select
                value={formData.condition_type_id || ''}
                onChange={(e) =>
                  handleChange('condition_type_id', e.target.value ? Number(e.target.value) : null)
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Condition</option>
                {conditionTypes.map((condition) => (
                  <option key={condition.id} value={condition.id}>
                    {condition.rating}/5 - {condition.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter item description"
              />
            </div>
          </div>
        </div>

        {/* Device Specifications */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Device Specifications
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Brand
              </label>
              <select
                value={formData.brand_id || ''}
                onChange={(e) => handleChange('brand_id', e.target.value || null)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Brand</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Device Type
              </label>
              <select
                value={formData.device_type_id || ''}
                onChange={(e) => handleChange('device_type_id', e.target.value || null)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Device Type</option>
                {deviceTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Model
              </label>
              <Input
                type="text"
                value={formData.model || ''}
                onChange={(e) => handleChange('model', e.target.value)}
                placeholder="Enter model"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Serial Number
              </label>
              <Input
                type="text"
                value={formData.serial_number || ''}
                onChange={(e) => handleChange('serial_number', e.target.value)}
                placeholder="Enter serial number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Capacity
              </label>
              <select
                value={formData.capacity_id || ''}
                onChange={(e) => handleChange('capacity_id', e.target.value || null)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Capacity</option>
                {capacities.map((capacity) => (
                  <option key={capacity.id} value={capacity.id}>
                    {capacity.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                SKU / Part Number
              </label>
              <Input
                type="text"
                value={formData.sku_code || ''}
                onChange={(e) => handleChange('sku_code', e.target.value)}
                placeholder="Enter SKU or part number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Firmware Version
              </label>
              <Input
                type="text"
                value={formData.firmware_version || ''}
                onChange={(e) => handleChange('firmware_version', e.target.value)}
                placeholder="Enter firmware version"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                PCB Number
              </label>
              <Input
                type="text"
                value={formData.pcb_number || ''}
                onChange={(e) => handleChange('pcb_number', e.target.value)}
                placeholder="Enter PCB number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Manufacture Date
              </label>
              <Input
                type="date"
                value={formData.manufacture_date || ''}
                onChange={(e) => handleChange('manufacture_date', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Barcode
              </label>
              <Input
                type="text"
                value={formData.barcode || ''}
                onChange={(e) => handleChange('barcode', e.target.value)}
                placeholder="Enter barcode"
              />
            </div>
          </div>
        </div>

        {/* Inventory & Stock */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Inventory & Stock
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Quantity Available
              </label>
              <Input
                type="number"
                value={formData.quantity_available || 0}
                onChange={(e) => handleChange('quantity_available', Number(e.target.value))}
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Quantity In Use
              </label>
              <Input
                type="number"
                value={formData.quantity_in_use || 0}
                onChange={(e) => handleChange('quantity_in_use', Number(e.target.value))}
                min="0"
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Storage Location
              </label>
              <select
                value={formData.storage_location_id || ''}
                onChange={(e) => handleChange('storage_location_id', e.target.value || null)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Location</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Storage Notes
              </label>
              <textarea
                value={formData.storage_notes || ''}
                onChange={(e) => handleChange('storage_notes', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter storage notes or location details"
              />
            </div>
          </div>
        </div>

        {/* Sourcing & Financial */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Sourcing & Financial
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Supplier Name
              </label>
              <Input
                type="text"
                value={formData.supplier_name || ''}
                onChange={(e) => handleChange('supplier_name', e.target.value)}
                placeholder="Enter supplier name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Supplier Contact
              </label>
              <Input
                type="text"
                value={formData.supplier_contact || ''}
                onChange={(e) => handleChange('supplier_contact', e.target.value)}
                placeholder="Enter supplier contact"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Acquisition Cost
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.acquisition_cost || 0}
                onChange={(e) => handleChange('acquisition_cost', Number(e.target.value))}
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Acquisition Date
              </label>
              <Input
                type="date"
                value={formData.acquisition_date || ''}
                onChange={(e) => handleChange('acquisition_date', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Purchase Order Number
              </label>
              <Input
                type="text"
                value={formData.purchase_order_number || ''}
                onChange={(e) => handleChange('purchase_order_number', e.target.value)}
                placeholder="Enter PO number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Warranty Expiry
              </label>
              <Input
                type="date"
                value={formData.warranty_expiry || ''}
                onChange={(e) => handleChange('warranty_expiry', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Additional Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter any additional notes or information"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active || false}
                onChange={(e) => handleChange('is_active', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_active" className="ml-2 text-sm text-slate-700">
                Active Item
              </label>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/inventory')}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Create Item
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
