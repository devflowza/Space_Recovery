import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { uploadLogo, uploadQRCode, deleteLogo, deleteQRCode } from '../../lib/fileStorageService';
import { SUPPORTED_LANGUAGES, type LanguageCode } from '../../lib/documentTranslations';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ImageUpload } from '../../components/ui/ImageUpload';
import { CollapsibleSection } from '../../components/ui/CollapsibleSection';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { useToast } from '../../hooks/useToast';
import { logger } from '../../lib/logger';
import {
  Building2,
  MapPin,
  Phone,
  Globe,
  Palette,
  Save,
  ChevronLeft,
  CheckCircle2,
  Upload as UploadIcon,
  Shield,
  Maximize2,
  Minimize2,
  HardDrive,
  AlertCircle,
  Languages,
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
  localization?: {
    document_language_settings?: {
      mode: 'english_only' | 'bilingual';
      secondary_language: LanguageCode | null;
      language_name: string | null;
    };
  };
  clone_defaults?: {
    default_retention_days?: number;
    min_retention_days?: number;
    max_retention_days?: number;
  };
}

interface Country {
  id: string;
  name: string;
  is_active: boolean;
}

const FormField = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  helpText,
  fullWidth = false,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: string;
  helpText?: string;
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
    {helpText && <p className="text-xs text-slate-500 mt-1">{helpText}</p>}
  </div>
);

