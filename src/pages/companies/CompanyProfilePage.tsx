import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import {
  ChevronLeft, Building2, Mail, Phone, MapPin, Globe, Users,
  Calendar, FileText, DollarSign, MessageSquare, Eye, User, TrendingUp, Briefcase
} from 'lucide-react';
import { formatDate } from '../../lib/format';
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
}

interface Contact {
  id: string;
  is_primary_contact: boolean;
  job_title: string | null;
  department: string | null;
  customers_enhanced: {
    id: string;
    customer_number: string;
    customer_name: string;
    email: string | null;
    mobile_number: string | null;
    portal_enabled: boolean;
  };
}

interface Communication {
  id: string;
  communication_type: string;
  subject: string | null;
  content: string | null;
  direction: string | null;
  created_at: string;
  created_by: string | null;
  profiles: {
    full_name: string;
  } | null;
}

export const CompanyProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'contacts' | 'cases' | 'financial' | 'communications'>('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    company_name: '',
    vat_number: '',
    industry_id: '',
    email: '',
    phone_number: '',
    website: '',
    country_id: '',
    city_id: '',
    address_line1: '',
    notes: '',
  });

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          *,
          industries (id, name)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as Company | null;
    },
    enabled: !!id,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['company_contacts', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_company_relationships')
        .select(`
          *,
          customers_enhanced (
            id,
            customer_number,
            customer_name,
            email,
            mobile_number,
            portal_enabled
          )
        `)
        .eq('company_id', id)
        .order('is_primary_contact', { ascending: false });

      if (error) {
        logger.error('Error fetching contacts:', error);
        return [];
      }
      return (data as Contact[]) || [];
    },
    enabled: !!id,
  });

  const { data: communications = [] } = useQuery({
    queryKey: ['company_communications', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_communications')
        .select(`
          *,
          profiles (full_name)
        `)
        .eq('company_id', id)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching communications:', error);
        return [];
      }
      return (data as Communication[]) || [];
    },
    enabled: !!id,
  });

  const { data: companyInsights = {
    totalCases: 0,
    completedCases: 0,
    pendingCases: 0,
    totalRevenue: 0,
    totalQuotes: 0,
    approvedQuotes: 0,
    lastInteraction: null,
  } } = useQuery({
    queryKey: ['company_insights', id, contacts],
    queryFn: async () => {
      const customerIds = contacts.map(c => c.customers_enhanced?.id).filter(Boolean);

      if (customerIds.length === 0) {
        return {
          totalCases: 0,
          completedCases: 0,
          pendingCases: 0,
          totalRevenue: 0,
          totalQuotes: 0,
          approvedQuotes: 0,
          lastInteraction: null,
        };
      }

      try {
        const { data: cases, error: casesError } = await supabase
          .from('cases')
          .select('id, status, created_at')
          .in('customer_id', customerIds);

        if (casesError) {
          logger.error('Error fetching cases:', casesError);
          return {
            totalCases: 0,
            completedCases: 0,
            pendingCases: 0,
            totalRevenue: 0,
            totalQuotes: 0,
            approvedQuotes: 0,
            lastInteraction: null,
          };
        }

        const caseIds = cases?.map(c => c.id) || [];

        let totalRevenue = 0;
        let totalQuotes = 0;
        let approvedQuotes = 0;

        if (caseIds.length > 0) {
          const { data: quotes, error: quotesError } = await supabase
            .from('case_quotes')
            .select('total_amount, status')
            .in('case_id', caseIds);

          if (!quotesError && quotes) {
            totalQuotes = quotes.length;
            approvedQuotes = quotes.filter(q => q.status === 'approved' || q.status === 'accepted').length;
            totalRevenue = quotes
              .filter(q => q.status === 'approved' || q.status === 'accepted')
              .reduce((sum, q) => sum + (parseFloat(q.total_amount?.toString() || '0')), 0);
          }
        }

        const completedStatuses = ['completed', 'closed', 'delivered'];
        const pendingStatuses = ['open', 'in_progress', 'pending', 'awaiting_approval'];

        return {
          totalCases: cases?.length || 0,
          completedCases: cases?.filter(c => completedStatuses.includes(c.status.toLowerCase())).length || 0,
          pendingCases: cases?.filter(c => pendingStatuses.includes(c.status.toLowerCase())).length || 0,
          totalRevenue,
          totalQuotes,
          approvedQuotes,
          lastInteraction: cases && cases.length > 0 ? cases[0].created_at : null,
        };
      } catch (error) {
        logger.error('Exception fetching cases:', error);
        return {
          totalCases: 0,
          completedCases: 0,
          pendingCases: 0,
          totalRevenue: 0,
          totalQuotes: 0,
          approvedQuotes: 0,
          lastInteraction: null,
        };
      }
    },
    enabled: !!id,
    retry: false,
  });

  const { data: industries = [] } = useQuery({
    queryKey: ['industries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('master_industries')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
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
      return data;
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
      return data;
    },
  });

  const filteredCities = cities.filter(
    (city: { id: string; country_id: string; name: string }) => !editFormData.country_id || city.country_id === editFormData.country_id
  );

  const updateMutation = useMutation({
    mutationFn: async (updatedData: typeof editFormData) => {
      const selectedCountry = countries.find((c: { id: string; name: string }) => c.id === updatedData.country_id);
      const selectedCity = cities.find((c: { id: string; name: string }) => c.id === updatedData.city_id);

      const { data, error } = await supabase
        .from('companies')
        .update({
          company_name: updatedData.company_name,
          vat_number: updatedData.vat_number || null,
          industry_id: updatedData.industry_id || null,
          email: updatedData.email || null,
          phone_number: updatedData.phone_number || null,
          website: updatedData.website || null,
          country: selectedCountry?.name || null,
          city: selectedCity?.name || null,
          address_line1: updatedData.address_line1 || null,
          notes: updatedData.notes || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', id] });
      setIsEditModalOpen(false);
    },
  });

  const handleOpenEditModal = () => {
    if (!company) return;

    const companyCountry = countries.find((c: { id: string; name: string }) => c.name === company.country);
    const companyCity = cities.find((c: { id: string; name: string }) => c.name === company.city);

    setEditFormData({
      company_name: company.company_name,
      vat_number: company.vat_number || '',
      industry_id: company.industry_id || '',
      email: company.email || '',
      phone_number: company.phone_number || '',
      website: company.website || '',
      country_id: companyCountry?.id || '',
      city_id: companyCity?.id || '',
      address_line1: company.address_line1 || '',
      notes: company.notes || '',
    });
    setIsEditModalOpen(true);
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(editFormData);
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-slate-200 border-t-sky-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 mt-4">Loading company profile...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center">
          <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg">Company not found</p>
          <Button onClick={() => navigate('/companies')} variant="secondary" className="mt-4">
            Back to Companies
          </Button>
        </div>
      </div>
    );
  }

  const getCommunicationIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'phone':
        return <Phone className="w-4 h-4" />;
      case 'meeting':
        return <Calendar className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getCommunicationColor = (type: string) => {
    switch (type) {
      case 'email':
        return '#3b82f6';
      case 'phone':
        return '#10b981';
      case 'meeting':
        return '#8b5cf6';
      case 'sms':
        return '#f59e0b';
      default:
        return '#64748b';
    }
  };

  const primaryContact = contacts.find(c => c.is_primary_contact);

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <button
        onClick={() => navigate('/companies')}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-all hover:gap-3 font-medium"
      >
        <ChevronLeft className="w-5 h-5" />
        <span>Back to Companies</span>
      </button>

      <Card className="p-6 mb-4">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
            {company.company_name.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-slate-900">{company.company_name}</h1>
              <Badge variant="custom" color="#0ea5e9">
                {company.company_number}
              </Badge>
              {!company.is_active && <Badge variant="default">Inactive</Badge>}
            </div>

            <div className="flex items-center gap-3 mb-4">
              {company.industries && (
                <Badge variant="custom" color="#8b5cf6">
                  {company.industries.name}
                </Badge>
              )}
              {company.vat_number && (
                <span className="text-sm text-slate-600">
                  <span className="font-medium">VAT:</span> {company.vat_number}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {company.email && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <a href={`mailto:${company.email}`} className="hover:text-sky-600">
                    {company.email}
                  </a>
                </div>
              )}
              {company.phone_number && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <a href={`tel:${company.phone_number}`} className="hover:text-sky-600">
                    {company.phone_number}
                  </a>
                </div>
              )}
              {company.website && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="hover:text-sky-600 truncate">
                    {company.website}
                  </a>
                </div>
              )}
              {(company.city || company.country) && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{[company.city, company.country].filter(Boolean).join(', ')}</span>
                </div>
              )}
              {primaryContact && primaryContact.customers_enhanced && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span>
                    {primaryContact.customers_enhanced.customer_name}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Joined {formatDate(company.created_at)}</span>
              </div>
            </div>

            {company.address_line1 && (
              <div className="mt-3 text-sm text-slate-600">
                <p>{company.address_line1}</p>
                {company.address_line2 && <p>{company.address_line2}</p>}
                {company.postal_code && <p>{company.postal_code}</p>}
              </div>
            )}
          </div>

          <Button variant="secondary" size="sm" onClick={handleOpenEditModal}>
            Edit Profile
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm font-semibold text-green-700">Total Revenue</p>
          </div>
          <p className="text-2xl font-bold text-green-900">
            ${companyInsights?.totalRevenue?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
          </p>
          <p className="text-xs text-green-600 mt-1">
            From approved quotes
          </p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-blue-50 to-sky-50 border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm font-semibold text-blue-700">Total Cases</p>
          </div>
          <p className="text-2xl font-bold text-blue-900">
            {companyInsights?.totalCases || 0}
          </p>
          <div className="flex items-center gap-3 mt-1 text-xs">
            <span className="text-green-600 font-medium">
              ✓ {companyInsights?.completedCases || 0} Done
            </span>
            <span className="text-amber-600 font-medium">
              ⏳ {companyInsights?.pendingCases || 0} Pending
            </span>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm font-semibold text-violet-700">Quotes</p>
          </div>
          <p className="text-2xl font-bold text-violet-900">
            {companyInsights?.totalQuotes || 0}
          </p>
          <p className="text-xs text-violet-600 mt-1">
            {companyInsights?.approvedQuotes || 0} approved
          </p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-slate-500 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Contacts</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {contacts.length}
          </p>
          <p className="text-xs text-slate-600 mt-1">
            {contacts.filter(c => c.customers_enhanced?.portal_enabled).length} with portal access
          </p>
        </Card>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-slate-200">
        <div className="border-b border-slate-200">
          <div className="flex gap-1 p-1.5 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: Building2 },
              { id: 'contacts', label: 'Contacts', icon: Users },
              { id: 'cases', label: 'Cases', icon: FileText },
              { id: 'financial', label: 'Financial', icon: DollarSign },
              { id: 'communications', label: 'Communications', icon: MessageSquare },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-sky-50 text-sky-700 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {company.notes && (
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-3">Internal Notes</h3>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{company.notes}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Recent Activity</h3>
                  <div className="space-y-3">
                    {communications.length > 0 ? (
                      communications.slice(0, 3).map((comm) => (
                        <div key={comm.id} className="flex gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: getCommunicationColor(comm.communication_type) + '20' }}
                          >
                            <div style={{ color: getCommunicationColor(comm.communication_type) }}>
                              {getCommunicationIcon(comm.communication_type)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {comm.subject || comm.communication_type}
                            </p>
                            <p className="text-xs text-slate-500">{formatDate(comm.created_at)}</p>
                          </div>
                        </div>
                      ))
                    ) : companyInsights?.totalCases && companyInsights.totalCases > 0 ? (
                      <div className="text-center py-4">
                        <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-500">No recent communications</p>
                        <p className="text-xs text-slate-400 mt-1">{companyInsights.totalCases} cases in progress</p>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-500">No activity yet</p>
                      </div>
                    )}
                  </div>
                  {communications.length > 3 && (
                    <button
                      onClick={() => setActiveTab('communications')}
                      className="w-full mt-3 text-xs font-medium text-sky-600 hover:text-sky-700 transition-colors"
                    >
                      View all activity →
                    </button>
                  )}
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl border border-blue-200 p-4">
                  <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-3">Contact Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-700">Total Contacts</span>
                      <span className="text-lg font-bold text-blue-900">{contacts.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-700">Portal Enabled</span>
                      <span className="text-lg font-bold text-blue-900">
                        {contacts.filter(c => c.customers_enhanced?.portal_enabled).length}
                      </span>
                    </div>
                    {primaryContact && primaryContact.customers_enhanced && (
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <p className="text-xs text-blue-700 mb-1">Primary Contact</p>
                        <p className="text-sm font-semibold text-blue-900">
                          {primaryContact.customers_enhanced.customer_name}
                        </p>
                        {primaryContact.job_title && (
                          <p className="text-xs text-blue-600 mt-1">{primaryContact.job_title}</p>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setActiveTab('contacts')}
                    className="w-full mt-3 px-3 py-2 bg-white rounded-lg text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    View all contacts
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contacts' && (
            <div>
              {contacts.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-lg">No contacts linked yet</p>
                  <Button variant="secondary" className="mt-4">
                    Add Contact
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {contacts.map((contact) => {
                    const customer = contact.customers_enhanced;
                    if (!customer) return null;

                    return (
                      <div
                        key={contact.id}
                        className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-cyan-300 cursor-pointer transition-all"
                        onClick={() => navigate(`/customers/${customer.id}`)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-white font-semibold">
                            {customer.customer_name?.[0] || 'C'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-slate-900">
                                {customer.customer_name}
                              </p>
                              {contact.is_primary_contact && (
                                <Badge variant="custom" color="#10b981" size="sm">
                                  Primary
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mb-2">
                              {customer.customer_number}
                            </p>
                            {contact.job_title && (
                              <p className="text-sm text-slate-600 mb-1">{contact.job_title}</p>
                            )}
                            {contact.department && (
                              <p className="text-xs text-slate-500">
                                Department: {contact.department}
                              </p>
                            )}
                            {customer.email && (
                              <div className="flex items-center gap-2 text-sm text-slate-600 mt-2">
                                <Mail className="w-3 h-3 text-slate-400" />
                                <span className="truncate">{customer.email}</span>
                              </div>
                            )}
                            {customer.mobile_number && (
                              <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{customer.mobile_number}</span>
                              </div>
                            )}
                            {customer.portal_enabled && (
                              <Badge variant="success" size="sm" className="mt-2">
                                Portal Access
                              </Badge>
                            )}
                          </div>
                          <Eye className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'cases' && (
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-lg">Cases history coming soon</p>
              <p className="text-sm mt-2">All cases from company contacts will appear here</p>
            </div>
          )}

          {activeTab === 'financial' && (
            <div className="text-center py-12 text-slate-500">
              <DollarSign className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-lg">Financial history coming soon</p>
              <p className="text-sm mt-2">Aggregated quotes, invoices, and transactions</p>
            </div>
          )}

          {activeTab === 'communications' && (
            <div>
              {communications.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-lg">No communications logged yet</p>
                  <Button variant="secondary" className="mt-4">
                    Log Communication
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {communications.map((comm) => (
                    <div
                      key={comm.id}
                      className="p-4 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                          style={{ backgroundColor: getCommunicationColor(comm.communication_type) }}
                        >
                          {getCommunicationIcon(comm.communication_type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="custom"
                              color={getCommunicationColor(comm.communication_type)}
                              size="sm"
                            >
                              {comm.communication_type}
                            </Badge>
                            {comm.direction && (
                              <Badge variant="default" size="sm">
                                {comm.direction}
                              </Badge>
                            )}
                            <span className="text-xs text-slate-500">
                              {formatDate(comm.created_at)}
                            </span>
                          </div>
                          {comm.subject && (
                            <p className="font-medium text-slate-900 mb-1">{comm.subject}</p>
                          )}
                          {comm.content && (
                            <p className="text-sm text-slate-600">{comm.content}</p>
                          )}
                          {comm.profiles && (
                            <p className="text-xs text-slate-500 mt-2">
                              Logged by {comm.profiles.full_name}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Company"
      >
        <form onSubmit={handleSubmitEdit} className="space-y-4">
          <Input
            label="Company Name"
            value={editFormData.company_name}
            onChange={(e) => setEditFormData({ ...editFormData, company_name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="VAT/Tax Number"
              value={editFormData.vat_number}
              onChange={(e) => setEditFormData({ ...editFormData, vat_number: e.target.value })}
            />
            <SearchableSelect
              label="Industry"
              value={editFormData.industry_id}
              onChange={(value) => setEditFormData({ ...editFormData, industry_id: value })}
              options={industries.map((i: { id: string; name: string }) => ({ id: i.id, name: i.name }))}
              placeholder="Select Industry"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email"
              type="email"
              value={editFormData.email}
              onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
            />
            <Input
              label="Phone Number"
              value={editFormData.phone_number}
              onChange={(e) => setEditFormData({ ...editFormData, phone_number: e.target.value })}
            />
          </div>

          <Input
            label="Website"
            value={editFormData.website}
            onChange={(e) => setEditFormData({ ...editFormData, website: e.target.value })}
            placeholder="https://example.com"
          />

          <div className="grid grid-cols-2 gap-3">
            <SearchableSelect
              label="Country"
              value={editFormData.country_id}
              onChange={(value) => {
                setEditFormData({ ...editFormData, country_id: value, city_id: '' });
              }}
              options={countries.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))}
              placeholder="Select Country"
            />
            <SearchableSelect
              label="City"
              value={editFormData.city_id}
              onChange={(value) => setEditFormData({ ...editFormData, city_id: value })}
              options={filteredCities.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))}
              placeholder="Select City"
              disabled={!editFormData.country_id}
            />
          </div>

          <Input
            label="Address"
            value={editFormData.address_line1}
            onChange={(e) => setEditFormData({ ...editFormData, address_line1: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Internal Notes
            </label>
            <textarea
              value={editFormData.notes}
              onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm"
              placeholder="Add any internal notes..."
            />
          </div>

          <div className="flex gap-3 justify-end pt-3 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditModalOpen(false)}
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
