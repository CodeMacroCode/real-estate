import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';

const {
  mockGetAuthenticatedContext,
  mockConnectToDatabase,
  mockListDomains,
  mockCreateDomain,
  mockGetDomainById,
  mockUpdateDomain,
  mockSetPrimaryDomain,
  mockDeleteDomain,
  mockResolveTenantByHostname,
  mockGetPublicProperties,
  mockGetPublicPropertyBySlug,
  mockResolveAdminByHostOrSlug,
  mockIngestWebsiteInquiry,
  mockRoleFind,
  mockUserFind,
} = vi.hoisted(() => ({
  mockGetAuthenticatedContext: vi.fn(),
  mockConnectToDatabase: vi.fn().mockResolvedValue(undefined),
  mockListDomains: vi.fn(),
  mockCreateDomain: vi.fn(),
  mockGetDomainById: vi.fn(),
  mockUpdateDomain: vi.fn(),
  mockSetPrimaryDomain: vi.fn(),
  mockDeleteDomain: vi.fn(),
  mockResolveTenantByHostname: vi.fn(),
  mockGetPublicProperties: vi.fn(),
  mockGetPublicPropertyBySlug: vi.fn(),
  mockResolveAdminByHostOrSlug: vi.fn(),
  mockIngestWebsiteInquiry: vi.fn(),
  mockRoleFind: vi.fn(),
  mockUserFind: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  getAuthenticatedContext: mockGetAuthenticatedContext,
}));

vi.mock('@/lib/mongodb/db', () => ({
  connectToDatabase: mockConnectToDatabase,
}));

vi.mock('@/models/Role', () => ({
  Role: { find: mockRoleFind },
}));

vi.mock('@/models/User', () => ({
  User: { find: mockUserFind },
}));

vi.mock('@/services/domainService', async () => {
  const actual = await vi.importActual<typeof import('@/services/domainService')>(
    '@/services/domainService',
  );
  return {
    DomainServiceError: actual.DomainServiceError,
    listDomains: mockListDomains,
    createDomain: mockCreateDomain,
    getDomainById: mockGetDomainById,
    updateDomain: mockUpdateDomain,
    setPrimaryDomain: mockSetPrimaryDomain,
    deleteDomain: mockDeleteDomain,
    resolveTenantByHostname: mockResolveTenantByHostname,
  };
});

vi.mock('@/services/publicPortalService', () => ({
  getPublicProperties: mockGetPublicProperties,
  getPublicPropertyBySlug: mockGetPublicPropertyBySlug,
  resolveAdminByHostOrSlug: mockResolveAdminByHostOrSlug,
}));

vi.mock('@/services/leadIngestionService', () => ({
  ingestWebsiteInquiry: mockIngestWebsiteInquiry,
}));

import { GET as listDomainsHandler, POST as createDomainHandler } from '@/app/api/domains/route';
import {
  GET as getDomainHandler,
  PATCH as patchDomainHandler,
  DELETE as deleteDomainHandler,
} from '@/app/api/domains/[id]/route';
import { GET as publicPropertiesHandler } from '@/app/api/public/properties/route';
import { GET as publicPropertyDetailHandler } from '@/app/api/public/properties/[slug]/route';
import { POST as publicInquiriesHandler } from '@/app/api/public/inquiries/route';
import { DomainServiceError } from '@/services/domainService';

