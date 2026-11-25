import { describe, it, expect, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';

// Hoisted mocks for Mongoose models & services
const {
  mockConnectToDatabase,
  mockAgencyDomainFindOne,
  mockAgencyDomainFind,
  mockAgencyDomainCountDocuments,
  mockAgencyDomainFindById,
  mockAgencyDomainCreate,
  mockAgencyDomainUpdateMany,
  mockAgencyDomainFindByIdAndUpdate,
  mockAgencyDomainFindByIdAndDelete,
  mockUserFindById,
  mockUserFindOne,
  mockPropertyFindOne,
  mockGetWebsiteSettingsByAdminId,
} = vi.hoisted(() => ({
  mockConnectToDatabase: vi.fn().mockResolvedValue(undefined),
  mockAgencyDomainFindOne: vi.fn(),
  mockAgencyDomainFind: vi.fn(),
  mockAgencyDomainCountDocuments: vi.fn(),
  mockAgencyDomainFindById: vi.fn(),
  mockAgencyDomainCreate: vi.fn(),
  mockAgencyDomainUpdateMany: vi.fn(),
  mockAgencyDomainFindByIdAndUpdate: vi.fn(),
  mockAgencyDomainFindByIdAndDelete: vi.fn(),
  mockUserFindById: vi.fn(),
  mockUserFindOne: vi.fn(),
  mockPropertyFindOne: vi.fn(),
  mockGetWebsiteSettingsByAdminId: vi.fn(),
}));

vi.mock('@/lib/mongodb/db', () => ({
  connectToDatabase: mockConnectToDatabase,
}));

vi.mock('@/models/AgencyDomain', () => ({
  AgencyDomain: {
    findOne: mockAgencyDomainFindOne,
    find: mockAgencyDomainFind,
    countDocuments: mockAgencyDomainCountDocuments,
    findById: mockAgencyDomainFindById,
    create: mockAgencyDomainCreate,
    updateMany: mockAgencyDomainUpdateMany,
    findByIdAndUpdate: mockAgencyDomainFindByIdAndUpdate,
    findByIdAndDelete: mockAgencyDomainFindByIdAndDelete,
  },
}));

vi.mock('@/models/User', () => ({
  User: {
    findById: mockUserFindById,
    findOne: mockUserFindOne,
  },
}));

vi.mock('@/models/Role', () => ({}));

vi.mock('@/models/Property', () => ({
  Property: {
    findOne: mockPropertyFindOne,
  },
}));

vi.mock('@/models/Project', () => ({
  Project: {},
}));

vi.mock('@/models/WebsiteSetting', () => ({
  WebsiteSetting: {},
}));

vi.mock('@/services/websiteSettingService', () => ({
  getWebsiteSettingsByAdminId: mockGetWebsiteSettingsByAdminId,
}));

import {
  normalizeHostname,
  isValidHostname,
  isPlatformHost,
} from '@/lib/domains/normalize';
import {
  createDomain,
  updateDomain,
  deleteDomain,
  setPrimaryDomain,
  resolveTenantByHostname,
  invalidateDomainCache,
  DomainServiceError,
} from '@/services/domainService';
import { getPublicPropertyBySlug } from '@/services/publicPortalService';

function makeLeanChain(value: any) {
  return {
    populate: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(value),
  };
}

describe('Unit: Domain Normalization, Validation & Platform Host Detection', () => {
  it('normalizeHostname strips protocols, userinfo, paths, queries, ports, and trailing dots', () => {
    expect(normalizeHostname('HTTPS://Portal.Agency.COM/listings?page=2#top')).toBe(
      'portal.agency.com',
    );
    expect(normalizeHostname('http://user:pass@Homes.Example.org:8443/path')).toBe(
      'homes.example.org',
    );
    expect(normalizeHostname('//sub.domain.co.uk:3000/')).toBe('sub.domain.co.uk');
    expect(normalizeHostname('  agency.in.  ')).toBe('agency.in');
    expect(normalizeHostname('[::1]:3000')).toBe('[::1]');
    expect(normalizeHostname('localhost:3000')).toBe('localhost');
    expect(normalizeHostname('')).toBe('');
    expect(normalizeHostname(null as unknown as string)).toBe('');
  });

  it('isValidHostname accepts valid domains/subdomains and punycode TLDs', () => {
    expect(isValidHostname('agency.com')).toBe(true);
    expect(isValidHostname('portal.agency.com')).toBe(true);
    expect(isValidHostname('my-realty-1.co.in')).toBe(true);
    expect(isValidHostname('example.xn--p1ai')).toBe(true);
  });

  it('isValidHostname rejects invalid hostnames, IPs, ports, paths, and whitespace', () => {
    expect(isValidHostname('')).toBe(false);
    expect(isValidHostname('localhost')).toBe(false);
    expect(isValidHostname('192.168.1.1')).toBe(false);
    expect(isValidHostname('portal.agency.com:3000')).toBe(false);
    expect(isValidHostname('portal.agency.com/path')).toBe(false);
    expect(isValidHostname(' portal.agency.com')).toBe(false);
    expect(isValidHostname('.agency.com')).toBe(false);
    expect(isValidHostname('agency..com')).toBe(false);
    expect(isValidHostname('-bad.agency.com')).toBe(false);
    expect(isValidHostname('agency.c')).toBe(false);
    expect(isValidHostname(`${'a'.repeat(64)}.com`)).toBe(false);
  });

  it('isPlatformHost identifies built-in and env-configured platform hosts', () => {
    expect(isPlatformHost('localhost')).toBe(true);
    expect(isPlatformHost('http://localhost:3000')).toBe(true);
    expect(isPlatformHost('127.0.0.1:3000')).toBe(true);
    expect(isPlatformHost('[::1]:3000')).toBe(true);
    expect(isPlatformHost('property-management-system.run.place')).toBe(true);
    expect(isPlatformHost('portal.agency.com')).toBe(false);
    expect(isPlatformHost('')).toBe(false);

    const prev = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN;
    process.env.NEXT_PUBLIC_PLATFORM_DOMAIN = 'https://crm.myplatform.io:443';
    try {
      expect(isPlatformHost('crm.myplatform.io')).toBe(true);
      expect(isPlatformHost('other.myplatform.io')).toBe(false);
    } finally {
      if (prev === undefined) {
        delete process.env.NEXT_PUBLIC_PLATFORM_DOMAIN;
      } else {
        process.env.NEXT_PUBLIC_PLATFORM_DOMAIN = prev;
      }
    }
  });
});

describe('Unit: domainService (Creation, Primary Domain, Cache & Tenant Resolution)', () => {
  const agencyId1 = new mongoose.Types.ObjectId().toString();
  const domainId1 = new mongoose.Types.ObjectId().toString();
  const domainId2 = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
    invalidateDomainCache();
    mockAgencyDomainUpdateMany.mockResolvedValue({ modifiedCount: 0 });
    mockGetWebsiteSettingsByAdminId.mockResolvedValue({
      branding: { companyName: 'Apex Realty' },
    });
  });

  it('creates a domain with normalized hostname and allows multiple domains per agency', async () => {
    mockUserFindById.mockReturnValue(
      makeLeanChain({
        _id: new mongoose.Types.ObjectId(agencyId1),
        status: 'active',
        roleId: { slug: 'admin' },
      }),
    );
    mockAgencyDomainFindOne.mockReturnValue(makeLeanChain(null));

    mockAgencyDomainCreate
      .mockResolvedValueOnce({
        _id: new mongoose.Types.ObjectId(domainId1),
        toObject: () => ({}),
      })
      .mockResolvedValueOnce({
        _id: new mongoose.Types.ObjectId(domainId2),
        toObject: () => ({}),
      });

    mockAgencyDomainFindById
      .mockReturnValueOnce(
        makeLeanChain({
          _id: new mongoose.Types.ObjectId(domainId1),
          agencyId: {
            _id: new mongoose.Types.ObjectId(agencyId1),
            name: 'Apex Owner',
            email: 'owner@apex.com',
            agencyName: 'Apex Realty',
            agencySlug: 'apex',
          },
          hostname: 'portal.apex.com',
          isPrimary: true,
          isActive: true,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        }),
      )
      .mockReturnValueOnce(
        makeLeanChain({
          _id: new mongoose.Types.ObjectId(domainId2),
          agencyId: {
            _id: new mongoose.Types.ObjectId(agencyId1),
            name: 'Apex Owner',
            email: 'owner@apex.com',
            agencyName: 'Apex Realty',
            agencySlug: 'apex',
          },
          hostname: 'homes.apex.com',
          isPrimary: false,
          isActive: true,
          createdAt: new Date('2026-01-02T00:00:00Z'),
          updatedAt: new Date('2026-01-02T00:00:00Z'),
        }),
      );

    const first = await createDomain({
      agencyId: agencyId1,
      hostname: 'HTTPS://Portal.Apex.COM:3000/home',
      isPrimary: true,
    });
    expect(first.hostname).toBe('portal.apex.com');
    expect(first.isPrimary).toBe(true);
    expect(mockAgencyDomainUpdateMany).toHaveBeenCalledWith(
      { agencyId: new mongoose.Types.ObjectId(agencyId1), isPrimary: true },
      { $set: { isPrimary: false } },
    );

    const second = await createDomain({
      agencyId: agencyId1,
      hostname: 'homes.apex.com',
      isPrimary: false,
    });
    expect(second.hostname).toBe('homes.apex.com');
    expect(second.isPrimary).toBe(false);
    expect(second.agencyId).toBe(agencyId1);
  });

  it('rejects duplicate hostnames with 409 DomainServiceError', async () => {
    mockUserFindById.mockReturnValue(
      makeLeanChain({
        _id: new mongoose.Types.ObjectId(agencyId1),
        status: 'active',
        roleId: { slug: 'admin' },
      }),
    );
    mockAgencyDomainFindOne.mockReturnValue(
      makeLeanChain({ _id: new mongoose.Types.ObjectId(domainId1) }),
    );

    await expect(
      createDomain({
        agencyId: agencyId1,
        hostname: 'portal.apex.com',
      }),
    ).rejects.toMatchObject({
      name: 'DomainServiceError',
      statusCode: 409,
    });
  });

  it('rejects platform hostnames and invalid hostnames with 400', async () => {
    mockUserFindById.mockReturnValue(
      makeLeanChain({
        _id: new mongoose.Types.ObjectId(agencyId1),
        status: 'active',
        roleId: { slug: 'admin' },
      }),
    );

    await expect(
      createDomain({ agencyId: agencyId1, hostname: 'localhost:3000' }),
    ).rejects.toBeInstanceOf(DomainServiceError);

    await expect(
      createDomain({ agencyId: agencyId1, hostname: 'not a host' }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('setPrimaryDomain demotes previous primary domain for the agency and invalidates cache', async () => {
    const agencyObjId = new mongoose.Types.ObjectId(agencyId1);
    const targetObjId = new mongoose.Types.ObjectId(domainId2);

    mockAgencyDomainFindById.mockReturnValue(
      makeLeanChain({
        _id: targetObjId,
        agencyId: agencyObjId,
        hostname: 'homes.apex.com',
        isPrimary: false,
        isActive: true,
      }),
    );

    mockAgencyDomainFindByIdAndUpdate.mockReturnValue(
      makeLeanChain({
        _id: targetObjId,
        agencyId: agencyObjId,
        hostname: 'homes.apex.com',
        isPrimary: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    const updated = await setPrimaryDomain(domainId2);

    expect(mockAgencyDomainUpdateMany).toHaveBeenCalledWith(
      {
        agencyId: agencyObjId,
        isPrimary: true,
        _id: { $ne: targetObjId },
      },
      { $set: { isPrimary: false } },
    );
    expect(updated.isPrimary).toBe(true);
    expect(updated.hostname).toBe('homes.apex.com');
  });

  it('resolves active tenant by hostname, caches result, and invalidates cache on deactivation/deletion', async () => {
    const agencyObjId = new mongoose.Types.ObjectId(agencyId1);
    const domainObjId = new mongoose.Types.ObjectId(domainId1);

    mockAgencyDomainFindOne.mockReturnValue(
      makeLeanChain({
        _id: domainObjId,
        agencyId: agencyObjId,
        hostname: 'portal.apex.com',
        isPrimary: true,
        isActive: true,
      }),
    );
    mockUserFindOne.mockReturnValue(
      makeLeanChain({
        _id: agencyObjId,
        name: 'Apex Owner',
        agencyName: 'Apex Realty',
        agencySlug: 'apex',
      }),
    );

    const resolved1 = await resolveTenantByHostname('https://Portal.Apex.com:443');
    expect(resolved1).toMatchObject({
      adminId: agencyId1,
      agencyName: 'Apex Realty',
      agencySlug: 'apex',
      hostname: 'portal.apex.com',
      isPrimary: true,
    });
    expect(mockAgencyDomainFindOne).toHaveBeenCalledTimes(1);

    // Second call hits in-memory cache without querying DB
    const resolved2 = await resolveTenantByHostname('portal.apex.com');
    expect(resolved2).toEqual(resolved1);
    expect(mockAgencyDomainFindOne).toHaveBeenCalledTimes(1);

    // Deactivate domain -> must invalidate cache
    mockAgencyDomainFindById.mockResolvedValue({
      _id: domainObjId,
      agencyId: agencyObjId,
      hostname: 'portal.apex.com',
      isPrimary: true,
      isActive: true,
    });
    mockAgencyDomainFindByIdAndUpdate.mockReturnValue(
      makeLeanChain({
        _id: domainObjId,
        agencyId: agencyObjId,
        hostname: 'portal.apex.com',
        isPrimary: true,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    const deactivated = await updateDomain(domainId1, { isActive: false });
    expect(deactivated.isActive).toBe(false);

    // Next resolution re-queries DB and returns null because domain is inactive
    mockAgencyDomainFindOne.mockReturnValue(makeLeanChain(null));
    const afterDeactivation = await resolveTenantByHostname('portal.apex.com');
    expect(afterDeactivation).toBeNull();
    expect(mockAgencyDomainFindOne).toHaveBeenCalledTimes(2);

    // Delete domain also invalidates cache
    mockAgencyDomainFindByIdAndDelete.mockReturnValue(
      makeLeanChain({
        _id: domainObjId,
        agencyId: agencyObjId,
        hostname: 'portal.apex.com',
        isPrimary: true,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    const deleted = await deleteDomain(domainId1);
    expect(deleted.hostname).toBe('portal.apex.com');
  });

  it('returns null for unknown hostnames', async () => {
    mockAgencyDomainFindOne.mockReturnValue(makeLeanChain(null));
    const result = await resolveTenantByHostname('unknown.example.com');
    expect(result).toBeNull();
  });
});

describe('Unit: getPublicPropertyBySlug Cross-Agency Scoping', () => {
  const agencyA = new mongoose.Types.ObjectId().toString();
  const agencyB = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('scopes Property.findOne query strictly to adminId when provided', async () => {
    mockPropertyFindOne.mockReturnValue(
      makeLeanChain({
        _id: new mongoose.Types.ObjectId(),
        propertyId: 'PROP-101',
        title: 'Luxury Villa',
        adminId: {
          _id: new mongoose.Types.ObjectId(agencyA),
          name: 'Agency A',
          agencySlug: 'agency-a',
          agencyName: 'Agency A',
        },
        ownerDetails: { name: 'Secret Owner', phone: '9999999999' },
        publishing: { publishOnWebsite: true, seo: { slug: 'luxury-villa' } },
        status: 'Available',
      }),
    );

    const prop = await getPublicPropertyBySlug('luxury-villa', agencyA);
    expect(prop).not.toBeNull();
    expect(prop?.title).toBe('Luxury Villa');
    expect((prop as any)?.ownerDetails).toBeUndefined();

    const queryArg = mockPropertyFindOne.mock.calls[0][0];
    expect(queryArg.adminId).toEqual(new mongoose.Types.ObjectId(agencyA));
  });

  it('returns null when querying a property owned by another agency', async () => {
    mockPropertyFindOne.mockReturnValue(makeLeanChain(null));

    const prop = await getPublicPropertyBySlug('agency-a-villa', agencyB);
    expect(prop).toBeNull();

    const queryArg = mockPropertyFindOne.mock.calls[0][0];
    expect(queryArg.adminId).toEqual(new mongoose.Types.ObjectId(agencyB));
  });

  it('returns null without querying DB when adminId is not a valid ObjectId', async () => {
    const prop = await getPublicPropertyBySlug('luxury-villa', 'not-an-object-id');
    expect(prop).toBeNull();
    expect(mockPropertyFindOne).not.toHaveBeenCalled();
  });
});
