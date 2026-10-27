import { describe, it, expect } from 'vitest';
import {
  canPerformWorkflowTransition,
  getNextValidStatuses,
} from '../../src/policies/workflowPolicy';
import { IRole } from '../../src/types';

describe('G. Approval and Controlled Publishing Workflows (Section 51)', () => {
  const superAdminRole: Partial<IRole> = {
    name: 'Super Admin',
    slug: 'super_admin',
    permissions: [
      { module: 'properties', actions: ['edit', 'approve', 'publish'] },
      { module: 'projects', actions: ['edit', 'approve', 'publish'] },
      { module: 'website_cms', actions: ['edit', 'publish'] },
    ],
  };

  const propertyManagerRole: Partial<IRole> = {
    name: 'Property Manager',
    slug: 'property_manager',
    permissions: [
      { module: 'properties', actions: ['view', 'create', 'edit', 'approve'] }, // Has approve, NOT publish
    ],
  };

  const salesExecRole: Partial<IRole> = {
    name: 'Sales Executive',
    slug: 'sales_executive',
    permissions: [
      { module: 'properties', actions: ['view', 'create', 'edit'] }, // Has edit, NOT approve or publish
    ],
  };

  const websiteManagerRole: Partial<IRole> = {
    name: 'Website Manager',
    slug: 'website_manager',
    permissions: [
      { module: 'website_cms', actions: ['view', 'edit', 'publish'] },
      { module: 'properties', actions: ['view', 'edit'] }, // Has edit on properties, NOT publish on properties
    ],
  };

  describe('Property Workflow: draft -> verification -> approved -> published', () => {
    it('should retrieve correct sequential transition statuses', () => {
      expect(getNextValidStatuses('property', 'draft')).toEqual(['verification']);
      expect(getNextValidStatuses('property', 'verification')).toEqual(['approved', 'draft']);
      expect(getNextValidStatuses('property', 'approved')).toEqual(['published']);
      expect(getNextValidStatuses('property', 'published')).toEqual(['draft']);
    });

    it('should allow sales exec to submit draft to verification (requires edit)', () => {
      const result = canPerformWorkflowTransition('property', 'draft', 'verification', salesExecRole);
      expect(result.allowed).toBe(true);
    });

    it('should allow property manager to approve from verification (requires approve)', () => {
      const result = canPerformWorkflowTransition('property', 'verification', 'approved', propertyManagerRole);
      expect(result.allowed).toBe(true);
    });

    it('CRITICAL: should reject sales exec from approving from verification (lacks approve)', () => {
      const result = canPerformWorkflowTransition('property', 'verification', 'approved', salesExecRole);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('lacks required \'approve\' permission');
    });

    it('CRITICAL: should reject property manager from publishing approved property (lacks publish)', () => {
      const result = canPerformWorkflowTransition('property', 'approved', 'published', propertyManagerRole);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('lacks required \'publish\' permission');
    });

    it('CRITICAL: should reject website manager from publishing property if only granted CMS publish', () => {
      const result = canPerformWorkflowTransition('property', 'approved', 'published', websiteManagerRole);
      expect(result.allowed).toBe(false);
    });

    it('should allow Super Admin to execute all transitions including publish', () => {
      expect(canPerformWorkflowTransition('property', 'approved', 'published', superAdminRole).allowed).toBe(true);
      expect(canPerformWorkflowTransition('property', 'published', 'draft', superAdminRole).allowed).toBe(true);
    });

    it('CRITICAL: should reject invalid workflow jump from draft directly to published (skipping verification)', () => {
      const result = canPerformWorkflowTransition('property', 'draft', 'published', superAdminRole);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Invalid state transition');
    });
  });

  describe('Project Workflow: draft -> review -> approved -> published', () => {
    it('should retrieve correct next statuses for projects', () => {
      expect(getNextValidStatuses('project', 'draft')).toEqual(['review']);
      expect(getNextValidStatuses('project', 'review')).toEqual(['approved', 'draft']);
      expect(getNextValidStatuses('project', 'approved')).toEqual(['published']);
    });

    it('should reject invalid project transition', () => {
      const result = canPerformWorkflowTransition('project', 'draft', 'approved', superAdminRole);
      expect(result.allowed).toBe(false);
    });
  });

  describe('Website Content Workflow: draft -> review -> published', () => {
    it('should allow website manager to publish reviewed website content', () => {
      const result = canPerformWorkflowTransition('website_content', 'review', 'published', websiteManagerRole);
      expect(result.allowed).toBe(true);
    });

    it('CRITICAL: should reject sales executive from publishing website content', () => {
      const result = canPerformWorkflowTransition('website_content', 'review', 'published', salesExecRole);
      expect(result.allowed).toBe(false);
    });
  });
});
