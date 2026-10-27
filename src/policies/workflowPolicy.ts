import { CRMModule, IRole, PermissionAction } from '../types';
import { hasPermission } from './permissionPolicy';

export type WorkflowEntityType = 'property' | 'project' | 'website_content';

interface StateTransitionRule {
  from: string;
  to: string;
  requiredAction: PermissionAction;
  module: CRMModule;
  description: string;
}

const PROPERTY_WORKFLOW_RULES: StateTransitionRule[] = [
  {
    from: 'draft',
    to: 'verification',
    requiredAction: 'edit',
    module: 'properties',
    description: 'Submit property for operational verification',
  },
  {
    from: 'verification',
    to: 'approved',
    requiredAction: 'approve',
    module: 'properties',
    description: 'Verify and approve property listing',
  },
  {
    from: 'verification',
    to: 'draft',
    requiredAction: 'edit',
    module: 'properties',
    description: 'Send back to draft for revisions',
  },
  {
    from: 'approved',
    to: 'published',
    requiredAction: 'publish',
    module: 'properties',
    description: 'Publish property to public website inventory',
  },
  {
    from: 'published',
    to: 'draft',
    requiredAction: 'publish',
    module: 'properties',
    description: 'Unpublish property from public listings',
  },
];

const PROJECT_WORKFLOW_RULES: StateTransitionRule[] = [
  {
    from: 'draft',
    to: 'review',
    requiredAction: 'edit',
    module: 'projects',
    description: 'Submit project for management review',
  },
  {
    from: 'review',
    to: 'approved',
    requiredAction: 'approve',
    module: 'projects',
    description: 'Approve reviewed project specification',
  },
  {
    from: 'review',
    to: 'draft',
    requiredAction: 'edit',
    module: 'projects',
    description: 'Return project to draft state',
  },
  {
    from: 'approved',
    to: 'published',
    requiredAction: 'publish',
    module: 'projects',
    description: 'Publish project to public catalog',
  },
  {
    from: 'published',
    to: 'draft',
    requiredAction: 'publish',
    module: 'projects',
    description: 'Unpublish project',
  },
];

const WEBSITE_CONTENT_WORKFLOW_RULES: StateTransitionRule[] = [
  {
    from: 'draft',
    to: 'review',
    requiredAction: 'edit',
    module: 'website_cms',
    description: 'Submit website content for review',
  },
  {
    from: 'review',
    to: 'published',
    requiredAction: 'publish',
    module: 'website_cms',
    description: 'Publish website content',
  },
  {
    from: 'review',
    to: 'draft',
    requiredAction: 'edit',
    module: 'website_cms',
    description: 'Reject website content back to draft',
  },
  {
    from: 'published',
    to: 'draft',
    requiredAction: 'publish',
    module: 'website_cms',
    description: 'Unpublish website content',
  },
];

const WORKFLOW_REGISTRY: Record<WorkflowEntityType, StateTransitionRule[]> = {
  property: PROPERTY_WORKFLOW_RULES,
  project: PROJECT_WORKFLOW_RULES,
  website_content: WEBSITE_CONTENT_WORKFLOW_RULES,
};

export function canPerformWorkflowTransition(
  entityType: WorkflowEntityType,
  fromStatus: string,
  toStatus: string,
  role: Partial<IRole> | null | undefined
): { allowed: boolean; reason?: string } {
  if (!role) {
    return { allowed: false, reason: 'Authentication required' };
  }

  const rules = WORKFLOW_REGISTRY[entityType];
  if (!rules) {
    return { allowed: false, reason: `Unknown workflow entity type: ${entityType}` };
  }

  const rule = rules.find((r) => r.from === fromStatus && r.to === toStatus);
  if (!rule) {
    return {
      allowed: false,
      reason: `Invalid state transition from '${fromStatus}' to '${toStatus}' for ${entityType}`,
    };
  }

  const authorized = hasPermission(role, rule.module, rule.requiredAction);
  if (!authorized) {
    return {
      allowed: false,
      reason: `Role '${role.name || role.slug}' lacks required '${rule.requiredAction}' permission on '${rule.module}' module to execute transition`,
    };
  }

  return { allowed: true };
}

export function getNextValidStatuses(
  entityType: WorkflowEntityType,
  currentStatus: string
): string[] {
  const rules = WORKFLOW_REGISTRY[entityType] || [];
  return rules.filter((r) => r.from === currentStatus).map((r) => r.to);
}