export const GeneralSettings: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [formData, setFormData] = useState<Partial<CompanySettings> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [openSections, setOpenSections] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('generalSettings_openSections');
    return saved ? new Set(JSON.parse(saved)) : new Set(['basic_info']);
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['company_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as CompanySettings;
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

  useEffect(() => {
    if (!isLoading) {
      const defaults: Partial<CompanySettings> = {
        basic_info: {},
        location: {},
        contact_info: {},
        branding: {},
        online_presence: {},
        legal_compliance: {},
        banking_info: {},
        clone_defaults: {
          default_retention_days: 180,
          min_retention_days: 1,
          max_retention_days: 3650,
        },
        localization: {
          document_language_settings: {
            mode: 'english_only',
            secondary_language: null,
            language_name: null,
          },
        },
      };

      if (settings) {
        const settingsWithDefaults = {
          ...defaults,
          ...settings,
          clone_defaults: settings.clone_defaults || defaults.clone_defaults,
          localization: settings.localization || defaults.localization,
        };
        setFormData(settingsWithDefaults);
      } else {
        setFormData(defaults);
      }
      setHasUnsavedChanges(false);
    }
  }, [settings, isLoading]);

  // Warn user before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    localStorage.setItem('generalSettings_openSections', JSON.stringify([...openSections]));
  }, [openSections]);

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setOpenSections(
      new Set([
        'basic_info',
        'location',
        'contact_info',
        'online_presence',
        'legal_compliance',
        'branding',
        'document_language',
        'clone_defaults',
      ])
    );
  };

  const collapseAll = () => {
    setOpenSections(new Set());
  };

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<CompanySettings>) => {
      // Refresh session to ensure we have a valid, non-expired token
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError) {
        logger.error('Session refresh error:', refreshError);
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
        logger.error('Profile fetch error:', profileError);
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

      // Try update first
      const { data: updateData, error: updateError } = await supabase
        .from('company_settings')
        .update(updates)
        .not('id', 'is', null)
        .select();

      if (updateError) {
        logger.error('Supabase update error:', updateError);
        throw updateError;
      }

      // If update affected rows, we're done
      if (updateData && updateData.length > 0) {
        return updateData;
      }

      // No row exists yet — insert a new one with tenant_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', session.user.id)
        .maybeSingle();

      const { data: insertData, error: insertError } = await supabase
        .from('company_settings')
        .insert({ ...updates, tenant_id: profile?.tenant_id } as any)
        .select();

      if (insertError) {
        logger.error('Supabase insert error:', insertError);
        throw insertError;
      }

      return insertData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company_settings'] });
      setIsSaving(false);
      setHasUnsavedChanges(false);
      setLastSavedAt(new Date());
      toast.success('Settings saved successfully');
    },
    onError: (error) => {
      logger.error('Update mutation error:', error);
      setIsSaving(false);
      toast.error(`Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const updateField = (section: string, field: string, value: string | number | boolean | null) => {
    if (!formData) return;
    setFormData({
      ...formData,
      [section]: {
        ...formData[section as keyof CompanySettings],
        [field]: value,
      },
    });
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (!formData) return;

    // Validate clone retention settings
    if (formData.clone_defaults) {
      const { default_retention_days = 180, min_retention_days = 1, max_retention_days = 3650 } = formData.clone_defaults;

      if (min_retention_days > max_retention_days) {
        alert('Minimum retention period cannot be greater than maximum retention period.');
        return;
      }

      if (default_retention_days < min_retention_days || default_retention_days > max_retention_days) {
        alert(`Default retention period must be between ${min_retention_days} and ${max_retention_days} days.`);
        return;
      }
    }

    setIsSaving(true);
    updateMutation.mutate(formData);
  };

  const handleLogoUpload = async (
    file: File | null,
    previewUrl: string | null,
    type: 'primary' | 'light' | 'favicon'
  ) => {
    if (!file || !formData) return;

    const uploadKey = `logo_${type}`;
    setUploadingFiles(prev => new Set(prev).add(uploadKey));

    try {
      const oldFilePath =
        type === 'primary'
          ? formData.branding?.logo_file_path
          : type === 'light'
          ? formData.branding?.logo_light_file_path
          : formData.branding?.favicon_file_path;

      if (oldFilePath) {
        await deleteLogo(oldFilePath);
      }

      const result = await uploadLogo(file, type);

      if (result.success && result.filePath && result.publicUrl) {
        const urlField =
          type === 'primary' ? 'logo_url' : type === 'light' ? 'logo_light_url' : 'favicon_url';
        const pathField =
          type === 'primary'
            ? 'logo_file_path'
            : type === 'light'
            ? 'logo_light_file_path'
            : 'favicon_file_path';

        const updatedBranding = {
          ...formData.branding,
          [urlField]: result.publicUrl,
          [pathField]: result.filePath,
          logo_metadata: {
            ...formData.branding?.logo_metadata,
            width: result.metadata?.width,
            height: result.metadata?.height,
            size_bytes: result.metadata?.size,
            format: result.metadata?.format,
            uploaded_at: new Date().toISOString(),
          },
        };

        setFormData({
          ...formData,
          branding: updatedBranding,
        });

        await supabase
          .from('company_settings')
          .update({ branding: updatedBranding })
          .not('id', 'is', null);

        queryClient.invalidateQueries({ queryKey: ['company_settings'] });
      }
    } catch (error) {
      logger.error('Logo upload error:', error);
    } finally {
      setUploadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(uploadKey);
        return newSet;
      });
    }
  };

  const handleQRCodeUpload = async (
    file: File | null,
    previewUrl: string | null,
    type: 'invoice' | 'quote' | 'label' | 'general'
  ) => {
    if (!file || !formData) return;

    const uploadKey = `qr_${type}`;
    setUploadingFiles(prev => new Set(prev).add(uploadKey));

    try {
      const oldFilePath = formData.branding?.[`qr_code_${type}_file_path`];

      if (oldFilePath) {
        await deleteQRCode(oldFilePath);
      }

      const result = await uploadQRCode(file, type);

      if (result.success && result.filePath && result.publicUrl) {
        const updatedBranding = {
          ...formData.branding,
          [`qr_code_${type}_url`]: result.publicUrl,
          [`qr_code_${type}_file_path`]: result.filePath,
          qr_metadata: {
            ...formData.branding?.qr_metadata,
            [type]: {
              uploaded_at: new Date().toISOString(),
              size_bytes: result.metadata?.size,
            },
          },
        };

        setFormData({
          ...formData,
          branding: updatedBranding,
        });

        await supabase
          .from('company_settings')
          .update({ branding: updatedBranding })
          .not('id', 'is', null);

        queryClient.invalidateQueries({ queryKey: ['company_settings'] });
      }
    } catch (error) {
      logger.error('QR code upload error:', error);
    } finally {
      setUploadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(uploadKey);
        return newSet;
      });
    }
  };


  if (isLoading || !formData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="inline-block w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-slate-500 mt-4">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm(
        'You have unsaved changes. Are you sure you want to leave? All unsaved changes will be lost.'
      );
      if (!confirmLeave) return;
    }
    navigate('/settings');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <button
        onClick={handleBackClick}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-all hover:gap-3 font-medium"
      >
        <ChevronLeft className="w-5 h-5" />
        <span>Back to Settings</span>
      </button>

      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-start gap-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
            }}
          >
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-slate-900">General Settings</h1>
              {hasUnsavedChanges && (
                <span className="px-3 py-1 bg-amber-100 text-amber-800 text-sm font-semibold rounded-full border border-amber-300 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  Unsaved Changes
                </span>
              )}
            </div>
            <p className="text-slate-600 text-base">
              Configure company information, branding assets, and business details
            </p>
            {lastSavedAt && (
              <p className="text-slate-500 text-sm mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Last saved at {lastSavedAt.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-blue-900 mb-1">
              Important: Save Your Changes
            </h4>
            <p className="text-sm text-blue-800">
              Form field changes (text inputs, colors, etc.) are only saved when you click the "Save Changes" button.
              Uploaded files (logos, QR codes) are saved immediately upon upload.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6 flex justify-between items-center gap-3">
        <div className="flex gap-2">
          <Button
            onClick={expandAll}
            variant="outline"
            className="flex items-center gap-2 text-sm"
          >
            <Maximize2 className="w-4 h-4" />
            Expand All
          </Button>
          <Button
            onClick={collapseAll}
            variant="outline"
            className="flex items-center gap-2 text-sm"
          >
            <Minimize2 className="w-4 h-4" />
            Collapse All
          </Button>
        </div>
        <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasUnsavedChanges}
          className="flex items-center gap-2 shadow-md hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: hasUnsavedChanges
              ? 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)'
              : 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
          }}
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'No Changes'}
        </Button>
        </div>
      </div>

      <div className="space-y-4">
        <CollapsibleSection
          title="Basic Information"
          icon={Building2}
          color="#0ea5e9"
          fieldCount={8}
          isOpen={openSections.has('basic_info')}
          onToggle={() => toggleSection('basic_info')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Company Name"
              value={formData.basic_info?.company_name}
              onChange={(val: string) => updateField('basic_info', 'company_name', val)}
              placeholder="xSuite Data Recovery"
              helpText="Your company's trading name"
            />
            <FormField
              label="Legal Name"
              value={formData.basic_info?.legal_name}
              onChange={(val: string) => updateField('basic_info', 'legal_name', val)}
              placeholder="xSuite Data Recovery LLC"
              helpText="Official registered business name"
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
              helpText="Commercial registration number"
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
              helpText="Professional license or permit number"
            />
            <FormField
              label="Industry"
              value={formData.basic_info?.industry}
              onChange={(val: string) => updateField('basic_info', 'industry', val)}
              placeholder="Data Recovery & IT Services"
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Location & Address"
          icon={MapPin}
          color="#10b981"
          fieldCount={9}
          isOpen={openSections.has('location')}
          onToggle={() => toggleSection('location')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <SearchableSelect
              label="Default Country"
              value={formData.location?.default_country_id || ''}
              onChange={(value) => updateField('location', 'default_country_id', value)}
              options={countries.map((c) => ({ id: c.id, name: c.name }))}
              placeholder="Select Default Country"
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
              helpText="Link to your location on Google Maps"
              fullWidth
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Contact Information"
          icon={Phone}
          color="#f59e0b"
          fieldCount={10}
          isOpen={openSections.has('contact_info')}
          onToggle={() => toggleSection('contact_info')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Primary Phone"
              value={formData.contact_info?.phone_primary}
              onChange={(val: string) => updateField('contact_info', 'phone_primary', val)}
              placeholder="+968 1234 5678"
              helpText="Main contact number"
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
              helpText="Technical support hotline"
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
              placeholder="info@xsuite.space"
              type="email"
              helpText="Main contact email"
            />
            <FormField
              label="Support Email"
              value={formData.contact_info?.email_support}
              onChange={(val: string) => updateField('contact_info', 'email_support', val)}
              placeholder="support@xsuite.space"
              type="email"
            />
            <FormField
              label="Sales Email"
              value={formData.contact_info?.email_sales}
              onChange={(val: string) => updateField('contact_info', 'email_sales', val)}
              placeholder="sales@xsuite.space"
              type="email"
            />
            <FormField
              label="Technical Email"
              value={formData.contact_info?.email_technical}
              onChange={(val: string) => updateField('contact_info', 'email_technical', val)}
              placeholder="technical@xsuite.space"
              type="email"
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Online Presence"
          icon={Globe}
          color="#14b8a6"
          fieldCount={6}
          isOpen={openSections.has('online_presence')}
          onToggle={() => toggleSection('online_presence')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Website"
              value={formData.online_presence?.website}
              onChange={(val: string) => updateField('online_presence', 'website', val)}
              placeholder="https://xsuite.space"
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
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Legal & Compliance"
          icon={Shield}
          color="#8b5cf6"
          fieldCount={5}
          isOpen={openSections.has('legal_compliance')}
          onToggle={() => toggleSection('legal_compliance')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Privacy Policy URL"
              value={formData.legal_compliance?.privacy_policy_url}
              onChange={(val: string) => updateField('legal_compliance', 'privacy_policy_url', val)}
              placeholder="https://xsuite.space/privacy-policy"
              type="url"
              helpText="Link to your privacy policy document"
            />
            <FormField
              label="Terms & Conditions URL"
              value={formData.legal_compliance?.terms_conditions_url}
              onChange={(val: string) => updateField('legal_compliance', 'terms_conditions_url', val)}
              placeholder="https://xsuite.space/terms-and-conditions"
              type="url"
              helpText="Link to your terms and conditions"
            />
            <FormField
              label="Data Protection Policy URL"
              value={formData.legal_compliance?.data_protection_policy_url}
              onChange={(val: string) => updateField('legal_compliance', 'data_protection_policy_url', val)}
              placeholder="https://xsuite.space/data-protection"
              type="url"
              helpText="Link to your data protection policy"
            />
            <FormField
              label="Refund Policy URL"
              value={formData.legal_compliance?.refund_policy_url}
              onChange={(val: string) => updateField('legal_compliance', 'refund_policy_url', val)}
              placeholder="https://xsuite.space/refund-policy"
              type="url"
              helpText="Link to your refund policy (optional)"
            />
            <FormField
              label="SLA Document URL"
              value={formData.legal_compliance?.sla_document_url}
              onChange={(val: string) => updateField('legal_compliance', 'sla_document_url', val)}
              placeholder="https://xsuite.space/sla"
              type="url"
              helpText="Link to your service level agreement (optional)"
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Branding & Visual Identity"
          icon={Palette}
          color="#ec4899"
          isOpen={openSections.has('branding')}
          onToggle={() => toggleSection('branding')}
        >
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <UploadIcon className="w-4 h-4" />
                Company Logos
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ImageUpload
                  value={formData.branding?.logo_url}
                  onChange={(file, previewUrl) => handleLogoUpload(file, previewUrl, 'primary')}
                  label="Primary Logo"
                  description="Main logo for documents and web"
                  recommendedDimensions="800 × 400px"
                  maxSizeMB={5}
                  bucketName="company-assets"
                />
                <ImageUpload
                  value={formData.branding?.logo_light_url}
                  onChange={(file, previewUrl) => handleLogoUpload(file, previewUrl, 'light')}
                  label="Light Logo"
                  description="For dark backgrounds"
                  recommendedDimensions="800 × 400px"
                  maxSizeMB={5}
                  bucketName="company-assets"
                />
                <ImageUpload
                  value={formData.branding?.favicon_url}
                  onChange={(file, previewUrl) => handleLogoUpload(file, previewUrl, 'favicon')}
                  label="Favicon"
                  description="Browser tab icon"
                  recommendedDimensions="64 × 64px"
                  maxSizeMB={1}
                  bucketName="company-assets"
                />
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <UploadIcon className="w-4 h-4" />
                QR Codes
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-3">
                  <ImageUpload
                    value={formData.branding?.qr_code_invoice_url}
                    onChange={(file, previewUrl) => handleQRCodeUpload(file, previewUrl, 'invoice')}
                    label="Invoice QR"
                    description="For invoice payments"
                    recommendedDimensions="300 × 300px"
                    maxSizeMB={2}
                    bucketName="company-qrcodes"
                  />
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      QR Code Caption
                    </label>
                    <Input
                      value={formData.branding?.qr_code_invoice_caption || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.length <= 150) {
                          updateField('branding', 'qr_code_invoice_caption', val);
                        }
                      }}
                      placeholder="Scan to pay this invoice"
                      className="w-full"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {(formData.branding?.qr_code_invoice_caption || '').length}/150 characters
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <ImageUpload
                    value={formData.branding?.qr_code_quote_url}
                    onChange={(file, previewUrl) => handleQRCodeUpload(file, previewUrl, 'quote')}
                    label="Quote QR"
                    description="For quote approvals"
                    recommendedDimensions="300 × 300px"
                    maxSizeMB={2}
                    bucketName="company-qrcodes"
                  />
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      QR Code Caption
                    </label>
                    <Input
                      value={formData.branding?.qr_code_quote_caption || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.length <= 150) {
                          updateField('branding', 'qr_code_quote_caption', val);
                        }
                      }}
                      placeholder="Scan to approve this quote"
                      className="w-full"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {(formData.branding?.qr_code_quote_caption || '').length}/150 characters
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <ImageUpload
                    value={formData.branding?.qr_code_label_url}
                    onChange={(file, previewUrl) => handleQRCodeUpload(file, previewUrl, 'label')}
                    label="Label QR"
                    description="For case labels"
                    recommendedDimensions="300 × 300px"
                    maxSizeMB={2}
                    bucketName="company-qrcodes"
                  />
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      QR Code Caption
                    </label>
                    <Input
                      value={formData.branding?.qr_code_label_caption || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.length <= 150) {
                          updateField('branding', 'qr_code_label_caption', val);
                        }
                      }}
                      placeholder="Scan to track your case"
                      className="w-full"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {(formData.branding?.qr_code_label_caption || '').length}/150 characters
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <ImageUpload
                    value={formData.branding?.qr_code_general_url}
                    onChange={(file, previewUrl) => handleQRCodeUpload(file, previewUrl, 'general')}
                    label="General QR"
                    description="Multi-purpose QR"
                    recommendedDimensions="300 × 300px"
                    maxSizeMB={2}
                    bucketName="company-qrcodes"
                  />
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      QR Code Caption
                    </label>
                    <Input
                      value={formData.branding?.qr_code_general_caption || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.length <= 150) {
                          updateField('branding', 'qr_code_general_caption', val);
                        }
                      }}
                      placeholder="Scan for more information"
                      className="w-full"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {(formData.branding?.qr_code_general_caption || '').length}/150 characters
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-4">Brand Colors</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Primary Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.branding?.primary_color || '#0ea5e9'}
                      onChange={(e) => updateField('branding', 'primary_color', e.target.value)}
                      className="w-16 h-10 rounded-lg border border-slate-300 cursor-pointer"
                    />
                    <Input
                      value={formData.branding?.primary_color || '#0ea5e9'}
                      onChange={(e) => updateField('branding', 'primary_color', e.target.value)}
                      placeholder="#0ea5e9"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Secondary Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.branding?.secondary_color || '#10b981'}
                      onChange={(e) => updateField('branding', 'secondary_color', e.target.value)}
                      className="w-16 h-10 rounded-lg border border-slate-300 cursor-pointer"
                    />
                    <Input
                      value={formData.branding?.secondary_color || '#10b981'}
                      onChange={(e) => updateField('branding', 'secondary_color', e.target.value)}
                      placeholder="#10b981"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Accent Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.branding?.accent_color || '#f59e0b'}
                      onChange={(e) => updateField('branding', 'accent_color', e.target.value)}
                      className="w-16 h-10 rounded-lg border border-slate-300 cursor-pointer"
                    />
                    <Input
                      value={formData.branding?.accent_color || '#f59e0b'}
                      onChange={(e) => updateField('branding', 'accent_color', e.target.value)}
                      placeholder="#f59e0b"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            <FormField
              label="Brand Tagline"
              value={formData.branding?.brand_tagline}
              onChange={(val: string) => updateField('branding', 'brand_tagline', val)}
              placeholder="Your Data, Our Priority"
              helpText="Short memorable phrase that represents your company"
            />
        </CollapsibleSection>

        <CollapsibleSection
          title="Document Language Settings"
          icon={Languages}
          color="#06b6d4"
          fieldCount={1}
          isOpen={openSections.has('document_language')}
          onToggle={() => toggleSection('document_language')}
        >
          <div className="space-y-4">
            <div className="bg-cyan-50 border-l-4 border-cyan-500 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Languages className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-cyan-900 mb-1">
                    Multi-Language Support for Documents
                  </h4>
                  <p className="text-sm text-cyan-800">
                    Configure language settings for printed documents including receipts, quotes, and invoices.
                    When bilingual mode is enabled, document headings and labels will appear in both English
                    and your selected secondary language. Content and descriptions remain in English.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Document Language Mode
              </label>
              <select
                value={
                  formData.localization?.document_language_settings?.secondary_language || 'none'
                }
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'none') {
                    updateField('localization', 'document_language_settings', {
                      mode: 'english_only',
                      secondary_language: null,
                      language_name: null,
                    });
                  } else {
                    const selectedLang = SUPPORTED_LANGUAGES.find(
                      (lang) => lang.code === value
                    );
                    updateField('localization', 'document_language_settings', {
                      mode: 'bilingual',
                      secondary_language: value,
                      language_name: selectedLang?.name || null,
                    });
                  }
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code || 'none'} value={lang.code || 'none'}>
                    {lang.displayName}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Select the language combination for your documents
              </p>
            </div>

            {formData.localization?.document_language_settings?.mode === 'bilingual' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Preview Example</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                    <span className="font-medium text-blue-900">
                      QUOTATION | {
                        formData.localization.document_language_settings.secondary_language === 'ar'
                          ? 'عرض سعر'
                          : formData.localization.document_language_settings.secondary_language === 'pl'
                          ? 'Oferta'
                          : formData.localization.document_language_settings.secondary_language === 'ru'
                          ? 'Коммерческое Предложение'
                          : formData.localization.document_language_settings.secondary_language === 'fr'
                          ? 'Devis'
                          : formData.localization.document_language_settings.secondary_language === 'de'
                          ? 'Angebot'
                          : formData.localization.document_language_settings.secondary_language === 'it'
                          ? 'Preventivo'
                          : formData.localization.document_language_settings.secondary_language === 'es'
                          ? 'Cotización'
                          : formData.localization.document_language_settings.secondary_language === 'tr'
                          ? 'Teklif'
                          : formData.localization.document_language_settings.secondary_language === 'ko'
                          ? '견적서'
                          : formData.localization.document_language_settings.secondary_language === 'pt'
                          ? 'Orçamento'
                          : formData.localization.document_language_settings.secondary_language === 'uk'
                          ? 'Комерційна Пропозиція'
                          : formData.localization.document_language_settings.secondary_language === 'cs'
                          ? 'Nabídka'
                          : formData.localization.document_language_settings.secondary_language === 'th'
                          ? 'ใบเสนอราคา'
                          : 'Translation'
                      }
                    </span>
                  </div>
                  <div className="text-blue-800">
                    <span className="font-medium">Customer Information</span> | {
                      formData.localization.document_language_settings.secondary_language === 'ar'
                        ? 'معلومات العميل'
                        : formData.localization.document_language_settings.secondary_language === 'pl'
                        ? 'Informacje o Kliencie'
                        : formData.localization.document_language_settings.secondary_language === 'ru'
                        ? 'Информация о Клиенте'
                        : formData.localization.document_language_settings.secondary_language === 'fr'
                        ? 'Informations Client'
                        : formData.localization.document_language_settings.secondary_language === 'de'
                        ? 'Kundeninformationen'
                        : formData.localization.document_language_settings.secondary_language === 'it'
                        ? 'Informazioni Cliente'
                        : formData.localization.document_language_settings.secondary_language === 'es'
                        ? 'Información del Cliente'
                        : formData.localization.document_language_settings.secondary_language === 'tr'
                        ? 'Müşteri Bilgileri'
                        : formData.localization.document_language_settings.secondary_language === 'ko'
                        ? '고객 정보'
                        : formData.localization.document_language_settings.secondary_language === 'pt'
                        ? 'Informações do Cliente'
                        : formData.localization.document_language_settings.secondary_language === 'uk'
                        ? 'Інформація про Клієнта'
                        : formData.localization.document_language_settings.secondary_language === 'cs'
                        ? 'Informace o Zákazníkovi'
                        : formData.localization.document_language_settings.secondary_language === 'th'
                        ? 'ข้อมูลลูกค้า'
                        : 'Translation'
                    }
                  </div>
                  <p className="text-xs text-blue-700 mt-3 italic">
                    Only headings, labels, and field names will be displayed in both languages.
                    All content, descriptions, and customer data will remain in English.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Clone Drive Defaults"
          icon={HardDrive}
          color="#8b5cf6"
          fieldCount={3}
          isOpen={openSections.has('clone_defaults')}
          onToggle={() => toggleSection('clone_defaults')}
        >
          <div className="space-y-4">
            <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <HardDrive className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-blue-900 mb-1">
                    Clone Drive Retention Settings
                  </h4>
                  <p className="text-sm text-blue-800">
                    Configure default retention periods for clone drives. These settings will be automatically
                    applied when creating new clone records, but can be adjusted on a per-clone basis.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Default Retention Period (Days)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="3650"
                  value={String(formData.clone_defaults?.default_retention_days ?? 180)}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 180 : parseInt(e.target.value);
                    if (!isNaN(val) && val >= 1 && val <= 3650) {
                      updateField('clone_defaults', 'default_retention_days', val);
                    }
                  }}
                  placeholder="180"
                  className="w-full"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Default number of days to retain clone data after delivery (Default: 180 days)
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Minimum Retention Period (Days)
                </label>
                <Input
                  type="number"
                  min="1"
                  value={String(formData.clone_defaults?.min_retention_days ?? 1)}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 1 : parseInt(e.target.value);
                    if (!isNaN(val) && val >= 1) {
                      updateField('clone_defaults', 'min_retention_days', val);
                    }
                  }}
                  placeholder="1"
                  className="w-full"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Minimum allowed retention period for validation (Default: 1 day)
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Maximum Retention Period (Days)
                </label>
                <Input
                  type="number"
                  min="1"
                  value={String(formData.clone_defaults?.max_retention_days ?? 3650)}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 3650 : parseInt(e.target.value);
                    if (!isNaN(val) && val >= 1) {
                      updateField('clone_defaults', 'max_retention_days', val);
                    }
                  }}
                  placeholder="3650"
                  className="w-full"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Maximum allowed retention period for validation (Default: 3650 days / 10 years)
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-amber-900">
                    <span className="font-semibold">Note:</span> These settings only affect new clone drives.
                    Existing clones will retain their current retention periods unless manually updated.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleSection>
      </div>

      {hasUnsavedChanges && (
        <div className="mt-8 bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 rounded-lg p-4 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-amber-900 mb-1">
                  You have unsaved changes
                </h4>
                <p className="text-sm text-amber-800">
                  Click "Save All Changes" below to persist your updates. Changes will be lost if you leave this page without saving.
                </p>
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 whitespace-nowrap shadow-md hover:shadow-lg transition-shadow"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              }}
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Now'}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasUnsavedChanges}
          className="flex items-center gap-2 px-8 py-3 shadow-lg hover:shadow-xl transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: hasUnsavedChanges
              ? 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)'
              : 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
          }}
        >
          <Save className="w-5 h-5" />
          {isSaving ? 'Saving Changes...' : hasUnsavedChanges ? 'Save All Changes' : 'No Changes to Save'}
        </Button>
      </div>
    </div>
  );
};
