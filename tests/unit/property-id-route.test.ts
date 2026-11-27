import { beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { NextRequest } from "next/server";

const mockGetAuthenticatedContext = vi.fn();
const mockFindOneProperty = vi.fn();
const mockFindByIdAndUpdateProperty = vi.fn();
const mockFindByIdUser = vi.fn();
const mockShouldAutoUnpublish = vi.fn();
const mockRecordAuditEvent = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getAuthenticatedContext: (...args: any[]) =>
    mockGetAuthenticatedContext(...args),
}));

vi.mock("@/lib/mongodb/db", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/models/Property", () => ({
  Property: {
    findOne: (...args: any[]) => mockFindOneProperty(...args),
    findByIdAndUpdate: (...args: any[]) =>
      mockFindByIdAndUpdateProperty(...args),
    findByIdAndDelete: vi.fn(),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock("@/models/Owner", () => ({
  Owner: {
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock("@/models/Booking", () => ({
  Booking: {
    findOne: vi.fn().mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(null),
    }),
  },
}));

vi.mock("@/models/User", () => ({
  User: {
    findById: (...args: any[]) => mockFindByIdUser(...args),
  },
}));

vi.mock("@/services/auditService", () => ({
  recordAuditEvent: (...args: any[]) => mockRecordAuditEvent(...args),
}));

vi.mock("@/services/propertyService", () => ({
  shouldAutoUnpublishStatus: (...args: any[]) =>
    mockShouldAutoUnpublish(...args),
  calculateInvestmentRoi: vi.fn(() => ({
    expectedAnnualRent: 0,
    grossYieldPercent: 0,
  })),
}));

import { PATCH } from "@/app/api/properties/[id]/route";

describe("PATCH /api/properties/[id]", () => {
  const propertyId = "6b0976896e354d193d445762";
  const orgAdminId = "6b03cf40197a52ace01a3bde";
  const staffUserId = "6b0975c06e354d193d445577";

  beforeEach(() => {
    vi.clearAllMocks();
    mockShouldAutoUnpublish.mockResolvedValue(false);
    mockRecordAuditEvent.mockResolvedValue(undefined);
  });

  it("scopes sub-role updates by parentAdminId instead of staff user._id", async () => {
    mockGetAuthenticatedContext.mockResolvedValue({
      user: {
        _id: staffUserId,
        name: "Sales Staff",
        email: "staff@example.com",
        parentAdminId: orgAdminId,
      },
      role: { slug: "sales_executive" },
    });

    const existingDoc = {
      _id: new mongoose.Types.ObjectId(propertyId),
      adminId: new mongoose.Types.ObjectId(orgAdminId),
      title: "nagpur villa",
      status: "Available",
      pricing: { price: 8500000 },
      areaDetails: { carpetArea: 1800, areaUnit: "Sq. Ft." },
      location: { city: "Nagpur", address: "Civil Lines" },
      residentialSpecs: { bedrooms: 3, bathrooms: 3, furnishing: "Unfurnished" },
      media: { images: [] },
      publishing: { publishOnWebsite: false, featuredProperty: false },
    };

    mockFindOneProperty.mockResolvedValue(existingDoc);
    mockFindByIdAndUpdateProperty.mockResolvedValue({
      ...existingDoc,
      title: "nagpur villa updated",
    });

    const req = new NextRequest(
      `http://localhost:3000/api/properties/${propertyId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "nagpur villa updated" }),
      },
    );

    const res = await PATCH(req, {
      params: Promise.resolve({ id: propertyId }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockFindOneProperty).toHaveBeenCalledTimes(1);

    const queryArg = mockFindOneProperty.mock.calls[0][0];
    expect(String(queryArg._id)).toBe(propertyId);
    expect(String(queryArg.adminId)).toBe(orgAdminId);
  });

  it("falls back to User.parentAdminId from DB when absent on session user", async () => {
    mockGetAuthenticatedContext.mockResolvedValue({
      user: {
        _id: staffUserId,
        name: "Manager",
        email: "mgr@example.com",
      },
      role: { slug: "manager" },
    });

    mockFindByIdUser.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ parentAdminId: orgAdminId }),
      }),
    });

    mockFindOneProperty.mockResolvedValue(null);

    const req = new NextRequest(
      `http://localhost:3000/api/properties/${propertyId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Other Org" }),
      },
    );

    const res = await PATCH(req, {
      params: Promise.resolve({ id: propertyId }),
    });

    expect(res.status).toBe(404);
    const queryArg = mockFindOneProperty.mock.calls[0][0];
    expect(String(queryArg.adminId)).toBe(orgAdminId);
  });
});
