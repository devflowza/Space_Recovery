import { supabase } from './supabaseClient';

export interface Module {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: 'core' | 'financial' | 'business' | 'resources' | 'hr' | 'payroll' | 'employee' | 'system';
  icon: string | null;
  route: string | null;
  order_index: number;
  is_active: boolean;
}

export interface RoleModulePermission {
  id: string;
  role: 'admin' | 'technician' | 'sales' | 'accounts' | 'hr';
  module_id: string;
  can_access: boolean;
  module?: Module;
}

export interface ModulesByCategory {
  [category: string]: Module[];
}

export interface RolePermissions {
  role: 'admin' | 'technician' | 'sales' | 'accounts' | 'hr';
  accessibleModules: Set<string>;
}

class RolePermissionsService {
  private permissionsCache: Map<string, RolePermissions> = new Map();
  private modulesCache: Module[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000;

  async getAllModules(): Promise<Module[]> {
    if (this.modulesCache && Date.now() - this.cacheTimestamp < this.CACHE_DURATION) {
      return this.modulesCache;
    }

    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .eq('is_active', true)
      .order('category')
      .order('order_index');

    if (error) {
      console.error('Error fetching modules:', error);
      throw new Error('Failed to fetch modules');
    }

    this.modulesCache = data || [];
    this.cacheTimestamp = Date.now();
    return this.modulesCache;
  }

  async getModulesByCategory(): Promise<ModulesByCategory> {
    const modules = await this.getAllModules();

    const grouped: ModulesByCategory = {};
    modules.forEach((module) => {
      if (!grouped[module.category]) {
        grouped[module.category] = [];
      }
      grouped[module.category].push(module);
    });

    return grouped;
  }

  async getAccessibleModules(role: 'admin' | 'technician' | 'sales' | 'accounts' | 'hr'): Promise<Module[]> {
    if (role === 'admin') {
      return this.getAllModules();
    }

    const { data, error } = await supabase
      .rpc('get_accessible_modules', { p_role: role });

    if (error) {
      console.error('Error fetching accessible modules:', error);
      throw new Error('Failed to fetch accessible modules');
    }

    return data || [];
  }

  async getRolePermissions(role: 'admin' | 'technician' | 'sales' | 'accounts' | 'hr'): Promise<RolePermissions> {
    const cacheKey = role;
    const cached = this.permissionsCache.get(cacheKey);

    if (cached && Date.now() - this.cacheTimestamp < this.CACHE_DURATION) {
      return cached;
    }

    const accessibleModules = await this.getAccessibleModules(role);
    const moduleKeys = new Set(accessibleModules.map(m => m.key));

    const permissions: RolePermissions = {
      role,
      accessibleModules: moduleKeys,
    };

    this.permissionsCache.set(cacheKey, permissions);
    return permissions;
  }

  async checkModuleAccess(
    role: 'admin' | 'technician' | 'sales' | 'accounts' | 'hr',
    moduleKey: string
  ): Promise<boolean> {
    if (role === 'admin') {
      return true;
    }

    const { data, error } = await supabase
      .rpc('check_module_access', {
        p_role: role,
        p_module_key: moduleKey,
      });

    if (error) {
      console.error('Error checking module access:', error);
      return false;
    }

    return data === true;
  }

  async getAllRolePermissions(): Promise<RoleModulePermission[]> {
    const { data, error } = await supabase
      .from('role_module_permissions')
      .select(`
        *,
        module:modules(*)
      `);

    if (error) {
      console.error('Error fetching role permissions:', error);
      throw new Error('Failed to fetch role permissions');
    }

    return data || [];
  }

  async getRolePermissionsWithModules(
    role: 'admin' | 'technician' | 'sales' | 'accounts' | 'hr'
  ): Promise<Map<string, boolean>> {
    if (role === 'admin') {
      const modules = await this.getAllModules();
      const permissionsMap = new Map<string, boolean>();
      modules.forEach(module => {
        permissionsMap.set(module.id, true);
      });
      return permissionsMap;
    }

    const { data, error } = await supabase
      .from('role_module_permissions')
      .select('module_id, can_access')
      .eq('role', role);

    if (error) {
      console.error('Error fetching role permissions:', error);
      throw new Error('Failed to fetch role permissions');
    }

    const permissionsMap = new Map<string, boolean>();
    (data || []).forEach((perm: any) => {
      permissionsMap.set(perm.module_id, perm.can_access);
    });

    return permissionsMap;
  }

  async updateRolePermissions(
    role: 'admin' | 'technician' | 'sales' | 'accounts' | 'hr',
    permissions: { moduleId: string; canAccess: boolean }[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (role === 'admin') {
        return { success: false, error: 'Admin permissions cannot be modified' };
      }

      const updates = permissions.map(({ moduleId, canAccess }) => ({
        role,
        module_id: moduleId,
        can_access: canAccess,
      }));

      const { error: upsertError } = await supabase
        .from('role_module_permissions')
        .upsert(updates, {
          onConflict: 'role,module_id',
        });

      if (upsertError) {
        console.error('Error updating permissions:', upsertError);
        return { success: false, error: upsertError.message };
      }

      this.clearCache();

      await supabase.rpc('log_audit_trail', {
        p_action_type: 'update',
        p_table_name: 'role_module_permissions',
        p_record_id: role,
        p_old_values: {},
        p_new_values: { permissions: updates },
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error in updateRolePermissions:', error);
      return { success: false, error: error.message };
    }
  }

  async bulkUpdateRolePermissions(
    role: 'admin' | 'technician' | 'sales' | 'accounts' | 'hr',
    moduleIds: string[],
    canAccess: boolean
  ): Promise<{ success: boolean; error?: string }> {
    const permissions = moduleIds.map(moduleId => ({ moduleId, canAccess }));
    return this.updateRolePermissions(role, permissions);
  }

  clearCache(): void {
    this.permissionsCache.clear();
    this.modulesCache = null;
    this.cacheTimestamp = 0;
  }

  getCategoryDisplayName(category: string): string {
    const displayNames: { [key: string]: string } = {
      core: 'Core Operations',
      financial: 'Financial',
      business: 'Business',
      resources: 'Resources',
      hr: 'Human Resources',
      payroll: 'Payroll',
      employee: 'Employee Management',
      system: 'System',
    };

    return displayNames[category] || category;
  }
}

export const rolePermissionsService = new RolePermissionsService();
