import { supabase } from './supabaseClient';

export interface ReportSection {
  id: string;
  section_key: string;
  section_name: string;
  section_name_ar?: string;
  section_description?: string;
  section_description_ar?: string;
  category: 'general' | 'diagnostic' | 'solution' | 'timeline' | 'technical' | 'financial' | 'compliance' | 'risk';
  icon: string;
  color: string;
  default_content_template?: string;
  is_system: boolean;
  is_active: boolean;
  is_hidden_in_editor: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface SectionPreset {
  id: string;
  section_id: string;
  preset_name: string;
  preset_content: string;
  device_type_filter?: string[];
  service_type_filter?: string[];
  usage_count: number;
  is_active: boolean;
  display_order: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateSectionMapping {
  id: string;
  template_id: string;
  section_id: string;
  section_order: number;
  is_required: boolean;
  is_collapsible: boolean;
  page_break_before: boolean;
  custom_label?: string;
  custom_label_ar?: string;
  section_config?: any;
  created_at: string;
  updated_at: string;
}

export const reportSectionService = {
  /**
   * Get all report sections
   */
  async getSections(): Promise<ReportSection[]> {
    const { data, error } = await supabase
      .from('report_section_library')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) {
      console.error('Error fetching sections:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get sections by category
   */
  async getSectionsByCategory(category: string): Promise<ReportSection[]> {
    const { data, error } = await supabase
      .from('report_section_library')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .order('display_order');

    if (error) {
      console.error('Error fetching sections by category:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get section by key
   */
  async getSectionByKey(sectionKey: string): Promise<ReportSection | null> {
    const { data, error } = await supabase
      .from('report_section_library')
      .select('*')
      .eq('section_key', sectionKey)
      .maybeSingle();

    if (error) {
      console.error('Error fetching section:', error);
      throw error;
    }

    return data;
  },

  /**
   * Create a new section
   */
  async createSection(section: Omit<ReportSection, 'id' | 'created_at' | 'updated_at'>): Promise<ReportSection> {
    const { data, error } = await supabase
      .from('report_section_library')
      .insert(section)
      .select()
      .single();

    if (error) {
      console.error('Error creating section:', error);
      throw error;
    }

    return data;
  },

  /**
   * Update a section
   */
  async updateSection(id: string, updates: Partial<ReportSection>): Promise<ReportSection> {
    const { data, error } = await supabase
      .from('report_section_library')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating section:', error);
      throw error;
    }

    return data;
  },

  /**
   * Delete a section (only non-system sections)
   */
  async deleteSection(id: string): Promise<void> {
    const { error } = await supabase
      .from('report_section_library')
      .delete()
      .eq('id', id)
      .eq('is_system', false);

    if (error) {
      console.error('Error deleting section:', error);
      throw error;
    }
  },

  /**
   * Get presets for a section
   */
  async getPresetsBySection(sectionId: string): Promise<SectionPreset[]> {
    const { data, error } = await supabase
      .from('report_section_presets')
      .select('*')
      .eq('section_id', sectionId)
      .eq('is_active', true)
      .order('display_order');

    if (error) {
      console.error('Error fetching presets:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Create a preset
   */
  async createPreset(preset: Omit<SectionPreset, 'id' | 'usage_count' | 'created_at' | 'updated_at'>): Promise<SectionPreset> {
    const { data, error } = await supabase
      .from('report_section_presets')
      .insert(preset)
      .select()
      .single();

    if (error) {
      console.error('Error creating preset:', error);
      throw error;
    }

    return data;
  },

  /**
   * Update a preset
   */
  async updatePreset(id: string, updates: Partial<SectionPreset>): Promise<SectionPreset> {
    const { data, error } = await supabase
      .from('report_section_presets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating preset:', error);
      throw error;
    }

    return data;
  },

  /**
   * Delete a preset
   */
  async deletePreset(id: string): Promise<void> {
    const { error } = await supabase
      .from('report_section_presets')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting preset:', error);
      throw error;
    }
  },

  /**
   * Increment preset usage count
   */
  async incrementPresetUsage(id: string): Promise<void> {
    const { error } = await supabase.rpc('increment_preset_usage', {
      p_table_name: 'report_section_presets',
      p_preset_id: id
    });

    if (error) {
      // Fallback if function doesn't exist
      const { data: preset } = await supabase
        .from('report_section_presets')
        .select('usage_count')
        .eq('id', id)
        .single();

      if (preset) {
        await supabase
          .from('report_section_presets')
          .update({ usage_count: preset.usage_count + 1 })
          .eq('id', id);
      }
    }
  },

  /**
   * Get sections for a template
   */
  async getTemplateSections(templateId: string): Promise<(TemplateSectionMapping & { section: ReportSection })[]> {
    const { data, error } = await supabase
      .from('report_template_section_mappings')
      .select(`
        *,
        section:report_section_library(*)
      `)
      .eq('template_id', templateId)
      .order('section_order');

    if (error) {
      console.error('Error fetching template sections:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Update template section mappings
   */
  async updateTemplateSections(
    templateId: string,
    sections: Array<{ section_id: string; section_order: number; is_required: boolean }>
  ): Promise<void> {
    // Delete existing mappings
    await supabase
      .from('report_template_section_mappings')
      .delete()
      .eq('template_id', templateId);

    // Insert new mappings
    const mappings = sections.map((s) => ({
      template_id: templateId,
      section_id: s.section_id,
      section_order: s.section_order,
      is_required: s.is_required,
    }));

    const { error } = await supabase
      .from('report_template_section_mappings')
      .insert(mappings);

    if (error) {
      console.error('Error updating template sections:', error);
      throw error;
    }
  },
};
