import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Edit,
  Copy,
  Trash2,
  Eye,
  MoreVertical,
  Star,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { formatDate } from '../../lib/format';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import { LineItemTemplateFormModal } from '../../components/templates/LineItemTemplateFormModal';
import { useCurrency } from '../../hooks/useCurrency';
import { logger } from '../../lib/logger';

interface Template {
  id: string;
  name: string;
  description: string | null;
  content: string | null;
  subject_line: string | null;
  is_default: boolean;
  is_active: boolean;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  version: number;
  default_price?: number;
  unit_of_measure?: string;
  item_category?: string;
}

interface TemplateType {
  id: string;
  name: string;
  code: string;
  description: string;
  supports_line_items: boolean;
}

export const TemplateTypeDetail: React.FC = () => {
  const { typeCode } = useParams<{ typeCode: string }>();
  const navigate = useNavigate();
  const [templateType, setTemplateType] = useState<TemplateType | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    if (typeCode) {
      loadData();
    }
  }, [typeCode]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: typeData } = await supabase
        .from('master_template_types')
        .select('*')
        .eq('code', typeCode)
        .maybeSingle();

      if (typeData) {
        setTemplateType(typeData);

        const { data: templatesData } = await supabase
          .from('document_templates')
          .select('*')
          .eq('template_type_id', typeData.id)
          .eq('is_active', true)
          .order('is_default', { ascending: false })
          .order('name');

        setTemplates(templatesData || []);
      }
    } catch (error) {
      logger.error('Error loading templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      const { error } = await supabase
        .from('document_templates')
        .update({ is_active: false })
        .eq('id', selectedTemplate.id);

      if (!error) {
        setShowDeleteConfirm(false);
        setSelectedTemplate(null);
        await loadData();
      }
    } catch (error) {
      logger.error('Error deleting template:', error);
    }
  };

  const handleDuplicateTemplate = async (template: Template) => {
    try {
      const { error } = await supabase
        .from('document_templates')
        .insert({
          template_type_id: templateType?.id,
          name: `${template.name} (Copy)`,
          description: template.description,
          content: template.content,
          subject_line: template.subject_line,
          default_price: template.default_price || 0,
          unit_of_measure: template.unit_of_measure || 'service',
          item_category: template.item_category,
          is_default: false,
          is_active: true,
        });

      if (!error) {
        await loadData();
      }
    } catch (error) {
      logger.error('Error duplicating template:', error);
    }
  };

  const handleSaveTemplate = async (templateData: Record<string, unknown>) => {
    try {
      if (selectedTemplate) {
        const { error } = await supabase
          .from('document_templates')
          .update(templateData)
          .eq('id', selectedTemplate.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('document_templates')
          .insert(templateData);

        if (error) throw error;
      }

      await loadData();
      setShowFormModal(false);
      setSelectedTemplate(null);
    } catch (error) {
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  if (!templateType) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Template type not found</h2>
        <Button onClick={() => navigate('/templates')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Templates
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/templates')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{templateType.name}</h1>
            <p className="mt-1 text-slate-600">{templateType.description}</p>
          </div>
        </div>
        <Button onClick={() => {
          setSelectedTemplate(null);
          setShowFormModal(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Templates</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{templates.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Copy className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Default Template</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {templates.filter(t => t.is_default).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Star className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Usage</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {templates.reduce((sum, t) => sum + t.usage_count, 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-3">
        {templates.map((template) => (
          <Card key={template.id} className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-slate-900">{template.name}</h3>
                  {template.is_default && (
                    <Badge variant="warning">
                      <Star className="w-3 h-3 mr-1" />
                      Default
                    </Badge>
                  )}
                  <Badge variant="secondary">v{template.version}</Badge>
                </div>

                {template.description && (
                  <p className="text-sm text-slate-600 mb-3">{template.description}</p>
                )}

                {template.subject_line && (
                  <p className="text-sm text-slate-700 mb-2">
                    <span className="font-medium">Subject:</span> {template.subject_line}
                  </p>
                )}

                {templateType?.supports_line_items && (
                  <div className="flex items-center gap-4 text-sm text-slate-700 mb-2">
                    {template.default_price !== undefined && (
                      <span className="flex items-center">
                        <DollarSign className="w-4 h-4 mr-1" />
                        <span className="font-medium">{formatCurrency(template.default_price)}</span>
                      </span>
                    )}
                    {template.unit_of_measure && (
                      <span className="text-slate-600">per {template.unit_of_measure}</span>
                    )}
                    {template.item_category && (
                      <Badge variant="secondary">{template.item_category}</Badge>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>Used {template.usage_count} times</span>
                  {template.last_used_at && (
                    <span>Last used {formatDate(template.last_used_at)}</span>
                  )}
                  <span>Created {formatDate(template.created_at)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedTemplate(template);
                    setShowPreview(true);
                  }}
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedTemplate(template);
                    setShowFormModal(true);
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDuplicateTemplate(template)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedTemplate(template);
                    setShowDeleteConfirm(true);
                  }}
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {templates.length === 0 && (
          <Card className="p-12 text-center">
            <Copy className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No templates yet</h3>
            <p className="text-slate-600 mb-4">
              Create your first {templateType.name.toLowerCase()} template
            </p>
            <Button onClick={() => {
              setSelectedTemplate(null);
              setShowFormModal(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </Card>
        )}
      </div>

      {showPreview && selectedTemplate && (
        <Modal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          title={selectedTemplate.name}
        >
          <div className="prose max-w-none">
            {selectedTemplate.subject_line && (
              <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium text-slate-700 mb-1">Subject:</p>
                <p className="text-sm text-slate-900">{selectedTemplate.subject_line}</p>
              </div>
            )}
            <div
              className="border border-slate-200 rounded-lg p-4 prose max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedTemplate.content || '') }}
            />
          </div>
        </Modal>
      )}

      {showDeleteConfirm && selectedTemplate && (
        <Modal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          title="Delete Template"
        >
          <div className="space-y-4">
            <p className="text-slate-700">
              Are you sure you want to delete the template "{selectedTemplate.name}"?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteTemplate}
              >
                Delete Template
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {showFormModal && templateType && (
        <LineItemTemplateFormModal
          isOpen={showFormModal}
          onClose={() => {
            setShowFormModal(false);
            setSelectedTemplate(null);
          }}
          onSave={handleSaveTemplate}
          initialData={selectedTemplate}
          templateTypeId={templateType.id}
          isLineItemType={templateType.supports_line_items}
        />
      )}
    </div>
  );
};
