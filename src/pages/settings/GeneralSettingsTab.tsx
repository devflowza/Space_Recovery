import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  Building2,
  MapPin,
  Phone,
  Globe,
  Palette,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Save,
} from 'lucide-react';

interface CompanySettings {
  id: number;
  basic_info: Record<string, string | number | boolean | null>;
  location: Record<string, string | number | boolean | null>;
  contact_info: Record<string, string | number | boolean | null>;
  branding: Record<string, string | number | boolean | null>;
  online_presence: Record<string, string | number | boolean | null>;
  business_hours: Record<string, string | number | boolean | null>;
  company_profile: Record<string, string | number | boolean | null>;
  legal_compliance: Record<string, string | number | boolean | null>;
  financial_settings: Record<string, string | number | boolean | null>;
  banking_info: Record<string, string | number | boolean | null>;
}

type SectionId =
  | 'basic'
  | 'location'
  | 'contact'
  | 'branding'
  | 'online'
  | 'hours'
  | 'profile'
  | 'legal'
  | 'financial'
  | 'banking';

const FormField = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  fullWidth = false,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: string;
  fullWidth?: boolean;
}) => (
  <div className={fullWidth ? 'md:col-span-2' : ''}>
    <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
    <Input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full"
    />
  </div>
);

export const GeneralSettingsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [expandedSections, setExpandedSections] = useState<Set<SectionId>>(new Set(['basic']));
  const [formData, setFormData] = useState<Partial<CompanySettings> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['company_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (error) throw error;
      return data as CompanySettings;
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<CompanySettings>) => {
      // Refresh session to ensure we have a valid, non-expired token
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError) {
        console.error('Session refresh error:', refreshError);
        // Try to get existing session as fallback
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (!existingSession) {
          throw new Error('Authentication session expired. Please log out and log in again.');
        }
      }

      if (!session) {
        throw new Error('You are not authenticated. Please log in again.');
      }

      // Verify user has admin role
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        throw new Error('Failed to verify user permissions');
      }

      if (!userProfile) {
        throw new Error('User profile not found. Please contact your administrator.');
      }

      if (userProfile.role !== 'admin') {
        throw new Error('You do not have permission to update settings. Admin role required.');
      }

      if (!userProfile.is_active) {
        throw new Error('Your account is inactive. Please contact your administrator.');
      }

      const { data, error } = await supabase
        .from('company_settings')
        .update(updates)
        .eq('id', 1)
        .select();

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }

      // Check if update actually affected any rows
      if (!data || data.length === 0) {
        console.error('Update returned empty array - RLS policy may have blocked the update');
        throw new Error('Failed to save: Permission denied or record not found. Please refresh and try again.');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company_settings'] });
      setIsSaving(false);
    },
  });

  const toggleSection = (section: SectionId) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const updateField = (section: string, field: string, value: string | number | boolean | null) => {
    if (!formData) return;
    setFormData({
      ...formData,
      [section]: {
        ...formData[section as keyof CompanySettings],
        [field]: value,
      },
    });
  };

  const handleSave = async () => {
    if (!formData) return;
    setIsSaving(true);
    updateMutation.mutate(formData);
  };

  const Section = ({ id, title, icon: Icon, children }: { id: SectionId; title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) => {
    const isExpanded = expandedSections.has(id);
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <button
          onClick={() => toggleSection(id)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Icon className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>
        {isExpanded && (
          <div className="px-6 py-6 border-t border-slate-200 bg-slate-50/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {children}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading || !formData) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 mt-4">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2"
          style={{ backgroundColor: '#6366f1' }}
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="space-y-4">
        <Section id="basic" title="Basic Information" icon={Building2}>
          <FormField
            label="Company Name"
            value={formData.basic_info?.company_name}
            onChange={(val: string) => updateField('basic_info', 'company_name', val)}
            placeholder="xSuite Data Recovery"
          />
          <FormField
            label="Legal Name"
            value={formData.basic_info?.legal_name}
            onChange={(val: string) => updateField('basic_info', 'legal_name', val)}
            placeholder="xSuite Data Recovery LLC"
          />
          <FormField
            label="Business Type"
            value={formData.basic_info?.business_type}
            onChange={(val: string) => updateField('basic_info', 'business_type', val)}
            placeholder="Limited Liability Company"
          />
          <FormField
            label="Registration Number"
            value={formData.basic_info?.registration_number}
            onChange={(val: string) => updateField('basic_info', 'registration_number', val)}
            placeholder="CR-123456"
          />
          <FormField
            label="Tax ID / TIN"
            value={formData.basic_info?.tax_id}
            onChange={(val: string) => updateField('basic_info', 'tax_id', val)}
            placeholder="1234567890"
          />
          <FormField
            label="VAT Number"
            value={formData.basic_info?.vat_number}
            onChange={(val: string) => updateField('basic_info', 'vat_number', val)}
            placeholder="OM1234567890"
          />
          <FormField
            label="License Number"
            value={formData.basic_info?.license_number}
            onChange={(val: string) => updateField('basic_info', 'license_number', val)}
            placeholder="LIC-2024-001"
          />
          <FormField
            label="Industry"
            value={formData.basic_info?.industry}
            onChange={(val: string) => updateField('basic_info', 'industry', val)}
            placeholder="Data Recovery & IT Services"
          />
        </Section>

        <Section id="location" title="Location & Address" icon={MapPin}>
          <FormField
            label="Building Name"
            value={formData.location?.building_name}
            onChange={(val: string) => updateField('location', 'building_name', val)}
            placeholder="Technology Business Center"
          />
          <FormField
            label="Unit / Floor"
            value={formData.location?.unit_number}
            onChange={(val: string) => updateField('location', 'unit_number', val)}
            placeholder="Floor 3, Unit 301"
          />
          <FormField
            label="Address Line 1"
            value={formData.location?.address_line1}
            onChange={(val: string) => updateField('location', 'address_line1', val)}
            placeholder="Street address"
            fullWidth
          />
          <FormField
            label="Address Line 2"
            value={formData.location?.address_line2}
            onChange={(val: string) => updateField('location', 'address_line2', val)}
            placeholder="Apartment, suite, etc. (optional)"
            fullWidth
          />
          <FormField
            label="City"
            value={formData.location?.city}
            onChange={(val: string) => updateField('location', 'city', val)}
            placeholder="Muscat"
          />
          <FormField
            label="State / Province"
            value={formData.location?.state}
            onChange={(val: string) => updateField('location', 'state', val)}
            placeholder="Muscat Governorate"
          />
          <FormField
            label="Postal Code"
            value={formData.location?.postal_code}
            onChange={(val: string) => updateField('location', 'postal_code', val)}
            placeholder="100"
          />
          <FormField
            label="Country"
            value={formData.location?.country}
            onChange={(val: string) => updateField('location', 'country', val)}
            placeholder="Oman"
          />
          <FormField
            label="Google Maps URL"
            value={formData.location?.google_maps_url}
            onChange={(val: string) => updateField('location', 'google_maps_url', val)}
            placeholder="https://goo.gl/maps/..."
            fullWidth
          />
        </Section>

        <Section id="contact" title="Contact Information" icon={Phone}>
          <FormField
            label="Primary Phone"
            value={formData.contact_info?.phone_primary}
            onChange={(val: string) => updateField('contact_info', 'phone_primary', val)}
            placeholder="+968 1234 5678"
          />
          <FormField
            label="Secondary Phone"
            value={formData.contact_info?.phone_secondary}
            onChange={(val: string) => updateField('contact_info', 'phone_secondary', val)}
            placeholder="+968 8765 4321"
          />
          <FormField
            label="Support Phone"
            value={formData.contact_info?.phone_support}
            onChange={(val: string) => updateField('contact_info', 'phone_support', val)}
            placeholder="+968 9999 9999"
          />
          <FormField
            label="Sales Phone"
            value={formData.contact_info?.phone_sales}
            onChange={(val: string) => updateField('contact_info', 'phone_sales', val)}
            placeholder="+968 8888 8888"
          />
          <FormField
            label="Fax"
            value={formData.contact_info?.fax}
            onChange={(val: string) => updateField('contact_info', 'fax', val)}
            placeholder="+968 1234 5679"
          />
          <FormField
            label="WhatsApp Business"
            value={formData.contact_info?.whatsapp_business}
            onChange={(val: string) => updateField('contact_info', 'whatsapp_business', val)}
            placeholder="+968 9000 0000"
          />
          <FormField
            label="General Email"
            value={formData.contact_info?.email_general}
            onChange={(val: string) => updateField('contact_info', 'email_general', val)}
            placeholder="info@xsuite.com"
            type="email"
          />
          <FormField
            label="Support Email"
            value={formData.contact_info?.email_support}
            onChange={(val: string) => updateField('contact_info', 'email_support', val)}
            placeholder="support@xsuite.com"
            type="email"
          />
          <FormField
            label="Sales Email"
            value={formData.contact_info?.email_sales}
            onChange={(val: string) => updateField('contact_info', 'email_sales', val)}
            placeholder="sales@xsuite.com"
            type="email"
          />
          <FormField
            label="Technical Email"
            value={formData.contact_info?.email_technical}
            onChange={(val: string) => updateField('contact_info', 'email_technical', val)}
            placeholder="technical@xsuite.com"
            type="email"
          />
        </Section>

        <Section id="branding" title="Branding & Visual Identity" icon={Palette}>
          <FormField
            label="Logo URL"
            value={formData.branding?.logo_url}
            onChange={(val: string) => updateField('branding', 'logo_url', val)}
            placeholder="https://example.com/logo.png"
            fullWidth
          />
          <FormField
            label="Primary Brand Color"
            value={formData.branding?.primary_color}
            onChange={(val: string) => updateField('branding', 'primary_color', val)}
            placeholder="#3b82f6"
            type="color"
          />
          <FormField
            label="Secondary Brand Color"
            value={formData.branding?.secondary_color}
            onChange={(val: string) => updateField('branding', 'secondary_color', val)}
            placeholder="#10b981"
            type="color"
          />
          <FormField
            label="Brand Tagline"
            value={formData.branding?.brand_tagline}
            onChange={(val: string) => updateField('branding', 'brand_tagline', val)}
            placeholder="Your Data, Our Priority"
            fullWidth
          />
        </Section>

        <Section id="online" title="Online Presence & Social Media" icon={Globe}>
          <FormField
            label="Website"
            value={formData.online_presence?.website}
            onChange={(val: string) => updateField('online_presence', 'website', val)}
            placeholder="https://xsuite.com"
            fullWidth
          />
          <FormField
            label="Facebook"
            value={formData.online_presence?.facebook}
            onChange={(val: string) => updateField('online_presence', 'facebook', val)}
            placeholder="https://facebook.com/xsuite"
          />
          <FormField
            label="Twitter / X"
            value={formData.online_presence?.twitter}
            onChange={(val: string) => updateField('online_presence', 'twitter', val)}
            placeholder="https://twitter.com/xsuite"
          />
          <FormField
            label="LinkedIn"
            value={formData.online_presence?.linkedin}
            onChange={(val: string) => updateField('online_presence', 'linkedin', val)}
            placeholder="https://linkedin.com/company/xsuite"
          />
          <FormField
            label="Instagram"
            value={formData.online_presence?.instagram}
            onChange={(val: string) => updateField('online_presence', 'instagram', val)}
            placeholder="https://instagram.com/xsuite"
          />
          <FormField
            label="YouTube"
            value={formData.online_presence?.youtube}
            onChange={(val: string) => updateField('online_presence', 'youtube', val)}
            placeholder="https://youtube.com/@xsuite"
          />
        </Section>

        <Section id="financial" title="Financial Settings" icon={DollarSign}>
          <FormField
            label="Default Currency"
            value={formData.financial_settings?.default_currency}
            onChange={(val: string) => updateField('financial_settings', 'default_currency', val)}
            placeholder="OMR"
          />
          <FormField
            label="Currency Symbol"
            value={formData.financial_settings?.currency_symbol}
            onChange={(val: string) => updateField('financial_settings', 'currency_symbol', val)}
            placeholder="ر.ع."
          />
          <FormField
            label="Tax Rate (%)"
            value={formData.financial_settings?.tax_rate}
            onChange={(val: string) => updateField('financial_settings', 'tax_rate', parseFloat(val) || 0)}
            placeholder="5"
            type="number"
          />
          <FormField
            label="Tax Label"
            value={formData.financial_settings?.tax_label}
            onChange={(val: string) => updateField('financial_settings', 'tax_label', val)}
            placeholder="VAT"
          />
          <FormField
            label="Invoice Due Days"
            value={formData.financial_settings?.invoice_due_days}
            onChange={(val: string) => updateField('financial_settings', 'invoice_due_days', parseInt(val) || 30)}
            placeholder="30"
            type="number"
          />
          <FormField
            label="Quote Validity Days"
            value={formData.financial_settings?.quote_validity_days}
            onChange={(val: string) => updateField('financial_settings', 'quote_validity_days', parseInt(val) || 30)}
            placeholder="30"
            type="number"
          />
        </Section>

        <Section id="banking" title="Banking Information" icon={DollarSign}>
          <FormField
            label="Bank Name"
            value={formData.banking_info?.bank_name}
            onChange={(val: string) => updateField('banking_info', 'bank_name', val)}
            placeholder="National Bank of Oman"
          />
          <FormField
            label="Account Name"
            value={formData.banking_info?.account_name}
            onChange={(val: string) => updateField('banking_info', 'account_name', val)}
            placeholder="xSuite Data Recovery LLC"
          />
          <FormField
            label="Account Number"
            value={formData.banking_info?.account_number}
            onChange={(val: string) => updateField('banking_info', 'account_number', val)}
            placeholder="1234567890"
          />
          <FormField
            label="IBAN"
            value={formData.banking_info?.iban}
            onChange={(val: string) => updateField('banking_info', 'iban', val)}
            placeholder="OM12345678901234567890"
          />
          <FormField
            label="SWIFT / BIC Code"
            value={formData.banking_info?.swift_code}
            onChange={(val: string) => updateField('banking_info', 'swift_code', val)}
            placeholder="NBOBOMRXXXX"
          />
          <FormField
            label="Bank Branch"
            value={formData.banking_info?.bank_branch}
            onChange={(val: string) => updateField('banking_info', 'bank_branch', val)}
            placeholder="Main Branch, Muscat"
          />
        </Section>
      </div>

      <div className="mt-8 flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-8 py-3"
          style={{ backgroundColor: '#6366f1' }}
        >
          <Save className="w-5 h-5" />
          {isSaving ? 'Saving Changes...' : 'Save All Changes'}
        </Button>
      </div>
    </div>
  );
};
