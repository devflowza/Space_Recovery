import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { Plus, Search, Filter, Mail, Phone, Globe, Building2, MapPin, Eye, Users, Pencil, UserCheck, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDate } from '../../lib/format';
import { useAuth } from '../../contexts/AuthContext';
import { logger } from '../../lib/logger';

interface Company {
  id: string;
  company_number: string;
  company_name: string;
  vat_number: string | null;
  industry_id: string | null;
  email: string | null;
  phone_number: string | null;
  website: string | null;
  country: string | null;
  city: string | null;
  address_line1: string | null;
  address_line2: string | null;
  postal_code: string | null;
  primary_contact_id: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  industries: { id: string; name: string } | null;
  primary_contact: { id: string; customer_name: string } | null;
}

interface Industry {
  id: string;
  name: string;
}

interface Customer {
  id: string;
  customer_name: string;
  email: string | null;
  mobile_number: string | null;
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

export const CompaniesListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterIndustry, setFilterIndustry] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const COMPANIES_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterIndustry, filterStatus]);

  const [formData, setFormData] = useState({
    company_name: '',
    vat_number: '',
    industry_id: '',
    email: '',
    phone_number: '',
    website: '',
    country_id: '',
    city_id: '',
    address: '',
    primary_contact_id: '',
    notes: '',
  });

  const { data: companies = [], isLoading, error: companiesError } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          *,
          industries (id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching companies:', error);
        throw error;
      }

      const companiesWithContacts = await Promise.all(
        (data || []).map(async (company) => {
          if (company.primary_contact_id) {
            const { data: contact } = await supabase
              .from('customers_enhanced')
              .select('id, customer_name')
              .eq('id', company.primary_contact_id)
              .maybeSingle();

            return { ...company, primary_contact: contact };
          }
          return { ...company, primary_contact: null };
        })
      );

      return companiesWithContacts as Company[];
    },
    staleTime: 30000,
    refetchOnMount: true,
    retry: 2,
  });

  const { data: industries = [] } = useQuery({
    queryKey: ['industries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('master_industries')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Industry[];
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers_for_company'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers_enhanced')
        .select('id, customer_name, email, mobile_number')
        .eq('is_active', true)
        .order('customer_name');

      if (error) throw error;
      return data as Customer[];
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
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const filteredCities = cities.filter(
    (city) => !formData.country_id || city.country_id === formData.country_id
  );

  const createMutation = useMutation({
    mutationFn: async (company: typeof formData) => {
      const { data: companyNumber, error: numberError } = await supabase.rpc('get_next_company_number');

      if (numberError) throw numberError;

      const selectedCountry = countries.find((c) => c.id === company.country_id);
      const selectedCity = cities.find((c) => c.id === company.city_id);

      const { data: newCompany, error: createError } = await supabase
        .from('companies')
        .insert({
          company_number: companyNumber,
          company_name: company.company_name,
          vat_number: company.vat_number || null,
          industry_id: company.industry_id || null,
          email: company.email || null,
          phone_number: company.phone_number || null,
          website: company.website || null,
          country: selectedCountry?.name || null,
          city: selectedCity?.name || null,
          address_line1: company.address || null,
          address_line2: null,
          postal_code: null,
          primary_contact_id: company.primary_contact_id || null,
          notes: company.notes || null,
          created_by: profile?.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      if (company.primary_contact_id && newCompany) {
        const { error: relError } = await supabase
          .from('customer_company_relationships')
          .insert({
            customer_id: company.primary_contact_id,
            company_id: newCompany.id,
            is_primary_contact: true,
          });

        if (relError) throw relError;
      }

      return newCompany;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setIsModalOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const selectedCountry = countries.find((c) => c.id === data.country_id);
      const selectedCity = cities.find((c) => c.id === data.city_id);

      const { data: updatedCompany, error } = await supabase
        .from('companies')
        .update({
          company_name: data.company_name,
          vat_number: data.vat_number || null,
          industry_id: data.industry_id || null,
          email: data.email || null,
          phone_number: data.phone_number || null,
          website: data.website || null,
          country: selectedCountry?.name || null,
          city: selectedCity?.name || null,
          address_line1: data.address || null,
          notes: data.notes || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updatedCompany;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setIsEditModalOpen(false);
      setEditingCompanyId(null);
      resetForm();
    },
  });

  const resetForm = () => {
    const defaultCountryId = companySettings?.location?.default_country_id || '';
    setFormData({
      company_name: '',
      vat_number: '',
      industry_id: '',
      email: '',
      phone_number: '',
      website: '',
      country_id: defaultCountryId,
      city_id: '',
      address: '',
      primary_contact_id: '',
      notes: '',
    });
  };

  const handleOpenModal = () => {
    const defaultCountryId = companySettings?.location?.default_country_id || '';
    setFormData((prev) => ({ ...prev, country_id: defaultCountryId }));
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCompanyId) {
      updateMutation.mutate({ id: editingCompanyId, data: formData });
    }
  };

  const handleOpenEditModal = (company: Company) => {
    const companyCountry = countries.find((c) => c.name === company.country);
    const companyCity = cities.find((c) => c.name === company.city);

    setEditingCompanyId(company.id);
    setFormData({
      company_name: company.company_name,
      vat_number: company.vat_number || '',
      industry_id: company.industry_id || '',
      email: company.email || '',
      phone_number: company.phone_number || '',
      website: company.website || '',
      country_id: companyCountry?.id || '',
      city_id: companyCity?.id || '',
      address: company.address_line1 || '',
      primary_contact_id: company.primary_contact_id || '',
      notes: company.notes || '',
    });
    setIsEditModalOpen(true);
  };

  const filteredCompanies = companies.filter((company) => {
    const matchesSearch =
      company.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.company_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.vat_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesIndustry =
      filterIndustry === 'all' || company.industry_id === filterIndustry;

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && company.is_active) ||
      (filterStatus === 'inactive' && !company.is_active);

    return matchesSearch && matchesIndustry && matchesStatus;
  });

  const totalPages = Math.ceil(filteredCompanies.length / COMPANIES_PER_PAGE);
  const startIndex = (currentPage - 1) * COMPANIES_PER_PAGE;
  const endIndex = Math.min(startIndex + COMPANIES_PER_PAGE, filteredCompanies.length);
  const paginatedCompanies = filteredCompanies.slice(startIndex, endIndex);

  const recentCompanies = companies.filter((c) => {
    const createdDate = new Date(c.created_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return createdDate >= thirtyDaysAgo;
  });

  return (
    <div className="p-6 max-w-[1800px] mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
            style={{
              backgroundColor: '#0ea5e9',
              boxShadow: '0 10px 40px -10px #0ea5e980',
            }}
          >
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 mb-1">Companies</h1>
            <p className="text-slate-600 text-base">
              Manage corporate clients and business relationships
            </p>
          </div>
        </div>
        <Button onClick={handleOpenModal} style={{ backgroundColor: '#0ea5e9' }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Company
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Total Companies</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{companies.length}</p>
            </div>
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Active</p>
              <p className="text-2xl font-bold text-emerald-900 mt-1">{companies.filter((c) => c.is_active).length}</p>
            </div>
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl p-4 border border-violet-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-violet-600 uppercase tracking-wide">Recent (30d)</p>
              <p className="text-2xl font-bold text-violet-900 mt-1">{recentCompanies.length}</p>
            </div>
            <div className="w-10 h-10 bg-violet-500 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Industries</p>
              <p className="text-2xl font-bold text-amber-900 mt-1">{industries.length}</p>
            </div>
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 mb-6">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="w-full lg:w-80 relative flex-shrink-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex-1 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setFilterStatus(filterStatus === 'active' ? 'all' : 'active')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filterStatus === 'active'
                    ? 'bg-emerald-500 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilterStatus(filterStatus === 'inactive' ? 'all' : 'inactive')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filterStatus === 'inactive'
                    ? 'bg-slate-500 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Inactive
              </button>
              {(filterIndustry !== 'all' || filterStatus !== 'all') && (
                <button
                  onClick={() => {
                    setFilterIndustry('all');
                    setFilterStatus('all');
                  }}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-200 text-slate-700 hover:bg-slate-300 transition-all"
                >
                  Clear All
                </button>
              )}
            </div>

            <Button
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 flex-shrink-0"
            >
              <Filter className="w-4 h-4" />
              More Filters
              {(filterIndustry !== 'all' || filterStatus !== 'all') && (
                <span className="ml-1 w-2 h-2 rounded-full bg-blue-500"></span>
              )}
            </Button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Industry
                </label>
                <select
                  value={filterIndustry}
                  onChange={(e) => setFilterIndustry(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Industries</option>
                  {industries.map((industry) => (
                    <option key={industry.id} value={industry.id}>
                      {industry.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {companiesError ? (
        <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-12 text-center">
          <Building2 className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <p className="text-red-600 text-lg font-semibold mb-2">Error loading companies</p>
          <p className="text-slate-500 text-sm mb-4">{companiesError.message}</p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['companies'] })} style={{ backgroundColor: '#0ea5e9' }}>
            Retry
          </Button>
        </div>
      ) : isLoading ? (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center">
          <div className="inline-block w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 mt-4">Loading companies...</p>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center">
          <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg">
            {searchTerm || filterIndustry !== 'all' || filterStatus !== 'all'
              ? 'No companies found matching your criteria.'
              : 'No companies yet. Add your first company to get started.'}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Company Number
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Industry
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Primary Contact
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Created At
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedCompanies.map((company) => (
                    <tr
                      key={company.id}
                      onClick={() => navigate(`/companies/${company.id}`)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-semibold text-blue-600">
                          {company.company_number}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white font-semibold text-sm shadow-md">
                            {company.company_name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">
                              {company.company_name}
                            </div>
                            {company.vat_number && (
                              <div className="text-xs text-slate-500">
                                VAT: {company.vat_number}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {company.email ? (
                          <div className="text-sm text-slate-700 flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate max-w-[200px]">{company.email}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {company.phone_number ? (
                          <div className="text-sm text-slate-700 flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {company.phone_number}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(company.city || company.country) ? (
                          <div className="text-sm text-slate-700 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{[company.city, company.country].filter(Boolean).join(', ')}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {company.industries ? (
                          <Badge variant="custom" color="#8b5cf6" size="sm">
                            {company.industries.name}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {company.primary_contact ? (
                          <div className="flex items-center gap-1 text-sm text-slate-700">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate max-w-[150px]">
                              {company.primary_contact.customer_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {company.is_active ? (
                          <Badge variant="success" size="sm">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="default" size="sm">
                            Inactive
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {formatDate(company.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 mt-4 p-2.5">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  Showing <span className="font-medium text-slate-900">{startIndex + 1}</span> to{' '}
                  <span className="font-medium text-slate-900">{endIndex}</span> of{' '}
                  <span className="font-medium text-slate-900">{filteredCompanies.length}</span> companies
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-sm text-slate-600">
                    Page <span className="font-medium text-slate-900">{currentPage}</span> of{' '}
                    <span className="font-medium text-slate-900">{totalPages}</span>
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title="Add New Company"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Company Name"
            value={formData.company_name}
            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="VAT/Tax Number"
              value={formData.vat_number}
              onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
            />
            <SearchableSelect
              label="Industry"
              value={formData.industry_id}
              onChange={(value) => setFormData({ ...formData, industry_id: value })}
              options={industries.map((i) => ({ id: i.id, name: i.name }))}
              placeholder="Select Industry"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Input
              label="Phone Number"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
            />
          </div>

          <Input
            label="Website"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            placeholder="https://example.com"
          />

          <SearchableSelect
            label="Primary Contact"
            value={formData.primary_contact_id}
            onChange={(value) => setFormData({ ...formData, primary_contact_id: value })}
            options={customers.map((c) => ({
              id: c.id,
              name: `${c.customer_name}${c.email ? ` (${c.email})` : ''}`,
            }))}
            placeholder="Select Primary Contact"
          />

          <div className="grid grid-cols-2 gap-3">
            <SearchableSelect
              label="Country"
              value={formData.country_id}
              onChange={(value) => {
                setFormData({ ...formData, country_id: value, city_id: '' });
              }}
              options={countries.map((c) => ({ id: c.id, name: c.name }))}
              placeholder="Select Country"
            />
            <SearchableSelect
              label="City"
              value={formData.city_id}
              onChange={(value) => setFormData({ ...formData, city_id: value })}
              options={filteredCities.map((c) => ({ id: c.id, name: c.name }))}
              placeholder="Select City"
              disabled={!formData.country_id}
            />
          </div>

          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Internal Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm"
              placeholder="Add any internal notes..."
            />
          </div>

          <div className="flex gap-3 justify-end pt-3 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
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

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingCompanyId(null);
          resetForm();
        }}
        title="Edit Company"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input
            label="Company Name"
            value={formData.company_name}
            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="VAT/Tax Number"
              value={formData.vat_number}
              onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
            />
            <SearchableSelect
              label="Industry"
              value={formData.industry_id}
              onChange={(value) => setFormData({ ...formData, industry_id: value })}
              options={industries.map((i) => ({ id: i.id, name: i.name }))}
              placeholder="Select Industry"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Input
              label="Phone Number"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
            />
          </div>

          <Input
            label="Website"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            placeholder="https://example.com"
          />

          <div className="grid grid-cols-2 gap-3">
            <SearchableSelect
              label="Country"
              value={formData.country_id}
              onChange={(value) => {
                setFormData({ ...formData, country_id: value, city_id: '' });
              }}
              options={countries.map((c) => ({ id: c.id, name: c.name }))}
              placeholder="Select Country"
            />
            <SearchableSelect
              label="City"
              value={formData.city_id}
              onChange={(value) => setFormData({ ...formData, city_id: value })}
              options={filteredCities.map((c) => ({ id: c.id, name: c.name }))}
              placeholder="Select City"
              disabled={!formData.country_id}
            />
          </div>

          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Internal Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm"
              placeholder="Add any internal notes..."
            />
          </div>

          <div className="flex gap-3 justify-end pt-3 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingCompanyId(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" style={{ backgroundColor: '#0ea5e9' }} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
