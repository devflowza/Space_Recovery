import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2, Mail, Phone, MapPin, Globe, FileText, Edit, ArrowLeft,
  User, MessageSquare, FileStack, TrendingUp, Package, Activity,
  CheckCircle, XCircle, Star, Clock, DollarSign
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { DataTable } from '../../components/shared/DataTable';
import SupplierFormModal from '../../components/suppliers/SupplierFormModal';
import { supabase } from '../../lib/supabaseClient';
import { useToast } from '../../hooks/useToast';
import { format } from 'date-fns';

type TabType = 'overview' | 'contacts' | 'communications' | 'documents' | 'performance' | 'orders' | 'audit';

export default function SupplierProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [supplier, setSupplier] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [communications, setCommunications] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [auditTrail, setAuditTrail] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      loadSupplier();
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadTabData();
    }
  }, [activeTab, id]);

  const loadSupplier = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('suppliers')
        .select(`
          *,
          category:supplier_categories(name),
          payment_terms:supplier_payment_terms(name, days),
          created_by_user:auth.users!suppliers_created_by_fkey(email),
          updated_by_user:auth.users!suppliers_updated_by_fkey(email)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setSupplier(data);
    } catch (error: unknown) {
      console.error('Error loading supplier:', error);
      showToast(error instanceof Error ? error.message : 'Failed to load supplier', 'error');
      navigate('/suppliers');
    } finally {
      setLoading(false);
    }
  };

  const loadTabData = async () => {
    if (!id) return;

    try {
      switch (activeTab) {
        case 'contacts':
          await loadContacts();
          break;
        case 'communications':
          await loadCommunications();
          break;
        case 'documents':
          await loadDocuments();
          break;
        case 'performance':
          await loadPerformance();
          break;
        case 'orders':
          await loadOrders();
          break;
        case 'audit':
          await loadAuditTrail();
          break;
      }
    } catch (error) {
      console.error('Error loading tab data:', error);
    }
  };

  const loadContacts = async () => {
    const { data } = await supabase
      .from('supplier_contacts')
      .select('*')
      .eq('supplier_id', id)
      .order('is_primary', { ascending: false });
    setContacts(data || []);
  };

  const loadCommunications = async () => {
    const { data } = await supabase
      .from('supplier_communications')
      .select('*, created_by_user:auth.users(email)')
      .eq('supplier_id', id)
      .order('created_at', { ascending: false });
    setCommunications(data || []);
  };

  const loadDocuments = async () => {
    const { data } = await supabase
      .from('supplier_documents')
      .select('*, uploaded_by_user:auth.users(email)')
      .eq('supplier_id', id)
      .order('uploaded_at', { ascending: false });
    setDocuments(data || []);
  };

  const loadPerformance = async () => {
    const { data } = await supabase
      .from('supplier_performance_metrics')
      .select('*')
      .eq('supplier_id', id)
      .order('evaluation_date', { ascending: false });
    setPerformance(data || []);
  };

  const loadOrders = async () => {
    const { data } = await supabase
      .from('purchase_orders')
      .select('*, status:purchase_order_statuses(name, color)')
      .eq('supplier_id', id)
      .order('created_at', { ascending: false });
    setOrders(data || []);
  };

  const loadAuditTrail = async () => {
    const { data } = await supabase
      .from('supplier_audit_trail')
      .select('*, user:auth.users(email)')
      .eq('supplier_id', id)
      .order('created_at', { ascending: false });
    setAuditTrail(data || []);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading supplier...</div>
      </div>
    );
  }

  if (!supplier) {
    return null;
  }

  const tabs: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: Building2 },
    { id: 'contacts', label: 'Contacts', icon: User, count: contacts.length },
    { id: 'communications', label: 'Communications', icon: MessageSquare, count: communications.length },
    { id: 'documents', label: 'Documents', icon: FileStack, count: documents.length },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'orders', label: 'Purchase Orders', icon: Package, count: orders.length },
    { id: 'audit', label: 'Audit Trail', icon: Activity, count: auditTrail.length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/suppliers')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{supplier.name}</h1>
              {supplier.is_approved && (
                <Badge variant="success">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Approved
                </Badge>
              )}
              <Badge variant={supplier.is_active ? 'success' : 'default'}>
                {supplier.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-gray-500 mt-1">{supplier.supplier_number}</p>
          </div>
        </div>
        <Button onClick={() => setShowEditModal(true)}>
          <Edit className="w-4 h-4 mr-2" />
          Edit Supplier
        </Button>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-1 py-4 border-b-2 font-medium text-sm whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'overview' && <OverviewTab supplier={supplier} />}
        {activeTab === 'contacts' && <ContactsTab contacts={contacts} supplierId={id!} onUpdate={loadContacts} />}
        {activeTab === 'communications' && <CommunicationsTab communications={communications} supplierId={id!} onUpdate={loadCommunications} />}
        {activeTab === 'documents' && <DocumentsTab documents={documents} supplierId={id!} onUpdate={loadDocuments} />}
        {activeTab === 'performance' && <PerformanceTab supplier={supplier} performance={performance} />}
        {activeTab === 'orders' && <OrdersTab orders={orders} supplierId={id!} />}
        {activeTab === 'audit' && <AuditTab auditTrail={auditTrail} />}
      </div>

      {showEditModal && (
        <SupplierFormModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            loadSupplier();
            setShowEditModal(false);
          }}
          supplier={supplier}
        />
      )}
    </div>
  );
}

function OverviewTab({ supplier }: { supplier: Record<string, unknown> & { name: string; category?: { name?: string }; payment_terms?: { name?: string }; supplier_number?: string; contact_person?: string; email?: string; phone?: string; address?: string; city?: string; country?: string; currency?: string; tax_number?: string; notes?: string; is_active?: boolean; is_approved?: boolean; website?: string } }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">Category</label>
                <p className="font-medium">{supplier.category?.name || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Payment Terms</label>
                <p className="font-medium">{supplier.payment_terms?.name || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Tax ID / VAT</label>
                <p className="font-medium">{supplier.tax_id || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Website</label>
                {supplier.website ? (
                  <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    <Globe className="inline w-4 h-4 mr-1" />
                    Visit Website
                  </a>
                ) : (
                  <p className="font-medium">-</p>
                )}
              </div>
            </div>
            {supplier.description && (
              <div className="mt-4">
                <label className="text-sm text-gray-500">Description</label>
                <p className="mt-1 text-gray-700">{supplier.description}</p>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <label className="text-sm text-gray-500">Email</label>
                  <p className="font-medium">{supplier.email || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <label className="text-sm text-gray-500">Phone</label>
                  <p className="font-medium">{supplier.phone || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <label className="text-sm text-gray-500">Address</label>
                  <p className="font-medium">
                    {supplier.address && (
                      <>
                        {supplier.address}
                        {supplier.city && `, ${supplier.city}`}
                        {supplier.state && `, ${supplier.state}`}
                        {supplier.zip_code && ` ${supplier.zip_code}`}
                        {supplier.country && `, ${supplier.country}`}
                      </>
                    )}
                    {!supplier.address && '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {(supplier.primary_contact_name || supplier.primary_contact_email) && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Primary Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Name</label>
                  <p className="font-medium">{supplier.primary_contact_name || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Position</label>
                  <p className="font-medium">{supplier.primary_contact_position || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Email</label>
                  <p className="font-medium">{supplier.primary_contact_email || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Phone</label>
                  <p className="font-medium">{supplier.primary_contact_phone || '-'}</p>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Scores</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">On-Time Delivery</span>
                  <span className="font-semibold">{supplier.on_time_delivery_rate || 0}/5</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${((supplier.on_time_delivery_rate || 0) / 5) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Quality Score</span>
                  <span className="font-semibold">{supplier.quality_score || 0}/5</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${((supplier.quality_score || 0) / 5) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Pricing Score</span>
                  <span className="font-semibold">{supplier.pricing_score || 0}/5</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full"
                    style={{ width: `${((supplier.pricing_score || 0) / 5) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Reliability</span>
                  <span className="font-semibold">{supplier.reliability_score || 0}/5</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full"
                    style={{ width: `${((supplier.reliability_score || 0) / 5) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Info</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-500">Preferred Shipping</label>
                <p className="font-medium">{supplier.preferred_shipping_method || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Response Time</label>
                <p className="font-medium">{supplier.response_time_hours ? `${supplier.response_time_hours} hours` : '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Created</label>
                <p className="font-medium">{format(new Date(supplier.created_at), 'MMM dd, yyyy')}</p>
              </div>
              {supplier.updated_at && (
                <div>
                  <label className="text-sm text-gray-500">Last Updated</label>
                  <p className="font-medium">{format(new Date(supplier.updated_at), 'MMM dd, yyyy')}</p>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ContactsTab({ contacts, supplierId, onUpdate }: { contacts: Record<string, unknown>[]; supplierId: string; onUpdate: () => void }) {
  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Contacts</h3>
          <Button size="sm">
            <User className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        </div>
        {contacts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No contacts added yet
          </div>
        ) : (
          <div className="space-y-4">
            {contacts.map((contact) => (
              <div key={contact.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900">{contact.name}</h4>
                      {contact.is_primary && (
                        <Badge variant="info" size="sm">Primary</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{contact.position}</p>
                    <div className="mt-3 space-y-1">
                      {contact.email && (
                        <p className="text-sm text-gray-600">
                          <Mail className="inline w-4 h-4 mr-1" />
                          {contact.email}
                        </p>
                      )}
                      {contact.phone && (
                        <p className="text-sm text-gray-600">
                          <Phone className="inline w-4 h-4 mr-1" />
                          {contact.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function CommunicationsTab({ communications, supplierId, onUpdate }: { communications: Record<string, unknown>[]; supplierId: string; onUpdate: () => void }) {
  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Communications</h3>
          <Button size="sm">
            <MessageSquare className="w-4 h-4 mr-2" />
            Log Communication
          </Button>
        </div>
        {communications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No communications logged yet
          </div>
        ) : (
          <div className="space-y-4">
            {communications.map((comm) => (
              <div key={comm.id} className="border-l-4 border-blue-500 bg-gray-50 p-4 rounded">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={comm.type === 'email' ? 'info' : comm.type === 'phone' ? 'warning' : 'default'}>
                        {comm.type}
                      </Badge>
                      <span className="text-sm text-gray-500">{format(new Date(comm.created_at), 'MMM dd, yyyy HH:mm')}</span>
                    </div>
                    <h4 className="font-semibold text-gray-900 mt-2">{comm.subject}</h4>
                    <p className="text-sm text-gray-600 mt-1">{comm.notes}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function DocumentsTab({ documents, supplierId, onUpdate }: { documents: Record<string, unknown>[]; supplierId: string; onUpdate: () => void }) {
  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
          <Button size="sm">
            <FileStack className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
        </div>
        {documents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No documents uploaded yet
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <FileText className="w-8 h-8 text-blue-500" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{doc.file_name}</h4>
                    <p className="text-sm text-gray-500 mt-1">{doc.document_type}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Uploaded {format(new Date(doc.uploaded_at), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function PerformanceTab({ supplier, performance }: { supplier: Record<string, unknown>; performance: Record<string, unknown>[] }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">On-Time Delivery</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{supplier.on_time_delivery_rate || 0}/5</div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <Star className="w-4 h-4" />
              <span className="text-sm">Quality Score</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{supplier.quality_score || 0}/5</div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">Pricing Score</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{supplier.pricing_score || 0}/5</div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Reliability</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{supplier.reliability_score || 0}/5</div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance History</h3>
          {performance.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No performance evaluations recorded yet
            </div>
          ) : (
            <div className="space-y-4">
              {performance.map((perf) => (
                <div key={perf.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">
                      {format(new Date(perf.evaluation_date), 'MMM dd, yyyy')}
                    </span>
                    <Badge variant="info">{perf.period}</Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">On-Time:</span>
                      <span className="ml-1 font-medium">{perf.on_time_delivery_rate}/5</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Quality:</span>
                      <span className="ml-1 font-medium">{perf.quality_rating}/5</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Pricing:</span>
                      <span className="ml-1 font-medium">{perf.pricing_consistency_score}/5</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Reliability:</span>
                      <span className="ml-1 font-medium">{perf.reliability_score}/5</span>
                    </div>
                  </div>
                  {perf.notes && (
                    <p className="text-sm text-gray-600 mt-2">{perf.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function OrdersTab({ orders, supplierId }: { orders: Record<string, unknown>[]; supplierId: string }) {
  const navigate = useNavigate();

  const columns = [
    {
      key: 'po_number',
      label: 'PO Number',
      render: (order: Record<string, unknown>) => (
        <button
          onClick={() => navigate(`/purchase-orders/${order.id}`)}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          {order.po_number}
        </button>
      ),
    },
    {
      key: 'order_date',
      label: 'Order Date',
      render: (order: Record<string, unknown>) => format(new Date(order.order_date), 'MMM dd, yyyy'),
    },
    {
      key: 'expected_delivery',
      label: 'Expected Delivery',
      render: (order: Record<string, unknown>) => order.expected_delivery ? format(new Date(order.expected_delivery), 'MMM dd, yyyy') : '-',
    },
    {
      key: 'total_amount',
      label: 'Amount',
      render: (order: Record<string, unknown>) => `$${order.total_amount?.toLocaleString() || '0.00'}`,
    },
    {
      key: 'status',
      label: 'Status',
      render: (order: Record<string, unknown>) => (
        <Badge style={{ backgroundColor: order.status?.color || '#3b82f6' }}>
          {order.status?.name || 'Unknown'}
        </Badge>
      ),
    },
  ];

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Purchase Orders</h3>
          <Button size="sm" onClick={() => navigate('/purchase-orders/new', { state: { supplierId } })}>
            <Package className="w-4 h-4 mr-2" />
            Create PO
          </Button>
        </div>
        {orders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No purchase orders yet
          </div>
        ) : (
          <DataTable columns={columns} data={orders} />
        )}
      </div>
    </Card>
  );
}

function AuditTab({ auditTrail }: { auditTrail: Record<string, unknown>[] }) {
  return (
    <Card>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Audit Trail</h3>
        {auditTrail.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No audit records found
          </div>
        ) : (
          <div className="space-y-3">
            {auditTrail.map((audit) => (
              <div key={audit.id} className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
                <Activity className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{audit.action}</span>
                    <span className="text-sm text-gray-500">
                      {format(new Date(audit.created_at), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                  {audit.changes && (
                    <p className="text-sm text-gray-600 mt-1">{audit.changes}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">by {audit.user?.email || 'Unknown'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
