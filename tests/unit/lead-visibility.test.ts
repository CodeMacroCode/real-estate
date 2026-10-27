import { describe, it, expect } from 'vitest';
import {
  getLeadVisibilityFilter,
  canAccessLeadRecord,
  canAssignLead,
} from '../../src/policies/leadVisibilityPolicy';
import { IRole } from '../../src/types';

describe('C. Lead Visibility Enforcement (Section 50)', () => {
  const superAdminRole: Partial<IRole> = {
    name: 'Super Admin',
    slug: 'super_admin',
    leadVisibilityScope: 'company',
    permissions: [{ module: 'leads', actions: ['view', 'assign'] }],
  };

  const salesManagerRole: Partial<IRole> = {
    name: 'Sales Manager',
    slug: 'sales_manager',
    leadVisibilityScope: 'team',
    permissions: [{ module: 'leads', actions: ['view', 'assign'] }],
  };

  const salesExecRole: Partial<IRole> = {
    name: 'Sales Executive',
    slug: 'sales_executive',
    leadVisibilityScope: 'assigned',
    permissions: [{ module: 'leads', actions: ['view', 'create', 'edit'] }],
  };

  const user1 = {
    _id: '66f500000000000000000001',
    team: 'North Sales Team',
    branch: 'Downtown Branch',
  };

  const user2 = {
    _id: '66f500000000000000000002',
    team: 'South Sales Team',
    branch: 'Suburbs Branch',
  };

  it('should generate empty query filter ({}) for company-wide scope', () => {
    const filter = getLeadVisibilityFilter(user1, superAdminRole);
    expect(filter).toEqual({});
  });

  it('should generate team filter ({ team: user.team }) for team scope', () => {
    const filter = getLeadVisibilityFilter(user1, salesManagerRole);
    expect(filter).toEqual({ team: 'North Sales Team' });
  });

  it('should fallback to branch filter if user team is empty for team scope', () => {
    const userNoTeam = {
      _id: '66f500000000000000000003',
      branch: 'Downtown Branch',
    };
    const filter = getLeadVisibilityFilter(userNoTeam, salesManagerRole);
    expect(filter).toEqual({ branch: 'Downtown Branch' });
  });

  it('should generate assigned filter ({ assignedTo: user._id }) for assigned scope', () => {
    const filter = getLeadVisibilityFilter(user1, salesExecRole);
    expect(filter).toEqual({ assignedTo: user1._id });
  });

  it('CRITICAL: Missing user, role, or invalid scope must fail closed with { _id: null }', () => {
    expect(getLeadVisibilityFilter(null, salesExecRole)).toEqual({ _id: null });
    expect(getLeadVisibilityFilter(user1, null)).toEqual({ _id: null });
    expect(
      getLeadVisibilityFilter(user1, { ...salesExecRole, leadVisibilityScope: 'invalid' as any })
    ).toEqual({ _id: null });
  });

  describe('canAccessLeadRecord (Protection against ID tampering)', () => {
    const leadAssignedToUser1 = {
      _id: 'lead-001',
      assignedTo: user1._id,
      team: 'North Sales Team',
      branch: 'Downtown Branch',
    };

    const leadAssignedToUser2 = {
      _id: 'lead-002',
      assignedTo: user2._id,
      team: 'South Sales Team',
      branch: 'Suburbs Branch',
    };

    it('should allow user1 to access their assigned lead under assigned scope', () => {
      expect(canAccessLeadRecord(user1, salesExecRole, leadAssignedToUser1)).toBe(true);
    });

    it('CRITICAL: should reject user1 accessing user2 lead under assigned scope (prevent ID tampering)', () => {
      expect(canAccessLeadRecord(user1, salesExecRole, leadAssignedToUser2)).toBe(false);
    });

    it('should permit team manager to access leads in the same team', () => {
      expect(canAccessLeadRecord(user1, salesManagerRole, leadAssignedToUser1)).toBe(true);
    });

    it('CRITICAL: should reject team manager accessing leads from a different team', () => {
      expect(canAccessLeadRecord(user1, salesManagerRole, leadAssignedToUser2)).toBe(false);
    });

    it('should permit company-wide user (Super Admin) to access any lead', () => {
      expect(canAccessLeadRecord(user1, superAdminRole, leadAssignedToUser1)).toBe(true);
      expect(canAccessLeadRecord(user1, superAdminRole, leadAssignedToUser2)).toBe(true);
    });
  });

  describe('canAssignLead', () => {
    it('should allow assign action for roles with assign permission (Manager, Admin)', () => {
      expect(canAssignLead(salesManagerRole)).toBe(true);
      expect(canAssignLead(superAdminRole)).toBe(true);
    });

    it('should deny assign action for roles without assign permission (Sales Executive)', () => {
      expect(canAssignLead(salesExecRole)).toBe(false);
    });
  });
});
