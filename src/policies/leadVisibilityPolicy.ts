import { LeadVisibilityScope, IRole, SafeUser } from '../types';
import { hasPermission } from './permissionPolicy';

export interface LeadRecord {
  _id: string;
  assignedTo?: string | null;
  team?: string | null;
  branch?: string | null;
  [key: string]: any;
}

/**
 * Builds a server-side MongoDB filter query for leads based on the user's role and visibility scope.
 * 
 * Scopes:
 * - 'company': Returns {} (unrestricted company-wide query).
 * - 'team': Returns { team: user.team } if team is set, otherwise { branch: user.branch }.
 * - 'assigned': Returns { assignedTo: user._id }.
 * - Any invalid or absent scope fails closed with { _id: null }.
 */
export function getLeadVisibilityFilter(
  user: { _id?: string; team?: string; branch?: string } | null | undefined,
  role: Partial<IRole> | null | undefined
): Record<string, any> {
  if (!user || !role) {
    // Fail-closed
    return { _id: null };
  }

  // Determine effective visibility scope: role-level or lead module override
  const leadModuleConfig = role.permissions?.find((p) => p.module === 'leads');
  const scope: LeadVisibilityScope =
    leadModuleConfig?.leadVisibilityScope || role.leadVisibilityScope || 'assigned';

  if (role.slug === 'super_admin' || scope === 'company') {
    return {};
  }

  if (scope === 'team') {
    if (user.team && user.team.trim().length > 0) {
      return { team: user.team };
    }
    if (user.branch && user.branch.trim().length > 0) {
      return { branch: user.branch };
    }
    // If user has no team or branch, restrict to assigned
    return user._id ? { assignedTo: user._id } : { _id: null };
  }

  if (scope === 'assigned') {
    if (!user._id) {
      return { _id: null };
    }
    return { assignedTo: user._id };
  }

  // Unknown scope fails closed
  return { _id: null };
}

/**
 * Verifies whether a specific user can access a specific lead record.
 * Protects against URL/ID parameter tampering.
 */
export function canAccessLeadRecord(
  user: { _id?: string; team?: string; branch?: string } | null | undefined,
  role: Partial<IRole> | null | undefined,
  lead: LeadRecord | null | undefined
): boolean {
  if (!user || !role || !lead) {
    return false;
  }

  if (!hasPermission(role, 'leads', 'view')) {
    return false;
  }

  if (role.slug === 'super_admin') {
    return true;
  }

  const leadModuleConfig = role.permissions?.find((p) => p.module === 'leads');
  const scope: LeadVisibilityScope =
    leadModuleConfig?.leadVisibilityScope || role.leadVisibilityScope || 'assigned';

  if (scope === 'company') {
    return true;
  }

  if (scope === 'team') {
    if (user.team && lead.team && user.team === lead.team) {
      return true;
    }
    if (user.branch && lead.branch && user.branch === lead.branch) {
      return true;
    }
    // Also permit if assigned directly to user
    return Boolean(user._id && lead.assignedTo && String(user._id) === String(lead.assignedTo));
  }

  if (scope === 'assigned') {
    return Boolean(user._id && lead.assignedTo && String(user._id) === String(lead.assignedTo));
  }

  return false;
}

/**
 * Verifies if user has authority to assign or reassign a lead
 */
export function canAssignLead(role: Partial<IRole> | null | undefined): boolean {
  return hasPermission(role, 'leads', 'assign');
}
