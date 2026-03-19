import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2, Search, DollarSign, FileText, FileBarChart, Briefcase, Calculator, Package, Info, X, Percent } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabaseClient';
import { useCurrency } from '../../hooks/useCurrency';
import { useToast } from '../../hooks/useToast';

interface LineItemTemplate {
  id: string;
  name: string;
  description: string;
  unit_of_measure: string;
  default_price: number;
  item_category: string;
}

interface QuoteLineItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  unit?: string;
}

interface QuoteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (quoteData: Record<string, unknown>, items: QuoteLineItem[]) => Promise<void>;
  caseId?: string;
  customerId?: string | null;
  companyId?: string | null;
  initialData?: Record<string, unknown>;
  clientReference?: string;
}

interface QuoteTermsTemplate {
  id: string;
  name: string;
  content: string;
  is_default: boolean;
}

interface BankAccount {
  id: string;
  account_name: string;
  bank_name: string;
  account_number: string;
  is_active: boolean;
}

export const QuoteFormModal: React.FC<QuoteFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  caseId,
  customerId,
  companyId,
  initialData,
  clientReference,
}) => {
  const { currencyFormat } = useCurrency();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTermsTemplates, setShowTermsTemplates] = useState(false);
  const [quoteNumber, setQuoteNumber] = useState<string>('');
  const [caseNumber, setCaseNumber] = useState<string>('');
  const [selectedCaseId, setSelectedCaseId] = useState<string>(caseId || '');

  // Calculate default valid_until date (30 days from now)
  const getDefaultValidUntil = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  };

  const [quoteData, setQuoteData] = useState({
    title: initialData?.title || '',
    status: initialData?.status || 'draft',
    valid_until: initialData?.valid_until || getDefaultValidUntil(),
    client_reference: initialData?.client_reference || clientReference || '',
    tax_rate: initialData?.tax_rate || 5,
    discount_amount: initialData?.discount_amount || 0,
    discount_type: initialData?.discount_type || 'fixed',
    terms_and_conditions: initialData?.terms_and_conditions || '',
    bank_account_id: initialData?.bank_account_id || null,
  });

  useEffect(() => {
    if (initialData) {
      setQuoteData({
        title: initialData.title || '',
        status: initialData.status || 'draft',
        valid_until: initialData.valid_until || getDefaultValidUntil(),
        client_reference: initialData.client_reference || clientReference || '',
        tax_rate: initialData.tax_rate || 5,
        discount_amount: initialData.discount_amount || 0,
        discount_type: initialData.discount_type || 'fixed',
        terms_and_conditions: initialData.terms_and_conditions || '',
        bank_account_id: initialData.bank_account_id || null,
      });
    } else if (clientReference) {
      setQuoteData(prev => ({ ...prev, client_reference: clientReference }));
    }
  }, [clientReference, initialData]);

  useEffect(() => {
    const fetchMetadata = async () => {
      if (isOpen) {
        if (initialData?.quote_number) {
          setQuoteNumber(initialData.quote_number);
        } else {
          // Fetch the next quote number from the system
          try {
            const { data: nextNumber, error } = await supabase
              .rpc('get_next_number', { sequence_scope: 'quote' });

            if (!error && nextNumber) {
              setQuoteNumber(nextNumber);
            } else {
              setQuoteNumber('QT-000001');
            }
          } catch (error) {
            console.error('Error fetching next quote number:', error);
            setQuoteNumber('QT-000001');
          }
        }

        const activeCaseId = caseId || selectedCaseId;
        if (activeCaseId) {
          const { data } = await supabase
            .from('cases')
            .select('case_no, service_type_id, customer_id, company_id')
            .eq('id', activeCaseId)
            .maybeSingle();
          if (data) {
            setCaseNumber(data.case_no);

            // Auto-populate quote title from service type for new quotes
            if (!initialData && data.service_type_id) {
              const { data: serviceType } = await supabase
                .from('catalog_service_types')
                .select('name')
                .eq('id', data.service_type_id)
                .maybeSingle();

              if (serviceType && !quoteData.title) {
                setQuoteData(prev => ({ ...prev, title: serviceType.name }));
              }
            }
          }
        }
      }
    };
    fetchMetadata();
  }, [isOpen, caseId, selectedCaseId, initialData]);

  const [lineItems, setLineItems] = useState<QuoteLineItem[]>(
    initialData?.quote_items || [
      { description: '', quantity: 1, unit_price: 0, unit: 'Service' },
    ]
  );

  useEffect(() => {
    if (initialData?.quote_items) {
      setLineItems(initialData.quote_items);
    } else {
      setLineItems([{ description: '', quantity: 1, unit_price: 0, unit: 'Service' }]);
    }
  }, [initialData]);

  const { data: lineItemTemplates = [], isLoading: catalogLoading } = useQuery({
    queryKey: ['quote_line_item_templates'],
    queryFn: async () => {
      const { data: typeData, error: typeError } = await supabase
        .from('master_template_types')
        .select('id')
        .eq('code', 'quote_line_items')
        .maybeSingle();

      if (typeError || !typeData) return [];

      const { data, error } = await supabase
        .from('document_templates')
        .select('id, name, description, unit_of_measure, default_price, item_category')
        .eq('template_type_id', typeData.id)
        .eq('is_active', true)
        .order('item_category')
        .order('name');

      if (error) throw error;
      return data as LineItemTemplate[];
    },
    enabled: isOpen,
  });

  const { data: termsTemplates = [], isLoading: termsLoading } = useQuery({
    queryKey: ['quote_terms_templates'],
    queryFn: async () => {
      const { data: typeData, error: typeError } = await supabase
        .from('master_template_types')
        .select('id')
        .eq('code', 'quote_terms')
        .maybeSingle();

      if (typeError || !typeData) return [];

      const { data, error } = await supabase
        .from('document_templates')
        .select('id, name, content, is_default')
        .eq('template_type_id', typeData.id)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('name');

      if (error) throw error;
      return data as QuoteTermsTemplate[];
    },
    enabled: isOpen,
  });

  const { data: bankAccounts = [], isLoading: bankAccountsLoading } = useQuery({
    queryKey: ['active_bank_accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('id, account_name, bank_name, account_number, is_active')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as BankAccount[];
    },
    enabled: isOpen,
  });

  const { data: cases = [] } = useQuery({
    queryKey: ['cases_for_quote'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cases')
        .select('id, case_no, title, customer_id, company_id, service_type_id')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
    enabled: isOpen && !caseId,
  });

  useEffect(() => {
    if (bankAccounts.length > 0 && !quoteData.bank_account_id && !initialData) {
      setQuoteData(prev => ({ ...prev, bank_account_id: bankAccounts[0].id }));
    }
  }, [bankAccounts, initialData]);

  const filteredCatalog = lineItemTemplates.filter((item) => {
    if (!searchQuery.trim()) return true;
    const search = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(search) ||
      item.description?.toLowerCase().includes(search) ||
      item.item_category?.toLowerCase().includes(search)
    );
  });

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unit_price: 0, unit: 'Service' }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index: number, field: keyof QuoteLineItem, value: string | number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const addFromCatalog = (template: LineItemTemplate) => {
    const newItem: QuoteLineItem = {
      description: `${template.name}${template.description ? ' - ' + template.description : ''}`,
      quantity: 1,
      unit_price: template.default_price,
      unit: template.unit_of_measure,
    };
    setLineItems([...lineItems, newItem]);
    setShowCatalog(false);
    setSearchQuery('');
  };

  const stripHtmlTags = (html: string): string => {
    const div = document.createElement('div');
    div.textContent = html.replace(/<[^>]*>/g, ' ');
    return (div.textContent || '').trim();
  };

  const applyTermsTemplate = async (template: QuoteTermsTemplate) => {
    const plainText = stripHtmlTags(template.content);
    setQuoteData(prev => ({ ...prev, terms_and_conditions: plainText }));
    setShowTermsTemplates(false);

    try {
      const { data: currentTemplate } = await supabase
        .from('document_templates')
        .select('usage_count')
        .eq('id', template.id)
        .single();

      if (currentTemplate) {
        await supabase
          .from('document_templates')
          .update({
            usage_count: (currentTemplate.usage_count || 0) + 1,
            last_used_at: new Date().toISOString(),
          })
          .eq('id', template.id);
      }
    } catch (error) {
      console.error('Error updating template usage:', error);
    }
  };

  const subtotal = lineItems.reduce((sum, item) => {
    return sum + item.quantity * item.unit_price;
  }, 0);

  // Calculate discount based on type
  const discountValue = quoteData.discount_type === 'percentage'
    ? (subtotal * quoteData.discount_amount) / 100
    : quoteData.discount_amount;

  // Apply discount to subtotal first, then calculate VAT on discounted amount
  const discountedSubtotal = subtotal - discountValue;
  const taxAmount = (discountedSubtotal * quoteData.tax_rate) / 100;

  const total = discountedSubtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const activeCaseId = caseId || selectedCaseId;
    if (!activeCaseId) {
      toast.error('Select which case this quote is for');
      return;
    }

    if (!quoteData.title || quoteData.title.trim() === '') {
      toast.error('Give this quote a title (e.g., Data Recovery Service)');
      return;
    }

    if (lineItems.length === 0 || lineItems.every((item) => !item.description.trim())) {
      toast.error('Add at least one item or service to continue');
      return;
    }

    const invalidItems = lineItems.filter(
      (item) => item.quantity <= 0 || item.unit_price < 0
    );
    if (invalidItems.length > 0) {
      toast.error('Check that all items have quantities greater than 0 and valid prices');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedCase = cases.find(c => c.id === activeCaseId);
      await onSave(
        {
          ...quoteData,
          case_id: activeCaseId,
          customer_id: customerId || selectedCase?.customer_id || null,
          company_id: companyId || selectedCase?.company_id || null,
          bank_account_id: quoteData.bank_account_id || null,
        },
        lineItems
      );
      onClose();
    } catch (error: unknown) {
      console.error('Error saving quote:', error);
      const errorMessage = error instanceof Error ? error.message : 'Quote couldn\'t be saved. Check your connection and try again.';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const headerBadges = (
    <>
      <div className="flex items-center gap-1.5 bg-green-50 border border-green-300 px-2.5 py-1 rounded-lg">
        <FileBarChart className="w-3.5 h-3.5 text-green-600" />
        <span className="text-xs font-semibold text-green-700">{quoteNumber}</span>
      </div>
      <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-300 px-2.5 py-1 rounded-lg">
        <Briefcase className="w-3.5 h-3.5 text-blue-600" />
        <span className="text-xs font-semibold text-blue-700">#{caseNumber}</span>
      </div>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Quote' : 'Create New Quote'}
      size="xl"
      headerBadges={headerBadges}
    >
      <form onSubmit={handleSubmit} className="space-y-3">

        {!caseId && (
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-slate-100 p-1.5 rounded-lg">
                <Briefcase className="w-4 h-4 text-slate-600" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Select Case</h3>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Case *</label>
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              >
                <option value="">Select a case...</option>
                {cases.map((caseItem) => (
                  <option key={caseItem.id} value={caseItem.id}>
                    {caseItem.case_no} - {caseItem.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-slate-100 p-1.5 rounded-lg">
              <FileText className="w-4 h-4 text-slate-600" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Quote Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
            <div className="md:col-span-1">
              <Input
                label="Quote Title"
                value={quoteData.title}
                onChange={(e) => setQuoteData({ ...quoteData, title: e.target.value })}
                required
                placeholder="e.g., Data Recovery Service"
              />
            </div>

            <div className="md:col-span-1">
              <Input
                label="Client Reference"
                value={quoteData.client_reference}
                onChange={(e) => setQuoteData({ ...quoteData, client_reference: e.target.value })}
                placeholder="Optional"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={quoteData.status}
                onChange={(e) => setQuoteData({ ...quoteData, status: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            <div className="md:col-span-1">
              <Input
                label="Valid Until"
                type="date"
                value={quoteData.valid_until}
                onChange={(e) => setQuoteData({ ...quoteData, valid_until: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="bg-slate-100 p-1.5 rounded-lg">
                <Package className="w-4 h-4 text-slate-600" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Items & Services</h3>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowCatalog(!showCatalog)}
              >
                <Search className="w-4 h-4 mr-1" />
                Quick Add
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={addLineItem}>
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            {lineItems.map((item, index) => (
              <div key={index} className="flex gap-2 items-start p-2 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex-1 grid grid-cols-12 gap-2">
                  <div className="col-span-4">
                    <input
                      type="text"
                      placeholder="Describe the service or item"
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Unit"
                      value={item.unit || ''}
                      onChange={(e) => updateLineItem(index, 'unit', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)
                      }
                      min="0"
                      step="0.01"
                      className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                  <div className="col-span-4">
                    <input
                      type="number"
                      placeholder="Price"
                      value={item.unit_price}
                      onChange={(e) =>
                        updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)
                      }
                      min="0"
                      step="0.01"
                      className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeLineItem(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove line item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-slate-100 p-1.5 rounded-lg">
                <Calculator className="w-4 h-4 text-slate-600" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Financial Calculation</h3>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Input
                    label="Tax Rate (%)"
                    type="number"
                    value={quoteData.tax_rate}
                    onChange={(e) =>
                      setQuoteData({ ...quoteData, tax_rate: parseFloat(e.target.value) || 0 })
                    }
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Discount ({quoteData.discount_type === 'percentage' ? '%' : currencyFormat.currencySymbol})
                  </label>
                  <input
                    type="number"
                    value={quoteData.discount_amount}
                    onChange={(e) =>
                      setQuoteData({ ...quoteData, discount_amount: parseFloat(e.target.value) || 0 })
                    }
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Discount Type
                  </label>
                  <div className="flex border border-slate-300 rounded-md overflow-hidden h-[34px]">
                    <button
                      type="button"
                      onClick={() => setQuoteData({ ...quoteData, discount_type: 'fixed' })}
                      className={`flex-1 px-2 py-1 transition-all flex items-center justify-center ${
                        quoteData.discount_type === 'fixed'
                          ? 'bg-green-500 text-white shadow-sm'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                      title="Fixed Amount"
                    >
                      <DollarSign className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuoteData({ ...quoteData, discount_type: 'percentage' })}
                      className={`flex-1 px-2 py-1 border-l border-slate-300 transition-all flex items-center justify-center ${
                        quoteData.discount_type === 'percentage'
                          ? 'bg-green-500 text-white shadow-sm'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                      title="Percentage"
                    >
                      <Percent className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="w-4 h-4 text-blue-600" />
                  <h4 className="text-sm font-semibold text-blue-900">Summary</h4>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700">Base Amount</span>
                  <span className="font-medium text-slate-900">
                    {currencyFormat.currencySymbol}
                    {subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700">VAT ({quoteData.tax_rate}%)</span>
                  <span className="font-medium text-slate-900">
                    {currencyFormat.currencySymbol}
                    {taxAmount.toFixed(2)}
                  </span>
                </div>
                {quoteData.discount_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-700">
                      Discount {quoteData.discount_type === 'percentage' ? `(${quoteData.discount_amount}%)` : ''}
                    </span>
                    <span className="font-medium text-red-600">
                      -{currencyFormat.currencySymbol}
                      {discountValue.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold border-t border-blue-300 pt-2 mt-2">
                  <span className="text-blue-900">Total Amount</span>
                  <span className="text-green-600">
                    {currencyFormat.currencySymbol}
                    {total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-slate-100 p-1.5 rounded-lg">
                <Info className="w-4 h-4 text-slate-600" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Additional Information</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Bank Account
                </label>
                <select
                  value={quoteData.bank_account_id || ''}
                  onChange={(e) => setQuoteData({ ...quoteData, bank_account_id: e.target.value || null })}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  disabled={bankAccountsLoading}
                >
                  <option value="">None selected</option>
                  {bankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_name} - {account.bank_name}
                    </option>
                  ))}
                </select>
                {bankAccounts.length === 0 && !bankAccountsLoading && (
                  <p className="text-xs text-amber-600 mt-1">No bank accounts set up. Add one in Banking &gt; Accounts to display payment details on quotes.</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Terms & Conditions
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowTermsTemplates(!showTermsTemplates)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Quick Add
                  </button>
                </div>
                {showTermsTemplates && (
                  <div className="mb-2 p-2 bg-slate-50 rounded-lg border border-slate-200 max-h-32 overflow-y-auto">
                    <div className="space-y-1">
                      {termsLoading ? (
                        <div className="text-center py-2 text-xs text-slate-500">Loading...</div>
                      ) : termsTemplates.length === 0 ? (
                        <div className="text-center py-2 text-xs text-slate-500">No templates found</div>
                      ) : (
                        termsTemplates.map((template) => (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => applyTermsTemplate(template)}
                            className="w-full text-left p-2 bg-white rounded border border-slate-200 hover:border-green-400 hover:bg-green-50 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-slate-900">{template.name}</span>
                              {template.is_default && (
                                <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">
                                  Default
                                </span>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
                <textarea
                  value={quoteData.terms_and_conditions}
                  onChange={(e) =>
                    setQuoteData({ ...quoteData, terms_and_conditions: e.target.value })
                  }
                  rows={4}
                  className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Quote validity and payment terms (e.g., Quote valid for 30 days, 50% deposit required)"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-3 border-t border-slate-200 mt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            style={{ backgroundColor: '#10b981' }}
            disabled={isSubmitting}
            className="shadow-md hover:shadow-lg transition-shadow"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <DollarSign className="w-5 h-5 mr-2" />
                {initialData ? 'Update Quote' : 'Create Quote'}
              </>
            )}
          </Button>
        </div>
      </form>

      {showCatalog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowCatalog(false)}>
          <div className="fixed inset-0 bg-black bg-opacity-50" />
          <div
            className="relative bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-slate-900">Quick Add from Catalog</h3>
              </div>
              <button
                onClick={() => setShowCatalog(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <Input
                placeholder="Search services, descriptions, or categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <div className="space-y-2">
                {catalogLoading ? (
                  <div className="text-center py-8 text-sm text-slate-500">Loading templates...</div>
                ) : filteredCatalog.length === 0 ? (
                  <div className="text-center py-8 text-sm text-slate-500">
                    {searchQuery ? 'No templates match your search' : 'No templates found'}
                  </div>
                ) : (
                  filteredCatalog.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => addFromCatalog(item)}
                      className="w-full text-left p-3 bg-white rounded-lg border border-slate-200 hover:border-green-400 hover:bg-green-50 transition-all hover:shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-slate-900 mb-1">{item.name}</div>
                          {item.description && (
                            <div className="text-sm text-slate-600 mb-2">{item.description}</div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                              {item.item_category}
                            </span>
                            <span className="text-xs text-slate-500">
                              {item.unit_of_measure}
                            </span>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="font-bold text-lg text-green-600">
                            {currencyFormat.currencySymbol}
                            {item.default_price.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
