import { NextRequest } from "next/server";
import mongoose, { Types } from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { GET as getOwners, POST as postOwner } from "../src/app/api/owners/route";
import { GET as getOwnerById, DELETE as deleteOwnerById } from "../src/app/api/owners/[id]/route";
import { GET as getRequirements, POST as postRequirement } from "../src/app/api/clients/[id]/requirements/route";
import { getSsrOwners, getOwner360View } from "../src/services/ownerService";
import { Owner } from "../src/models/Owner";
import { Client } from "../src/models/Client";
import { Property } from "../src/models/Property";
import { User } from "../src/models/User";
import { Role } from "../src/models/Role";
import { signAuthToken } from "../src/lib/auth/jwt";

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "";

interface Point3TestResult {
  id: string;
  name: string;
  status: "PASS" | "FAIL";
  details: string;
}

const results: Point3TestResult[] = [];

function recordTest(id: string, name: string, status: "PASS" | "FAIL", details: string) {
  results.push({ id, name, status, details });
  console.log(`[${status}] ${id}: ${name} - ${details}`);
}

async function runPoint3Tests() {
  console.log("--------------------------------------------------");
  console.log("STARTING POINT 3: CLIENTS & OWNERS TEST SUITE (WITH SSR)");
  console.log("--------------------------------------------------");

  if (!MONGODB_URI) throw new Error("MONGODB_URI missing");
  await mongoose.connect(MONGODB_URI);

  let adminAUser: any = null;
  let adminBUser: any = null;
  let testClient: any = null;
  let createdOwnerAId: string = "";
  let linkedPropertyId: string = "";

  try {
    const adminRole = await Role.findOne({ slug: "admin" });
    const timestamp = Date.now();

    adminAUser = await User.create({
      name: "Admin Org A Test",
      email: `adminA_${timestamp}@test.com`,
      mobile: `91${timestamp.toString().slice(-8)}`,
      joiningDate: new Date(),
      passwordHash: "hash123",
      roleId: adminRole?._id,
      role: adminRole,
      status: "active",
    });

    adminBUser = await User.create({
      name: "Admin Org B Test",
      email: `adminB_${timestamp}@test.com`,
      mobile: `92${timestamp.toString().slice(-8)}`,
      joiningDate: new Date(),
      passwordHash: "hash123",
      roleId: adminRole?._id,
      role: adminRole,
      status: "active",
    });

    const adminAToken = await signAuthToken({
      userId: adminAUser._id.toString(),
      email: adminAUser.email,
      name: adminAUser.name,
      roleSlug: "admin",
      roleId: adminAUser.roleId.toString(),
      department: "Management",
      branch: "HQ",
    });

    const adminBToken = await signAuthToken({
      userId: adminBUser._id.toString(),
      email: adminBUser.email,
      name: adminBUser.name,
      roleSlug: "admin",
      roleId: adminBUser.roleId.toString(),
      department: "Management",
      branch: "HQ",
    });

    testClient = await Client.create({
      adminId: adminAUser._id,
      clientName: "Rahul Sharma (Buyer)",
      phone: `93${timestamp.toString().slice(-8)}`,
      email: `buyer_${timestamp}@test.com`,
      createdById: adminAUser._id,
    });

    // -------------------------------------------------------------------------
    // TEST 1: POST /api/owners - Register Owner & Auto-increment ID
    // -------------------------------------------------------------------------
    try {
      const req = new NextRequest("http://localhost:3000/api/owners", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminAToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "Suresh Narang",
          mobile: "+919876543210",
          email: "suresh.narang@example.com",
          ownershipType: "Individual",
          preferredContactMethod: "WhatsApp",
          panGstNumber: "ABCDE1234F",
          address: "402 Palm Grove, Bengaluru",
        }),
      });

      const res = await postOwner(req);
      const json = await res.json();

      if (res.status !== 201 || !json.data?._id || !json.data?.ownerId) {
        throw new Error(`Expected 201 Created with ownerId, got ${res.status}: ${JSON.stringify(json)}`);
      }
      createdOwnerAId = json.data._id;

      recordTest(
        "TC-P3-01",
        "POST /api/owners Register Owner & ID Generation",
        "PASS",
        `Created owner with auto-generated ID [${json.data.ownerId}], MongoDB ID: ${createdOwnerAId}`
      );
    } catch (err: any) {
      recordTest("TC-P3-01", "POST /api/owners Register Owner & ID Generation", "FAIL", err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 2: POST /api/owners - Duplicate Mobile Number Rejection
    // -------------------------------------------------------------------------
    try {
      const req = new NextRequest("http://localhost:3000/api/owners", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminAToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "Duplicate Suresh",
          mobile: "+919876543210", // Duplicate mobile
          ownershipType: "Individual",
        }),
      });

      const res = await postOwner(req);
      if (res.status !== 409) {
        throw new Error(`Expected 409 Conflict for duplicate mobile, got ${res.status}`);
      }

      recordTest(
        "TC-P3-02",
        "POST /api/owners Duplicate Mobile Prevention",
        "PASS",
        "Enforced duplicate mobile check within organization (409 Conflict)."
      );
    } catch (err: any) {
      recordTest("TC-P3-02", "POST /api/owners Duplicate Mobile Prevention", "FAIL", err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 3: SSR Data Loader getSsrOwners() Multi-Tenant Isolation
    // -------------------------------------------------------------------------
    try {
      const adminASsr = await getSsrOwners({
        userId: adminAUser._id.toString(),
        roleSlug: "admin",
      });

      const adminBSsr = await getSsrOwners({
        userId: adminBUser._id.toString(),
        roleSlug: "admin",
      });

      const adminAHasOwner = adminASsr.owners.some((o) => o._id === createdOwnerAId);
      const adminBHasOwner = adminBSsr.owners.some((o) => o._id === createdOwnerAId);

      if (!adminAHasOwner) throw new Error("Admin A SSR could not see newly registered owner.");
      if (adminBHasOwner) throw new Error("Admin B SSR leaked owner registered under Admin A!");

      recordTest(
        "TC-P3-03",
        "SSR getSsrOwners() Multi-Tenant Scoping",
        "PASS",
        `Admin A pre-rendered owner in SSR table; Admin B returned 0 matching owners (Isolated).`
      );
    } catch (err: any) {
      recordTest("TC-P3-03", "SSR getSsrOwners() Multi-Tenant Scoping", "FAIL", err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 4: Owner 360° Portfolio Aggregation (1-to-N Properties Linkage)
    // -------------------------------------------------------------------------
    try {
      // Create 2 properties linked to this owner
      const prop1 = await Property.create({
        adminId: adminAUser._id,
        propertyId: `PROP-P3-1-${Date.now()}`,
        title: "2BHK Luxury Apartment Resale",
        propertyCategory: "Residential",
        propertyType: "apartment",
        transactionType: "Sale",
        status: "Available",
        ownerId: new Types.ObjectId(createdOwnerAId),
        pricing: { price: 8500000, isNegotiable: false },
        areaDetails: { carpetArea: 1100, areaUnit: "Sq. Ft." },
        location: { address: "Indiranagar", city: "Bengaluru" },
        createdById: adminAUser._id,
      });

      const prop2 = await Property.create({
        adminId: adminAUser._id,
        propertyId: `PROP-P3-2-${Date.now()}`,
        title: "Commercial Retail Shop on Lease",
        propertyCategory: "Commercial",
        propertyType: "retail_shop",
        transactionType: "Lease",
        status: "Rented",
        ownerId: new Types.ObjectId(createdOwnerAId),
        pricing: { monthlyRent: 75000, isNegotiable: false },
        areaDetails: { carpetArea: 450, areaUnit: "Sq. Ft." },
        location: { address: "Brigade Road", city: "Bengaluru" },
        createdById: adminAUser._id,
      });

      linkedPropertyId = prop1._id.toString();

      // Query Owner 360 View via Service & API
      const view360 = await getOwner360View(createdOwnerAId, adminAUser._id.toString());
      if (!view360) throw new Error("360 view returned null for owner");

      if (view360.metrics.totalProperties !== 2) {
        throw new Error(`Expected 2 properties, got ${view360.metrics.totalProperties}`);
      }
      if (view360.metrics.availableCount !== 1 || view360.metrics.rentedLeasedCount !== 1) {
        throw new Error(`Expected 1 Available and 1 Rented, got ${JSON.stringify(view360.metrics)}`);
      }
      if (view360.metrics.totalPortfolioValue !== 8500000 || view360.metrics.totalMonthlyRentalIncome !== 75000) {
        throw new Error(`Financial aggregation incorrect: ${JSON.stringify(view360.metrics)}`);
      }

      recordTest(
        "TC-P3-04",
        "Owner 360° Portfolio Aggregated Metrics",
        "PASS",
        `Aggregated 2 properties (1 Available, 1 Leased), Valuation ₹85,00,000, Monthly Rent ₹75,000.`
      );
    } catch (err: any) {
      recordTest("TC-P3-04", "Owner 360° Portfolio Aggregated Metrics", "FAIL", err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 5: Owner Deletion Guard When Linked Properties Exist
    // -------------------------------------------------------------------------
    try {
      const req = new NextRequest(`http://localhost:3000/api/owners/${createdOwnerAId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${adminAToken}` },
      });
      const res = await deleteOwnerById(req, { params: Promise.resolve({ id: createdOwnerAId }) });

      if (res.status !== 400) {
        throw new Error(`Expected 400 Bad Request when owner has active properties, got ${res.status}`);
      }

      recordTest(
        "TC-P3-05",
        "DELETE /api/owners/[id] Active Property Deletion Guard",
        "PASS",
        "Blocked owner deletion because active properties are currently linked (400 Bad Request)."
      );
    } catch (err: any) {
      recordTest("TC-P3-05", "DELETE /api/owners/[id] Active Property Deletion Guard", "FAIL", err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 6: Client Requirement Creation & Matching Criteria
    // -------------------------------------------------------------------------
    try {
      const req = new NextRequest(`http://localhost:3000/api/clients/${testClient._id}/requirements`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminAToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          transactionType: "Buy",
          propertyCategories: ["Residential"],
          propertyTypes: ["apartment", "penthouse"],
          minBudget: 7000000,
          maxBudget: 9500000,
          preferredLocations: ["Indiranagar", "Koramangala"],
          minBedrooms: 2,
          furnishing: "Semi-Furnished",
        }),
      });

      const res = await postRequirement(req, { params: Promise.resolve({ id: testClient._id.toString() }) });
      const json = await res.json();

      if (res.status !== 201 || !json.data?._id) {
        throw new Error(`Expected 201 Created for requirement, got ${res.status}`);
      }

      recordTest(
        "TC-P3-06",
        "POST /api/clients/[id]/requirements Buyer Criteria Capture",
        "PASS",
        `Captured buyer criteria: Buy 2BHK Residential Apartment (Budget ₹70L - ₹95L) in Indiranagar.`
      );
    } catch (err: any) {
      recordTest("TC-P3-06", "POST /api/clients/[id]/requirements Buyer Criteria Capture", "FAIL", err.message);
    }
  } finally {
    // Cleanup test records
    await Property.deleteMany({ ownerId: new Types.ObjectId(createdOwnerAId) });
    if (createdOwnerAId) await Owner.findByIdAndDelete(createdOwnerAId);
    if (testClient?._id) await Client.findByIdAndDelete(testClient._id);
    if (adminAUser?._id) await User.findByIdAndDelete(adminAUser._id);
    if (adminBUser?._id) await User.findByIdAndDelete(adminBUser._id);

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB.");
  }

  console.log("\n==================================================");
  console.log("POINT 3 TEST SUITE SUMMARY");
  console.log("==================================================");
  const total = results.length;
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;

  console.log(`Total Point 3 Tests Run : ${total}`);
  console.log(`Tests Passed            : ${passed}`);
  console.log(`Tests Failed            : ${failed}`);

  if (failed > 0) {
    console.error("\nSome Point 3 tests failed!");
    process.exit(1);
  } else {
    console.log("\nALL POINT 3 TESTS PASSED SUCCESSFULLY! (100% SUCCESS)");
    process.exit(0);
  }
}

runPoint3Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