describe('Integration: Custom Domains API & Multi-Tenant Public Route Isolation', () => {
  const superAdminId = new mongoose.Types.ObjectId().toString();
  const agency1Id = new mongoose.Types.ObjectId().toString();
  const agency2Id = new mongoose.Types.ObjectId().toString();
  const domain1Id = new mongoose.Types.ObjectId().toString();
  const domain2Id = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dashboard /api/domains & /api/domains/[id] RBAC', () => {
    it('rejects unauthenticated requests with 401 and non-admin roles with 403', async () => {
      mockGetAuthenticatedContext.mockResolvedValueOnce(null);
      const unauthRes = await listDomainsHandler(
        new NextRequest('http://localhost:3000/api/domains'),
      );
      expect(unauthRes.status).toBe(401);

      mockGetAuthenticatedContext.mockResolvedValueOnce({
        user: { _id: agency1Id },
        role: { slug: 'sales_executive' },
      });
      const forbiddenRes = await listDomainsHandler(
        new NextRequest('http://localhost:3000/api/domains'),
      );
      expect(forbiddenRes.status).toBe(403);
    });

    it('scopes admin GET/POST /api/domains to their own agencyId while allowing super_admin cross-agency access', async () => {
      // Admin listing ignores ?agencyId=agency2Id and ?includeAgencies=true
      mockGetAuthenticatedContext.mockResolvedValueOnce({
        user: { _id: agency1Id },
        role: { slug: 'admin' },
      });
      mockListDomains.mockResolvedValueOnce({
        domains: [{ id: domain1Id, agencyId: agency1Id, hostname: 'portal.agency1.com' }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const adminListRes = await listDomainsHandler(
        new NextRequest(
          `http://localhost:3000/api/domains?agencyId=${agency2Id}&includeAgencies=true`,
        ),
      );
      expect(adminListRes.status).toBe(200);
      expect(mockListDomains).toHaveBeenCalledWith(
        expect.objectContaining({ agencyId: agency1Id }),
      );
      const adminListJson = await adminListRes.json();
      expect(adminListJson.data.agencies).toBeUndefined();

      // Super Admin can filter by agency2Id and request includeAgencies=true
      mockGetAuthenticatedContext.mockResolvedValueOnce({
        user: { _id: superAdminId },
        role: { slug: 'super_admin' },
      });
      mockListDomains.mockResolvedValueOnce({
        domains: [{ id: domain2Id, agencyId: agency2Id, hostname: 'portal.agency2.com' }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      mockRoleFind.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([{ _id: new mongoose.Types.ObjectId() }]),
      });
      mockUserFind.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          {
            _id: new mongoose.Types.ObjectId(agency2Id),
            name: 'Agency Two',
            email: 'two@agency.com',
            agencyName: 'Agency Two Realty',
            agencySlug: 'agency-two',
          },
        ]),
      });

      const superListRes = await listDomainsHandler(
        new NextRequest(
          `http://localhost:3000/api/domains?agencyId=${agency2Id}&includeAgencies=true`,
        ),
      );
      expect(superListRes.status).toBe(200);
      expect(mockListDomains).toHaveBeenLastCalledWith(
        expect.objectContaining({ agencyId: agency2Id }),
      );
      const superListJson = await superListRes.json();
      expect(superListJson.data.agencies).toHaveLength(1);
    });

    it('locks POST /api/domains agencyId for admin and returns 409 on duplicate hostname', async () => {
      mockGetAuthenticatedContext.mockResolvedValueOnce({
        user: { _id: agency1Id },
        role: { slug: 'admin' },
      });
      mockCreateDomain.mockResolvedValueOnce({
        id: domain1Id,
        agencyId: agency1Id,
        hostname: 'portal.agency1.com',
        isPrimary: true,
        isActive: true,
      });

      const createRes = await createDomainHandler(
        new NextRequest('http://localhost:3000/api/domains', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            agencyId: agency2Id, // should be ignored for admin
            hostname: 'portal.agency1.com',
            isPrimary: true,
          }),
        }),
      );
      expect(createRes.status).toBe(201);
      expect(mockCreateDomain).toHaveBeenCalledWith(
        expect.objectContaining({ agencyId: agency1Id, hostname: 'portal.agency1.com' }),
      );

      // Duplicate hostname -> 409
      mockGetAuthenticatedContext.mockResolvedValueOnce({
        user: { _id: superAdminId },
        role: { slug: 'super_admin' },
      });
      mockCreateDomain.mockRejectedValueOnce(
        new DomainServiceError('Hostname "portal.agency1.com" is already registered.', 409),
      );

      const dupRes = await createDomainHandler(
        new NextRequest('http://localhost:3000/api/domains', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            agencyId: agency2Id,
            hostname: 'portal.agency1.com',
          }),
        }),
      );
      expect(dupRes.status).toBe(409);
    });

    it('prevents admin from managing another agency domain on /api/domains/[id] and allows super_admin', async () => {
      // Admin tries to GET / PATCH / DELETE agency2's domain -> 403
      mockGetAuthenticatedContext.mockResolvedValue({
        user: { _id: agency1Id },
        role: { slug: 'admin' },
      });
      mockGetDomainById.mockResolvedValue({
        id: domain2Id,
        agencyId: agency2Id,
        hostname: 'portal.agency2.com',
        isPrimary: false,
        isActive: true,
      });

      const getOther = await getDomainHandler(
        new NextRequest(`http://localhost:3000/api/domains/${domain2Id}`),
        { params: Promise.resolve({ id: domain2Id }) },
      );
      expect(getOther!.status).toBe(403);

      const patchOther = await patchDomainHandler(
        new NextRequest(`http://localhost:3000/api/domains/${domain2Id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ isActive: false }),
        }),
        { params: Promise.resolve({ id: domain2Id }) },
      );
      expect(patchOther!.status).toBe(403);

      const deleteOther = await deleteDomainHandler(
        new NextRequest(`http://localhost:3000/api/domains/${domain2Id}`, {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: domain2Id }) },
      );
      expect(deleteOther!.status).toBe(403);

      // Admin promotes their own domain to primary via PATCH { isPrimary: true }
      mockGetDomainById.mockResolvedValueOnce({
        id: domain1Id,
        agencyId: agency1Id,
        hostname: 'portal.agency1.com',
        isPrimary: false,
        isActive: true,
      });
      mockSetPrimaryDomain.mockResolvedValueOnce({
        id: domain1Id,
        agencyId: agency1Id,
        hostname: 'portal.agency1.com',
        isPrimary: true,
        isActive: true,
      });

      const promoteRes = await patchDomainHandler(
        new NextRequest(`http://localhost:3000/api/domains/${domain1Id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ isPrimary: true }),
        }),
        { params: Promise.resolve({ id: domain1Id }) },
      );
      expect(promoteRes!.status).toBe(200);
      expect(mockSetPrimaryDomain).toHaveBeenCalledWith(domain1Id);

      // Super Admin can delete agency2's domain
      mockGetAuthenticatedContext.mockResolvedValueOnce({
        user: { _id: superAdminId },
        role: { slug: 'super_admin' },
      });
      mockGetDomainById.mockResolvedValueOnce({
        id: domain2Id,
        agencyId: agency2Id,
        hostname: 'portal.agency2.com',
      });
      mockDeleteDomain.mockResolvedValueOnce({
        id: domain2Id,
        agencyId: agency2Id,
        hostname: 'portal.agency2.com',
      });

      const superDeleteRes = await deleteDomainHandler(
        new NextRequest(`http://localhost:3000/api/domains/${domain2Id}`, {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: domain2Id }) },
      );
      expect(superDeleteRes!.status).toBe(200);
      expect(mockDeleteDomain).toHaveBeenCalledWith(domain2Id);
    });
  });

  describe('Public API Custom Domain Tenant Isolation & Platform Compatibility', () => {
    it('GET /api/public/properties locks tenant to custom domain and ignores ?adminId= and ?agency= overrides', async () => {
      mockResolveTenantByHostname.mockResolvedValueOnce({
        adminId: agency1Id,
        agencyName: 'Agency One',
        agencySlug: 'agency-one',
        hostname: 'portal.agency1.com',
        isPrimary: true,
        settings: {},
      });
      mockGetPublicProperties.mockResolvedValueOnce({
        properties: [{ propertyId: 'PROP-1', title: 'Agency 1 Condo' }],
        pagination: { total: 1, page: 1, limit: 12, pages: 1 },
      });

      const req = new NextRequest(
        `https://portal.agency1.com/api/public/properties?adminId=${agency2Id}&agency=agency-two`,
        {
          headers: {
            host: 'portal.agency1.com',
          },
        },
      );
      const res = await publicPropertiesHandler(req);
      expect(res.status).toBe(200);
      expect(mockResolveTenantByHostname).toHaveBeenCalledWith('portal.agency1.com');
      expect(mockGetPublicProperties).toHaveBeenCalledWith(
        expect.objectContaining({ adminId: agency1Id }),
      );
    });

    it('GET /api/public/properties rejects unknown/inactive custom domain with 404', async () => {
      mockResolveTenantByHostname.mockResolvedValueOnce(null);

      const req = new NextRequest('https://unknown.agency.com/api/public/properties', {
        headers: { host: 'unknown.agency.com' },
      });
      const res = await publicPropertiesHandler(req);
      expect(res.status).toBe(404);
      expect(mockGetPublicProperties).not.toHaveBeenCalled();
    });

    it('GET /api/public/properties supports ?agency= on platform host and rejects missing agency context with 400', async () => {
      mockResolveAdminByHostOrSlug.mockResolvedValueOnce({
        adminId: agency2Id,
        agencyName: 'Agency Two',
        agencySlug: 'agency-two',
      });
      mockGetPublicProperties.mockResolvedValueOnce({
        properties: [{ propertyId: 'PROP-2', title: 'Agency 2 Loft' }],
        pagination: { total: 1, page: 1, limit: 12, pages: 1 },
      });

      const platformReq = new NextRequest(
        'http://localhost:3000/api/public/properties?agency=agency-two',
        { headers: { host: 'localhost:3000' } },
      );
      const platformRes = await publicPropertiesHandler(platformReq);
      expect(platformRes.status).toBe(200);
      expect(mockResolveAdminByHostOrSlug).toHaveBeenCalledWith('agency-two');
      expect(mockGetPublicProperties).toHaveBeenCalledWith(
        expect.objectContaining({ adminId: agency2Id }),
      );

      // Missing adminId/agency on platform host -> 400
      const missingReq = new NextRequest('http://localhost:3000/api/public/properties', {
        headers: { host: 'localhost:3000' },
      });
      const missingRes = await publicPropertiesHandler(missingReq);
      expect(missingRes.status).toBe(400);
    });

    it('GET /api/public/properties/[slug] locks detail lookup to custom domain and prevents cross-agency access', async () => {
      mockResolveTenantByHostname.mockResolvedValueOnce({
        adminId: agency1Id,
        agencyName: 'Agency One',
        agencySlug: 'agency-one',
        hostname: 'portal.agency1.com',
        isPrimary: true,
        settings: {},
      });
      // Property belongs to agency2, so scoped lookup for agency1 returns null
      mockGetPublicPropertyBySlug.mockResolvedValueOnce(null);

      const req = new NextRequest(
        `https://portal.agency1.com/api/public/properties/agency2-villa?adminId=${agency2Id}`,
        { headers: { host: 'portal.agency1.com' } },
      );
      const res = await publicPropertyDetailHandler(req, {
        params: Promise.resolve({ slug: 'agency2-villa' }),
      });

      expect(res.status).toBe(404);
      expect(mockGetPublicPropertyBySlug).toHaveBeenCalledWith('agency2-villa', agency1Id);

      // Unknown custom domain -> 404
      mockResolveTenantByHostname.mockResolvedValueOnce(null);
      const unknownRes = await publicPropertyDetailHandler(
        new NextRequest('https://unknown.agency.com/api/public/properties/any-slug', {
          headers: { host: 'unknown.agency.com' },
        }),
        { params: Promise.resolve({ slug: 'any-slug' }) },
      );
      expect(unknownRes.status).toBe(404);
    });

    it('POST /api/public/inquiries locks lead ingestion adminId to custom domain and ignores body.adminId', async () => {
      mockResolveTenantByHostname.mockResolvedValueOnce({
        adminId: agency1Id,
        agencyName: 'Agency One',
        agencySlug: 'agency-one',
        hostname: 'portal.agency1.com',
        isPrimary: true,
        settings: {},
      });
      mockIngestWebsiteInquiry.mockResolvedValueOnce({
        leadId: 'LEAD-1',
        deduplicated: false,
      });

      const req = new NextRequest('https://portal.agency1.com/api/public/inquiries', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-host': 'portal.agency1.com',
        },
        body: JSON.stringify({
          adminId: agency2Id, // should be ignored on custom domain
          name: 'Visitor Name',
          phone: '+919876543210',
          inquiryType: 'Contact',
          message: 'Interested in property',
        }),
      });
      const res = await publicInquiriesHandler(req);
      expect(res.status).toBe(201);
      expect(mockIngestWebsiteInquiry).toHaveBeenCalledWith(
        expect.objectContaining({
          adminId: agency1Id,
          name: 'Visitor Name',
          phone: '+919876543210',
        }),
      );

      // Unknown custom domain -> 404
      mockResolveTenantByHostname.mockResolvedValueOnce(null);
      const unknownRes = await publicInquiriesHandler(
        new NextRequest('https://unknown.agency.com/api/public/inquiries', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            host: 'unknown.agency.com',
          },
          body: JSON.stringify({
            name: 'Visitor Name',
            phone: '+919876543210',
          }),
        }),
      );
      expect(unknownRes.status).toBe(404);
    });
  });
});
