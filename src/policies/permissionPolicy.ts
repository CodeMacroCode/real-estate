import { CRMModule, IRole, PermissionAction } from '../types';

/**
 * Evaluates whether a given role holds the requested permission action on a target module.
 * 
 * Strict Least-Privilege / Fail-Closed Design:
 * 1. Missing role, null, non-object, or empty permissions immediately evaluate to false.
 * 2. Unconditional slug shortcuts (including super_admin) are strictly prohibited.
 *    Every role must possess an authoritative, valid permissions array with the explicit action grant.
 * 3. An action is granted IF AND ONLY IF it is explicitly present in the module's action list.
 * 4. 'view' does NOT imply 'edit' or 'export'.
 * 5. 'edit' does NOT imply 'publish' or 'approve'.
 * 6. 'create' does NOT imply 'assign'.
 */
export function hasPermission(
  role: Partial<IRole> | null | undefined,
  module: CRMModule,
  action: PermissionAction
): boolean {
  if (!role || typeof role !== 'object') {
    return false;
  }

  if (!role.permissions || !Array.isArray(role.permissions) || role.permissions.length === 0) {
    return false;
  }

  const moduleConfig = role.permissions.find(
    (p: any) => p && typeof p === 'object' && p.module === module
  );

  if (!moduleConfig || !Array.isArray(moduleConfig.actions) || moduleConfig.actions.length === 0) {
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
