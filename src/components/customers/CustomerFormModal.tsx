import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { SearchableSelect } from '../ui/SearchableSelect';
import { useAuth } from '../../contexts/AuthContext';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (customer: Record<string, unknown>) => void;
}

interface CustomerGroup {
  id: string;
  name: string;
}

interface Company {
  id: string;
  company_number: string;
  company_name: string;
}

interface Country {
  id: string;
  name: string;
  is_active: boolean;
}

interface City {
  id: string;
  name: string;
  country_id: string;
  is_active: boolean;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    customer_name: '',
    email: '',
    mobile_number: '',
    phone_number: '',
    customer_group_id: '',
    country_id: '',
    city_id: '',
    address: '',
    portal_enabled: true,
    notes: '',
    company_id: '',
  });

  const [newCompanyData, setNewCompanyData] = useState({
    company_name: '',
  });

  const { data: customerGroups = [] } = useQuery({
    queryKey: ['customer_groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_groups')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as CustomerGroup[];
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, company_number, company_name')
        .order('company_name');

      if (error) throw error;
      return data as Company[];
    },
  });

  const { data: countries = [] } = useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('geo_countries')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as Country[];
    },
  });

  const { data: cities = [] } = useQuery({
    queryKey: ['cities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('geo_cities')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as City[];
    },
  });

  const { data: companySettings } = useQuery({
    queryKey: ['company_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('location')
        .eq('id', 1)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const filteredCities = cities.filter(
    (city) => !formData.country_id || city.country_id === formData.country_id
  );

  const createMutation = useMutation({
    mutationFn: async (customer: typeof formData) => {
      const { data: customerNumber, error: numberError } = await supabase.rpc('get_next_customer_number');

      if (numberError) throw numberError;

      const selectedCountry = countries.find((c) => c.id === customer.country_id);
      const selectedCity = cities.find((c) => c.id === customer.city_id);

      const { data: newCustomer, error: createError } = await supabase
        .from('customers_enhanced')
        .insert({
          customer_number: customerNumber,
          customer_name: customer.customer_name,
          email: customer.email || null,
          mobile_number: customer.mobile_number || null,
          phone_number: customer.phone_number || null,
          customer_group_id: customer.customer_group_id || null,
          country: selectedCountry?.name || null,
          city: selectedCity?.name || null,
          address_line1: customer.address || null,
          address_line2: null,
          postal_code: null,
          portal_enabled: customer.portal_enabled,
          notes: customer.notes || null,
          created_by: profile?.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      if (customer.company_id && newCustomer) {
        const { error: relError } = await supabase
          .from('customer_company_relationships')
          .insert({
            customer_id: newCustomer.id,
            company_id: customer.company_id,
            is_primary_contact: false,
          });

        if (relError) throw relError;
      }

      return newCustomer;
    },
    onSuccess: (newCustomer) => {
      queryClient.invalidateQueries({ queryKey: ['customers_enhanced'] });
      queryClient.invalidateQueries({ queryKey: ['customers_for_cases'] });
      resetForm();
      if (onSuccess) {
        onSuccess(newCustomer);
      }
      onClose();
    },
  });

  const createCompanyMutation = useMutation({
    mutationFn: async (companyData: typeof newCompanyData) => {
      const { data: companyNumber, error: numberError } = await supabase.rpc('get_next_company_number');

      if (numberError) throw numberError;

      const { data: newCompany, error: createError } = await supabase
        .from('companies')
        .insert({
          company_number: companyNumber,
          company_name: companyData.company_name,
          created_by: profile?.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      return newCompany;
    },
    onSuccess: async (newCompany) => {
      await queryClient.invalidateQueries({ queryKey: ['companies'] });
      await queryClient.refetchQueries({ queryKey: ['companies'] });
      setFormData({ ...formData, company_id: newCompany.id });
      setIsAddCompanyModalOpen(false);
      setNewCompanyData({ company_name: '' });
    },
  });

  const resetForm = () => {
    const defaultCountryId = companySettings?.location?.default_country_id || '';
    setFormData({
      customer_name: '',
      email: '',
      mobile_number: '',
      phone_number: '',
      customer_group_id: '',
      country_id: defaultCountryId,
      city_id: '',
      address: '',
      portal_enabled: true,
      notes: '',
      company_id: '',
    });
  };

  const handleAddNewCompany = () => {
    setIsAddCompanyModalOpen(true);
  };

  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    createCompanyMutation.mutate(newCompanyData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  React.useEffect(() => {
    if (isOpen && companySettings?.location?.default_country_id) {
      setFormData((prev) => ({
        ...prev,
        country_id: companySettings.location.default_country_id,
      }));
    }
  }, [isOpen, companySettings]);

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} title="Add New Customer">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            label="Customer Name"
            value={formData.customer_name}
            onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
            required
            placeholder="Full name or business name"
          />

          <div className="grid grid-cols-2 gap-2.5">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="customer@email.com"
            />
            <Input
              label="Mobile Number"
              value={formData.mobile_number}
              onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
              placeholder="+1234567890"
            />
          </div>

          <Input
            label="Phone Number (Alternative)"
            value={formData.phone_number}
            onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-2.5">
            <SearchableSelect
              label="Customer Group"
              value={formData.customer_group_id}
              onChange={(value) => setFormData({ ...formData, customer_group_id: value })}
              options={customerGroups.map((g) => ({ id: g.id, name: g.name }))}
              placeholder="Choose customer type (Individual, Corporate, VIP)"
              clearable={false}
            />

            <SearchableSelect
              label="Company (Optional)"
              value={formData.company_id}
              onChange={(value) => setFormData({ ...formData, company_id: value })}
              options={companies.map((c) => ({ id: c.id, name: `${c.company_name} (${c.company_number})` }))}
              placeholder="No Company"
              onAddNew={handleAddNewCompany}
              addNewLabel="Add New Company"
              clearable={false}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <SearchableSelect
              label="Country"
              value={formData.country_id}
              onChange={(value) => {
                setFormData({ ...formData, country_id: value, city_id: '' });
              }}
              options={countries.map((c) => ({ id: c.id, name: c.name }))}
              placeholder="Select Country"
              clearable={false}
            />
            <SearchableSelect
              label="City"
              value={formData.city_id}
              onChange={(value) => setFormData({ ...formData, city_id: value })}
              options={filteredCities.map((c) => ({ id: c.id, name: c.name }))}
              placeholder="Select City"
              disabled={!formData.country_id}
              clearable={false}
            />
          </div>

          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.portal_enabled}
                onChange={(e) =>
                  setFormData({ ...formData, portal_enabled: e.target.checked })
                }
                className="w-4 h-4 text-cyan-600 border-slate-300 rounded focus:ring-cyan-500"
              />
              <span className="text-sm font-medium text-slate-700">
                Allow this customer to view their cases online
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Internal Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={1}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
              placeholder="Private notes (customers won't see these)"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" style={{ backgroundColor: '#06b6d4' }}>
              Create Customer
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isAddCompanyModalOpen}
        onClose={() => {
          setIsAddCompanyModalOpen(false);
          setNewCompanyData({ company_name: '' });
        }}
        title="Add New Company"
      >
        <form onSubmit={handleCreateCompany} className="space-y-4">
          <Input
            label="Company Name"
            value={newCompanyData.company_name}
            onChange={(e) => setNewCompanyData({ ...newCompanyData, company_name: e.target.value })}
            required
          />

          <div className="flex gap-3 justify-end pt-2 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsAddCompanyModalOpen(false);
                setNewCompanyData({ company_name: '' });
              }}
            >
              Cancel
            </Button>
            <Button type="submit" style={{ backgroundColor: '#0ea5e9' }}>
              Create Company
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
