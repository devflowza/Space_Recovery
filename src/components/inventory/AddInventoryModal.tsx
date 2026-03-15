import React, { useState, useEffect } from 'react';
import { X, Package, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { SearchableSelect } from '../ui/SearchableSelect';
import { supabase } from '../../lib/supabaseClient';
import { useCurrency } from '../../hooks/useCurrency';

interface AddInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  itemId?: string | null;
}

interface DonorParts {
  heads: boolean;
  pcb: boolean;
  drive_enclosure: boolean;
}

interface FormData {
  inventory_type_id: string;
  status_type_id: string;
  device_type_id: string;
  brand_id: string;
  model: string;
  serial_number: string;
  capacity_id: string;
  usable_donor_parts: DonorParts;
  interface_id: string;
  manufacture_date: string;
  product_country_id: string;
  pcb_number: string;
  dcm: string;
  head_map: string;
  preamp: string;
  part_number: string;
  platter_heads: string;
  firmware_version: string;
  mlc: string;
  purchase_cost: string;
  purchase_date: string;
  condition_type_id: string;
  quantity_available: number;
  storage_location_id: string;
  supplier_name: string;
}

const AddInventoryModal: React.FC<AddInventoryModalProps> = ({ isOpen, onClose, onSuccess, itemId }) => {
  const { currencyFormat, loading: currencyLoading } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [nextInventoryNumber, setNextInventoryNumber] = useState<string>('');
  const [inventoryCategories, setInventoryCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [statusTypes, setStatusTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [deviceTypes, setDeviceTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);
  const [capacities, setCapacities] = useState<Array<{ id: string; name: string }>>([]);
  const [interfaces, setInterfaces] = useState<Array<{ id: string; name: string }>>([]);
  const [countries, setCountries] = useState<Array<{ id: string; name: string }>>([]);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [conditionTypes, setConditionTypes] = useState<Array<{ id: string; name: string; rating: number }>>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);

  const [formData, setFormData] = useState<FormData>({
    inventory_type_id: '',
    status_type_id: '',
    device_type_id: '',
    brand_id: '',
    model: '',
    serial_number: '',
    capacity_id: '',
    usable_donor_parts: {
      heads: false,
      pcb: false,
      drive_enclosure: false,
    },
    interface_id: '',
    manufacture_date: '',
    product_country_id: '',
    pcb_number: '',
    dcm: '',
    head_map: '',
    preamp: '',
    part_number: '',
    platter_heads: '',
    firmware_version: '',
    mlc: '',
    purchase_cost: '',
    purchase_date: '',
    condition_type_id: '',
    quantity_available: 1,
    storage_location_id: '',
    supplier_name: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchDropdownData();
      if (itemId) {
        loadExistingItem();
      } else {
        fetchNextInventoryNumber();
        resetForm();
      }
    }
  }, [isOpen, itemId]);


  const loadExistingItem = async () => {
    if (!itemId) return;

    setLoading(true);
    try {
      const { data: item, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('id', itemId)
        .maybeSingle();

      if (error) throw error;

      if (item) {
        setFormData({
          inventory_type_id: item.category_id || '',
          status_type_id: item.status_type_id || '',
          device_type_id: item.device_type_id || '',
          brand_id: item.brand_id || '',
          model: item.model || '',
          serial_number: item.serial_number || '',
          capacity_id: item.capacity_id || '',
          usable_donor_parts: item.usable_donor_parts || {
            heads: false,
            pcb: false,
            drive_enclosure: false,
          },
          interface_id: item.interface_id || '',
          manufacture_date: item.manufacture_date || '',
          product_country_id: item.product_country_id || '',
          pcb_number: item.pcb_number || '',
          dcm: item.dcm || '',
          head_map: item.head_map || '',
          preamp: item.preamp || '',
          part_number: item.part_number || '',
          platter_heads: item.platter_heads || '',
          firmware_version: item.firmware_version || '',
          mlc: '',
          purchase_cost: item.acquisition_cost ? item.acquisition_cost.toString() : '',
          purchase_date: item.acquisition_date || '',
          condition_type_id: item.condition_type_id || '',
          quantity_available: item.quantity_available || 1,
          storage_location_id: item.storage_location_id || '',
          supplier_name: item.supplier_name || '',
        });
        setNextInventoryNumber(item.inventory_code || '');
      }
    } catch (error) {
      console.error('Error loading item:', error);
      setErrors({ submit: 'Failed to load item data' });
    } finally {
      setLoading(false);
    }
  };

  const fetchNextInventoryNumber = async () => {
    try {
      const { data: sequence } = await supabase
        .from('number_sequences')
        .select('prefix, last_number, padding')
        .eq('scope', 'inventory')
        .maybeSingle();

      if (sequence) {
        const nextNumber = sequence.last_number + 1;
        const paddedNumber = nextNumber.toString().padStart(sequence.padding, '0');
        setNextInventoryNumber(`${sequence.prefix}${paddedNumber}`);
      }
    } catch (error) {
      console.error('Error fetching next inventory number:', error);
    }
  };

  const fetchDropdownData = async () => {
    setLoading(true);
    try {
      const [
        inventoryCategoriesRes,
        statusTypesRes,
        deviceTypesRes,
        brandsRes,
        capacitiesRes,
        interfacesRes,
        countriesRes,
        locationsRes,
        conditionsRes,
      ] = await Promise.all([
        supabase.from('inventory_categories').select('id, name').eq('is_active', true).order('sort_order'),
        supabase.from('inventory_status_types').select('id, name').eq('is_active', true).order('sort_order'),
        supabase.from('device_types').select('id, name').eq('is_active', true).order('name'),
        supabase.from('brands').select('id, name').eq('is_active', true).order('name'),
        supabase.from('capacities').select('id, name, gb_value').eq('is_active', true).order('gb_value'),
        supabase.from('interfaces').select('id, name').eq('is_active', true).order('sort_order'),
        supabase.from('countries').select('id, name').eq('is_active', true).order('name'),
        supabase.from('inventory_locations').select('id, name').eq('is_active', true).order('name'),
        supabase
          .from('inventory_condition_types')
          .select('id, name, rating')
          .eq('is_active', true)
          .order('rating', { ascending: false }),
      ]);

      const { data: suppliersData } = await supabase
        .from('inventory_items')
        .select('supplier_name')
        .not('supplier_name', 'is', null)
        .order('supplier_name');

      if (inventoryCategoriesRes.data) {
        setInventoryCategories(inventoryCategoriesRes.data);
      }
      if (statusTypesRes.data) {
        setStatusTypes(statusTypesRes.data);
      }
      if (deviceTypesRes.data) setDeviceTypes(deviceTypesRes.data);
      if (brandsRes.data) setBrands(brandsRes.data);
      if (capacitiesRes.data) {
        setCapacities(capacitiesRes.data.map(c => ({ id: c.id, name: c.name })));
      }
      if (interfacesRes.data) setInterfaces(interfacesRes.data);
      if (countriesRes.data) setCountries(countriesRes.data);
      if (locationsRes.data) setLocations(locationsRes.data);
      if (conditionsRes.data) setConditionTypes(conditionsRes.data);
      if (suppliersData) {
        const uniqueSuppliers = Array.from(new Set(suppliersData.map(s => s.supplier_name).filter(Boolean)));
        setSuppliers(uniqueSuppliers.map(name => ({ id: name, name })));
      }
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInventoryCode = async (): Promise<string> => {
    const { data: sequence } = await supabase
      .from('number_sequences')
      .select('*')
      .eq('scope', 'inventory')
      .single();

    if (!sequence) {
      throw new Error('Inventory number sequence not found');
    }

    const nextNumber = sequence.last_number + 1;
    const paddedNumber = nextNumber.toString().padStart(sequence.padding, '0');
    const code = `${sequence.prefix}${paddedNumber}`;

    await supabase
      .from('number_sequences')
      .update({ last_number: nextNumber })
      .eq('scope', 'inventory');

    return code;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.inventory_type_id) newErrors.inventory_type_id = 'Inventory Category is required';
    if (!formData.device_type_id) newErrors.device_type_id = 'Device Type is required';
    if (!formData.model.trim()) newErrors.model = 'Model Number is required';
    if (formData.quantity_available < 0) newErrors.quantity_available = 'Quantity must be 0 or greater';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const itemData: any = {
        category_id: formData.inventory_type_id || null,
        status_type_id: formData.status_type_id || null,
        device_type_id: formData.device_type_id || null,
        brand_id: formData.brand_id || null,
        model: formData.model.trim(),
        serial_number: formData.serial_number.trim() || null,
        capacity_id: formData.capacity_id || null,
        name: formData.model.trim(),
        usable_donor_parts: formData.usable_donor_parts,
        interface_id: formData.interface_id || null,
        manufacture_date: formData.manufacture_date || null,
        product_country_id: formData.product_country_id || null,
        pcb_number: formData.pcb_number.trim() || null,
        dcm: formData.dcm.trim() || null,
        head_map: formData.head_map.trim() || null,
        preamp: formData.preamp.trim() || null,
        part_number: formData.part_number.trim() || null,
        platter_heads: formData.platter_heads.trim() || null,
        firmware_version: formData.firmware_version.trim() || null,
        acquisition_cost: formData.purchase_cost ? parseFloat(formData.purchase_cost) : 0,
        acquisition_date: formData.purchase_date || null,
        condition_type_id: formData.condition_type_id || null,
        quantity_available: formData.quantity_available,
        storage_location_id: formData.storage_location_id || null,
        supplier_name: formData.supplier_name.trim() || null,
      };

      if (itemId) {
        const { error } = await supabase
          .from('inventory_items')
          .update(itemData)
          .eq('id', itemId);

        if (error) throw error;
      } else {
        const inventoryCode = await generateInventoryCode();
        itemData.inventory_code = inventoryCode;

        const { error } = await supabase.from('inventory_items').insert([itemData]);

        if (error) throw error;
      }

      resetForm();
      onSuccess();
      if (!itemId) {
        await fetchNextInventoryNumber();
      }
      onClose();
    } catch (error: any) {
      console.error(`Error ${itemId ? 'updating' : 'creating'} inventory item:`, error);
      setErrors({ submit: error.message || `Failed to ${itemId ? 'update' : 'create'} inventory item` });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      inventory_type_id: '',
      status_type_id: '',
      device_type_id: '',
      brand_id: '',
      model: '',
      serial_number: '',
      capacity_id: '',
      usable_donor_parts: {
        heads: false,
        pcb: false,
        drive_enclosure: false,
      },
      interface_id: '',
      manufacture_date: '',
      product_country_id: '',
      pcb_number: '',
      dcm: '',
      head_map: '',
      preamp: '',
      part_number: '',
      platter_heads: '',
      firmware_version: '',
      mlc: '',
      purchase_cost: '',
      purchase_date: '',
      condition_type_id: '',
      quantity_available: 1,
      storage_location_id: '',
      supplier_name: '',
    });
    setErrors({});
  };

  const handleClose = () => {
    if (!submitting) {
      resetForm();
      onClose();
    }
  };

  const formatConditionType = (condition: { name: string; rating: number }) => {
    return condition.name;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={itemId ? "Edit Inventory Item" : "Add Inventory Item"}
      icon={Package}
      maxWidth="7xl"
      headerAction={
        nextInventoryNumber && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-xs font-medium text-gray-600">{itemId ? 'Code:' : 'Next Number:'}</span>
            <span className="text-sm font-bold text-blue-600 font-mono">{nextInventoryNumber}</span>
          </div>
        )
      }
    >
      <form onSubmit={handleSubmit}>

        {(loading || currencyLoading) ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <div className="overflow-y-auto pr-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h3>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                  <div>
                    <SearchableSelect
                      label="Inventory Category"
                      options={inventoryCategories}
                      value={formData.inventory_type_id}
                      onChange={(value) => setFormData((prev) => ({ ...prev, inventory_type_id: value }))}
                      placeholder="Select inventory category"
                      disabled={submitting}
                      required
                      clearable={false}
                    />
                    {errors.inventory_type_id && (
                      <p className="mt-1 text-sm text-red-600">{errors.inventory_type_id}</p>
                    )}
                  </div>

                  <div>
                    <SearchableSelect
                      label="Device Type"
                      options={deviceTypes.map((dt) => ({ id: dt.id, name: dt.name }))}
                      value={formData.device_type_id}
                      onChange={(value) => setFormData((prev) => ({ ...prev, device_type_id: value }))}
                      placeholder="Select device type"
                      disabled={submitting}
                      required
                      clearable={false}
                    />
                    {errors.device_type_id && (
                      <p className="mt-1 text-sm text-red-600">{errors.device_type_id}</p>
                    )}
                  </div>

                  <div>
                    <SearchableSelect
                      label="Brand"
                      options={brands.map((b) => ({ id: b.id, name: b.name }))}
                      value={formData.brand_id}
                      onChange={(value) => setFormData((prev) => ({ ...prev, brand_id: value }))}
                      placeholder="Select brand"
                      disabled={submitting}
                      clearable={false}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Model Number <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData((prev) => ({ ...prev, model: e.target.value }))}
                      placeholder="Enter model number"
                      disabled={submitting}
                    />
                    {errors.model && <p className="mt-1 text-sm text-red-600">{errors.model}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                    <Input
                      type="text"
                      value={formData.serial_number}
                      onChange={(e) => setFormData((prev) => ({ ...prev, serial_number: e.target.value }))}
                      placeholder="Enter serial number"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <SearchableSelect
                      label="Capacity"
                      options={capacities}
                      value={formData.capacity_id}
                      onChange={(value) => setFormData((prev) => ({ ...prev, capacity_id: value }))}
                      placeholder="Select capacity"
                      disabled={submitting}
                      clearable={false}
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Usable Donor Parts</label>
                    <div className="grid grid-cols-3 gap-x-4 gap-y-1">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.usable_donor_parts.heads}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              usable_donor_parts: { ...prev.usable_donor_parts, heads: e.target.checked },
                            }))
                          }
                          disabled={submitting}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Heads</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.usable_donor_parts.pcb}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              usable_donor_parts: { ...prev.usable_donor_parts, pcb: e.target.checked },
                            }))
                          }
                          disabled={submitting}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">PCB</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.usable_donor_parts.drive_enclosure}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              usable_donor_parts: {
                                ...prev.usable_donor_parts,
                                drive_enclosure: e.target.checked,
                              },
                            }))
                          }
                          disabled={submitting}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Drive Enclosure</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Technical Specifications</h3>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                  <div>
                    <SearchableSelect
                      label="Interface"
                      options={interfaces.map((i) => ({ id: i.id, name: i.name }))}
                      value={formData.interface_id}
                      onChange={(value) => setFormData((prev) => ({ ...prev, interface_id: value }))}
                      placeholder="Select interface"
                      disabled={submitting}
                      clearable={false}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">DOM (Date of Manufacture)</label>
                    <Input
                      type="month"
                      value={formData.manufacture_date}
                      onChange={(e) => setFormData((prev) => ({ ...prev, manufacture_date: e.target.value }))}
                      placeholder="Select month"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <SearchableSelect
                      label="Product Of (Country)"
                      options={countries.map((c) => ({ id: c.id, name: c.name }))}
                      value={formData.product_country_id}
                      onChange={(value) => setFormData((prev) => ({ ...prev, product_country_id: value }))}
                      placeholder="Select country"
                      disabled={submitting}
                      clearable={false}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PCB Number</label>
                    <Input
                      type="text"
                      value={formData.pcb_number}
                      onChange={(e) => setFormData((prev) => ({ ...prev, pcb_number: e.target.value }))}
                      placeholder="Enter PCB number"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">DCM/MLC</label>
                    <Input
                      type="text"
                      value={formData.dcm}
                      onChange={(e) => setFormData((prev) => ({ ...prev, dcm: e.target.value }))}
                      placeholder="Enter DCM or MLC"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Head Map</label>
                    <Input
                      type="text"
                      value={formData.head_map}
                      onChange={(e) => setFormData((prev) => ({ ...prev, head_map: e.target.value }))}
                      placeholder="Enter head map"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preamp</label>
                    <Input
                      type="text"
                      value={formData.preamp}
                      onChange={(e) => setFormData((prev) => ({ ...prev, preamp: e.target.value }))}
                      placeholder="Enter preamp"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Part Number</label>
                    <Input
                      type="text"
                      value={formData.part_number}
                      onChange={(e) => setFormData((prev) => ({ ...prev, part_number: e.target.value }))}
                      placeholder="Enter part number"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Platter/Heads</label>
                    <Input
                      type="text"
                      value={formData.platter_heads}
                      onChange={(e) => setFormData((prev) => ({ ...prev, platter_heads: e.target.value }))}
                      placeholder="Enter platter/heads"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Firmware</label>
                    <Input
                      type="text"
                      value={formData.firmware_version}
                      onChange={(e) => setFormData((prev) => ({ ...prev, firmware_version: e.target.value }))}
                      placeholder="Enter firmware version"
                      disabled={submitting}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Inventory Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purchase Cost ({currencyFormat.currencyCode})
                  </label>
                  <div className="relative">
                    {currencyFormat.currencyPosition === 'before' && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                        {currencyFormat.currencySymbol}
                      </span>
                    )}
                    <Input
                      type="number"
                      step={`0.${'0'.repeat(Math.max(0, currencyFormat.decimalPlaces - 1))}1`}
                      min="0"
                      value={formData.purchase_cost}
                      onChange={(e) => setFormData((prev) => ({ ...prev, purchase_cost: e.target.value }))}
                      placeholder={`0.${'0'.repeat(currencyFormat.decimalPlaces)}`}
                      disabled={submitting}
                      className={currencyFormat.currencyPosition === 'before' ? 'pl-8' : 'pr-8'}
                    />
                    {currencyFormat.currencyPosition === 'after' && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                        {currencyFormat.currencySymbol}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                  <Input
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, purchase_date: e.target.value }))}
                    disabled={submitting}
                  />
                </div>

                <div>
                  <SearchableSelect
                    label="Status"
                    options={statusTypes}
                    value={formData.status_type_id}
                    onChange={(value) => setFormData((prev) => ({ ...prev, status_type_id: value }))}
                    placeholder="Select status"
                    disabled={submitting}
                    clearable={false}
                  />
                </div>

                <div>
                  <SearchableSelect
                    label="Condition"
                    options={conditionTypes.map((ct) => ({
                      id: ct.id,
                      name: formatConditionType(ct),
                    }))}
                    value={formData.condition_type_id}
                    onChange={(value) => setFormData((prev) => ({ ...prev, condition_type_id: value }))}
                    placeholder="Select condition"
                    disabled={submitting}
                    clearable={false}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.quantity_available}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, quantity_available: parseInt(e.target.value) || 0 }))
                    }
                    disabled={submitting}
                  />
                  {errors.quantity_available && (
                    <p className="mt-1 text-sm text-red-600">{errors.quantity_available}</p>
                  )}
                </div>

                <div>
                  <SearchableSelect
                    label="Location"
                    options={locations.map((l) => ({ id: l.id, name: l.name }))}
                    value={formData.storage_location_id}
                    onChange={(value) => setFormData((prev) => ({ ...prev, storage_location_id: value }))}
                    placeholder="Select location"
                    disabled={submitting}
                    clearable={false}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                  <Input
                    type="text"
                    value={formData.supplier_name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, supplier_name: e.target.value }))}
                    placeholder="Select or type supplier name"
                    disabled={submitting}
                    list="suppliers-list"
                  />
                  <datalist id="suppliers-list">
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.name} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            {errors.submit && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            <div className="flex justify-end space-x-3 mt-4 pt-3 border-t border-gray-200">
              <Button type="button" variant="secondary" onClick={handleClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {itemId ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  itemId ? 'Update Item' : 'Create Item'
                )}
              </Button>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};

export default AddInventoryModal;
