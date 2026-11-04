import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { connectToDatabase } from "../src/lib/mongodb/db";
import { GET, POST } from "../src/app/api/masters/route";
import { PATCH, DELETE } from "../src/app/api/masters/[id]/route";
import { MasterOption } from "../src/models/MasterOption";
import { User } from "../src/models/User";
import { Role } from "../src/models/Role";
import { signAuthToken } from "../src/lib/auth/jwt";

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "";

interface ApiTestResult {
  id: string;
  name: string;
  status: "PASS" | "FAIL";
  details: string;
}

const results: ApiTestResult[] = [];

function recordTest(id: string, name: string, status: "PASS" | "FAIL", details: string) {
  results.push({ id, name, status, details });
  console.log(`[${status}] ${id}: ${name} - ${details}`);
}

async function runApiHttpTests() {
  console.log("--------------------------------------------------");
  console.log("STARTING POINT 2: MASTER SETTINGS HTTP API TEST SUITE");
  console.log("--------------------------------------------------");

  if (!MONGODB_URI) throw new Error("MONGODB_URI missing");
  await connectToDatabase();

  let superAdminUser: any = null;
  let adminAUser: any = null;
  let adminBUser: any = null;
  let salesExecUser: any = null;
  let createdOptionId: string = "";

  try {
    // 1. Fetch or create roles
    let superAdminRole = await Role.findOne({ slug: "super_admin" });
    let adminRole = await Role.findOne({ slug: "admin" });
    let salesExecRole = await Role.findOne({ slug: "sales_executive" });

    // 2. Provision temporary test users
    const timestamp = Date.now();
    superAdminUser = await User.create({
      name: "Super Admin Test",
      email: `super_${timestamp}@example.com`,
      mobile: `99${timestamp.toString().slice(-8)}`,
      joiningDate: new Date(),
      passwordHash: "hash123",
      roleId: superAdminRole?._id,
      role: superAdminRole,
      status: "active",
    });

    adminAUser = await User.create({
      name: "Admin A Test",
      email: `adminA_${timestamp}@example.com`,
      mobile: `98${timestamp.toString().slice(-8)}`,
      joiningDate: new Date(),
      passwordHash: "hash123",
      roleId: adminRole?._id,
      role: adminRole,
      status: "active",
    });

    adminBUser = await User.create({
      name: "Admin B Test",
      email: `adminB_${timestamp}@example.com`,
      mobile: `97${timestamp.toString().slice(-8)}`,
      joiningDate: new Date(),
      passwordHash: "hash123",
      roleId: adminRole?._id,
      role: adminRole,
      status: "active",
    });

    salesExecUser = await User.create({
      name: "Sales Exec Test",
      email: `sales_${timestamp}@example.com`,
      mobile: `96${timestamp.toString().slice(-8)}`,
      joiningDate: new Date(),
      passwordHash: "hash123",
      roleId: salesExecRole?._id,
      role: salesExecRole,
      parentAdminId: adminAUser._id,
      status: "active",
    });

    const superAdminToken = await signAuthToken({
      userId: superAdminUser._id.toString(),
      email: superAdminUser.email,
      name: superAdminUser.name,
      roleSlug: "super_admin",
      roleId: superAdminUser.roleId.toString(),
      department: "Management",
      branch: "HQ",
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
      branch: "Branch B",
    });

    const salesExecToken = await signAuthToken({
      userId: salesExecUser._id.toString(),
      email: salesExecUser.email,
      name: salesExecUser.name,
      roleSlug: "sales_executive",
      roleId: salesExecUser.roleId.toString(),
      department: "Sales",
      branch: "HQ",
    });

    // -------------------------------------------------------------------------
    // TEST 1: GET /api/masters - Public/Tenant Read with Global Defaults
    // -------------------------------------------------------------------------
    try {
      const req = new NextRequest("http://localhost:3000/api/masters?category=property_types", {
        headers: { authorization: `Bearer ${adminAToken}` },
      });
      const res = await GET(req);
      const json = await res.json();

      if (res.status !== 200 || !json.data || json.data.length === 0) {
        throw new Error(`Expected 200 with options, got status ${res.status}: ${JSON.stringify(json)}`);
      }

      recordTest(
        "TC-API-01",
        "GET /api/masters Global Defaults Retrieval",
        "PASS",
        `Retrieved ${json.data.length} global property types under Admin A session.`
      );
    } catch (err: any) {
      recordTest("TC-API-01", "GET /api/masters Global Defaults Retrieval", "FAIL", err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 2: POST /api/masters - Admin A Creates Custom Master Option
    // -------------------------------------------------------------------------
    try {
      const req = new NextRequest("http://localhost:3000/api/masters", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminAToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          category: "amenities",
          label: "EV Charging Stations",
          value: "ev_charging_station",
          displayOrder: 50,
        }),
      });
      const res = await POST(req);
      const json = await res.json();

      if (res.status !== 201 || !json.data?._id) {
        throw new Error(`Expected 201 Created, got ${res.status}: ${JSON.stringify(json)}`);
      }
      createdOptionId = json.data._id;

      recordTest(
        "TC-API-02",
        "POST /api/masters Admin Custom Entry",
        "PASS",
        `Admin A successfully created custom amenity [EV Charging Stations], ID: ${createdOptionId}`
      );
    } catch (err: any) {
      recordTest("TC-API-02", "POST /api/masters Admin Custom Entry", "FAIL", err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 3: Sub-Role Ceiling Block (Sales Executive cannot create masters)
    // -------------------------------------------------------------------------
    try {
      const req = new NextRequest("http://localhost:3000/api/masters", {
        method: "POST",
        headers: {
          authorization: `Bearer ${salesExecToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          category: "amenities",
          label: "Hacker Lounge",
          value: "hacker_lounge",
        }),
      });
      const res = await POST(req);
      const json = await res.json();

      if (res.status !== 403) {
        throw new Error(`Expected 403 Forbidden for sub-role, got ${res.status}: ${JSON.stringify(json)}`);
      }

      recordTest(
        "TC-API-03",
        "POST /api/masters Sub-Role Permission Ceiling Enforcement",
        "PASS",
        "Sales Executive blocked with 403 Forbidden as expected."
      );
    } catch (err: any) {
      recordTest("TC-API-03", "POST /api/masters Sub-Role Permission Ceiling Enforcement", "FAIL", err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 4: Cross-Tenant Isolation (Admin B cannot delete/edit Admin A's option)
    // -------------------------------------------------------------------------
    try {
      const req = new NextRequest(`http://localhost:3000/api/masters/${createdOptionId}`, {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${adminBToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ label: "Hacked Label" }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: createdOptionId }) });
      const json = await res.json();

      if (res.status !== 403) {
        throw new Error(`Expected 403 Forbidden for cross-tenant edit, got ${res.status}: ${JSON.stringify(json)}`);
      }

      recordTest(
        "TC-API-04",
        "PATCH /api/masters/[id] Cross-Tenant Isolation Guard",
        "PASS",
        "Admin B cannot modify Admin A's custom master (403 Forbidden)."
      );
    } catch (err: any) {
      recordTest("TC-API-04", "PATCH /api/masters/[id] Cross-Tenant Isolation Guard", "FAIL", err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 5: System Default Deletion Guard (Cannot delete global default)
    // -------------------------------------------------------------------------
    try {
      const globalOpt = await MasterOption.findOne({ adminId: null, value: "apartment" });
      if (!globalOpt) throw new Error("Global apartment option not found");

      const req = new NextRequest(`http://localhost:3000/api/masters/${globalOpt._id}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${adminAToken}` },
      });
      const res = await DELETE(req, { params: Promise.resolve({ id: globalOpt._id.toString() }) });
      const json = await res.json();

      if (res.status !== 403) {
        throw new Error(`Expected 403 Forbidden when deleting system default, got ${res.status}: ${JSON.stringify(json)}`);
      }

      recordTest(
        "TC-API-05",
        "DELETE /api/masters/[id] System Default Deletion Guard",
        "PASS",
        "Blocked attempt to delete global system default (403 Forbidden)."
      );
    } catch (err: any) {
      recordTest("TC-API-05", "DELETE /api/masters/[id] System Default Deletion Guard", "FAIL", err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 6: Successful Owner Delete of Custom Option
    // -------------------------------------------------------------------------
    try {
      const req = new NextRequest(`http://localhost:3000/api/masters/${createdOptionId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${adminAToken}` },
      });
      const res = await DELETE(req, { params: Promise.resolve({ id: createdOptionId }) });
      const json = await res.json();

      if (res.status !== 200 || !json.data?.success) {
        throw new Error(`Expected 200 OK for own custom master deletion, got ${res.status}: ${JSON.stringify(json)}`);
      }

      recordTest(
        "TC-API-06",
        "DELETE /api/masters/[id] Tenant Custom Master Clean Deletion",
        "PASS",
        "Admin A successfully deleted own custom amenity."
      );
    } catch (err: any) {
      recordTest("TC-API-06", "DELETE /api/masters/[id] Tenant Custom Master Clean Deletion", "FAIL", err.message);
    }
  } finally {
    // Cleanup temporary users
    if (superAdminUser?._id) await User.findByIdAndDelete(superAdminUser._id);
    if (adminAUser?._id) await User.findByIdAndDelete(adminAUser._id);
    if (adminBUser?._id) await User.findByIdAndDelete(adminBUser._id);
    if (salesExecUser?._id) await User.findByIdAndDelete(salesExecUser._id);

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB.");
  }

  console.log("\n==================================================");
  console.log("POINT 2 HTTP API TEST SUITE SUMMARY");
  console.log("==================================================");
  const total = results.length;
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;

  console.log(`Total HTTP API Tests Run : ${total}`);
  console.log(`Tests Passed             : ${passed}`);
  console.log(`Tests Failed             : ${failed}`);

  if (failed > 0) {
    console.error("\nSome Point 2 HTTP API tests failed!");
    process.exit(1);
  } else {
    console.log("\nALL POINT 2 HTTP API TESTS PASSED SUCCESSFULLY! (100% SUCCESS)");
    process.exit(0);
  }
}

runApiHttpTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
