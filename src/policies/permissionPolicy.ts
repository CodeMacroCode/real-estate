import { CRMModule, IRole, PermissionAction } from '../types';

/**
 * Evaluates whether a given role holds the requested permission action on a target module.
 * 
 * Strict Least-Privilege / Fail-Closed Design:
 * 1. Missing role, null, or empty permissions immediately evaluate to false.
 * 2. An action is granted IF AND ONLY IF it is explicitly present in the module's action list.
 * 3. 'view' does NOT imply 'edit' or 'export'.
 * 4. 'edit' does NOT imply 'publish' or 'approve'.
 * 5. 'create' does NOT imply 'assign'.
 */
export function hasPermission(
  role: Partial<IRole> | any,
  module: CRMModule,
  action: PermissionAction
): boolean {
  if (!role || !role.permissions || !Array.isArray(role.permissions)) {
    return false;
  }

  // Super Admin fast-path if slug is super_admin and isSystem is true
  if (role.slug === 'super_admin') {
    return true;
  }

  const moduleConfig = role.permissions.find((p: any) => p.module === module);
  if (!moduleConfig || !Array.isArray(moduleConfig.actions)) {
    return false;
  }

  return moduleConfig.actions.includes(action);
}

export function canView(role: Partial<IRole> | any, module: CRMModule): boolean {
  return hasPermission(role, module, 'view');
}

export function canCreate(role: Partial<IRole> | any, module: CRMModule): boolean {
  return hasPermission(role, module, 'create');
}

export function canEdit(role: Partial<IRole> | any, module: CRMModule): boolean {
  return hasPermission(role, module, 'edit');
}

export function canDelete(role: Partial<IRole> | any, module: CRMModule): boolean {
  return hasPermission(role, module, 'delete');
}

export function canExport(role: Partial<IRole> | any, module: CRMModule): boolean {
  return hasPermission(role, module, 'export');
}

export function canAssign(role: Partial<IRole> | any, module: CRMModule): boolean {
  return hasPermission(role, module, 'assign');
}

export function canPublish(role: Partial<IRole> | any, module: CRMModule): boolean {
  return hasPermission(role, module, 'publish');
}

export function canApprove(role: Partial<IRole> | any, module: CRMModule): boolean {
  return hasPermission(role, module, 'approve');
}
